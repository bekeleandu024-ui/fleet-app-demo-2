import { NextRequest, NextResponse } from "next/server";

import { fetchSpotRate, upsertMarketLane } from "@/lib/marketRates";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const origin = typeof body?.origin === "string" ? body.origin.trim() : "";
  const destination = typeof body?.destination === "string" ? body.destination.trim() : "";
  const saveToSnapshot = Boolean(body?.saveToSnapshot);

  if (!origin || !destination) {
    return NextResponse.json(
      { success: false, error: "Origin and destination are required." },
      { status: 400 },
    );
  }

  try {
    const { rpm, source } = await fetchSpotRate(origin, destination);

    if (saveToSnapshot) {
      try {
        await upsertMarketLane(origin, destination, rpm, source);
      } catch (error) {
        console.error("Failed to save market lane", error);
        return NextResponse.json(
          { success: false, error: "Unable to save lane to snapshot." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        lane: {
          origin,
          destination,
          rpm,
          source,
          updatedAt: new Date().toISOString(),
        },
        savedToSnapshot: saveToSnapshot,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch spot rate", error);
    return NextResponse.json(
      { success: false, error: `No rate available for ${origin} → ${destination}` },
      { status: 404 },
    );
  }
}
