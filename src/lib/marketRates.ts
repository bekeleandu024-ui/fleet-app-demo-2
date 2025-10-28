import { MarketLane } from "@prisma/client";

import prisma from "./prisma";

export async function fetchSpotRate(
  origin: string,
  destination: string,
): Promise<{ rpm: number; source: string }> {
  const rateFeedUrl = process.env.RATE_FEED_URL;
  if (!rateFeedUrl) {
    throw new Error("Rate feed URL is not configured");
  }

  const url = `${rateFeedUrl}?origin=${encodeURIComponent(origin)}&dest=${encodeURIComponent(destination)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.RATE_FEED_KEY ?? ""}`,
    },
  });

  if (!response.ok) {
    throw new Error("No rate available for that lane");
  }

  const payload = (await response.json().catch(() => null)) as
    | { rpm?: unknown; source?: unknown }
    | null;

  if (!payload || typeof payload.rpm !== "number" || Number.isNaN(payload.rpm)) {
    throw new Error("No rate available for that lane");
  }

  const source = typeof payload.source === "string" && payload.source.trim().length > 0 ? payload.source : "Unknown";

  return { rpm: payload.rpm, source };
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
  return prisma.marketLane.findMany({
    orderBy: { updatedAt: "desc" },
  });
}
