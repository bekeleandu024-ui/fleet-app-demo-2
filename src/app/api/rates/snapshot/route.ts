import { NextResponse } from "next/server";

import { getAllMarketLanes } from "@/lib/marketRates";

export async function GET() {
  const lanes = await getAllMarketLanes();

  return NextResponse.json(
    {
      success: true,
      lanes: lanes.map((lane) => ({
        origin: lane.origin,
        destination: lane.destination,
        rpm: lane.rpm,
        source: lane.source,
        updatedAt: lane.updatedAt.toISOString(),
      })),
    },
    { status: 200 },
  );
}
