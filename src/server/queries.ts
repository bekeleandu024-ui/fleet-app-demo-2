import prisma from "@/src/lib/prisma";

export async function fetchQualifiedOrders() {
  return prisma.order.findMany({
    where: { status: "Qualified" },
    orderBy: { createdAt: "asc" },
  });
}

export async function fetchActiveDrivers() {
  return prisma.driver.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
}

export async function fetchAvailableUnits() {
  return prisma.unit.findMany({
    where: { active: true, isOnHold: false },
    orderBy: { code: "asc" },
  });
}

export async function fetchRateTemplates() {
  return prisma.rate.findMany({
    orderBy: [{ zone: "asc" }, { type: "asc" }],
  });
}
