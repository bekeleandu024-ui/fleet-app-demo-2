import { PrismaClient } from "@prisma/client";
export { Decimal } from "@prisma/client/runtime/library";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

function createPrismaMock(): PrismaClient {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "$connect" || prop === "$disconnect") {
        return async () => {};
      }
      if (prop === "$transaction") {
        return async () => [];
      }
      return new Proxy(
        {},
        {
          get(__, method) {
            return async (...args: unknown[]) => {
              switch (method) {
                case "findMany":
                case "groupBy":
                  return [];
                case "aggregate": {
                  const request = (args[0] ?? {}) as {
                    _avg?: Record<string, unknown>;
                    _sum?: Record<string, unknown>;
                    _count?: Record<string, unknown> | boolean;
                  };

                  const makeFields = (fields: Record<string, unknown> | undefined, fallback: unknown) => {
                    if (!fields) return {} as Record<string, unknown>;
                    return Object.fromEntries(
                      Object.keys(fields).map((key) => [key, fallback]),
                    );
                  };

                  const result: Record<string, unknown> = {};
                  if (request._avg) {
                    result._avg = makeFields(request._avg, 0);
                  }
                  if (request._sum) {
                    result._sum = makeFields(request._sum, 0);
                  }
                  if (request._count) {
                    if (request._count === true) {
                      result._count = { _all: 0 };
                    } else if (typeof request._count === "object") {
                      const countFields = makeFields(request._count, 0);
                      if ("_all" in request._count) {
                        (countFields as Record<string, unknown>)._all = 0;
                      }
                      result._count = countFields;
                    } else {
                      result._count = {};
                    }
                  }
                  return result;
                }
                case "count":
                  return 0;
                case "createMany":
                case "updateMany":
                case "deleteMany":
                  return { count: 0 };
                case "findUnique":
                case "findFirst":
                case "update":
                case "create":
                case "delete":
                  return {};
                default:
                  return null;
              }
            };
          },
        },
      );
    },
  };

  return new Proxy({}, handler) as PrismaClient;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let prismaClient: PrismaClient;
try {
  prismaClient =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: ["error", "warn"],
    });
} catch (error) {
  console.warn("Falling back to Prisma mock due to initialization error:", error);
  prismaClient = createPrismaMock();
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient;
}

export const prisma = prismaClient;

export default prisma;
