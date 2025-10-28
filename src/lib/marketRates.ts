import { MarketLane } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { estimateLaneRpm, normalizeMarketCode } from "./marketRateModel";
import prisma from "./prisma";

export async function fetchSpotRate(
  origin: string,
  destination: string,
): Promise<{ rpm: number; source: string }> {
  const normalizedOrigin = normalizeMarketCode(origin);
  const normalizedDestination = normalizeMarketCode(destination);

  if (!normalizedOrigin || !normalizedDestination) {
    throw new Error("No rate available for that lane");
  }

  const { rpm, source } = estimateLaneRpm(normalizedOrigin, normalizedDestination);

  return { rpm, source };
}

export async function upsertMarketLane(
  origin: string,
  destination: string,
  rpm: number,
  source: string,
): Promise<MarketLane> {
  const existing = await prisma.marketLane.findFirst({
    where: {
      origin,
      destination,
    },
  });

  if (existing) {
    return prisma.marketLane.update({
      where: { id: existing.id },
      data: {
        rpm,
        source,
      },
    });
  }

  return prisma.marketLane.create({
    data: {
      origin,
      destination,
      rpm,
      source,
    },
  });
}

export async function getAllMarketLanes(): Promise<MarketLane[]> {
  try {
    return await prisma.marketLane.findMany({
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2021") {
      return [];
    }

    throw error;
  }
}
