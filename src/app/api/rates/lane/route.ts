import { NextResponse } from "next/server";

import { getLaneRate } from "@/src/server/integrations/marketRates";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);

  if (!payload || typeof payload.origin !== "string" || typeof payload.destination !== "string") {
    return NextResponse.json(
      { ok: false, error: "Origin and destination are required" },
      { status: 400 },
    );
  }

  const origin = payload.origin.trim();
  const destination = payload.destination.trim();

  if (!origin || !destination) {
    return NextResponse.json(
      { ok: false, error: "Origin and destination are required" },
      { status: 400 },
    );
  }

  try {
    const lane = await getLaneRate(origin, destination);

    return NextResponse.json({
      ok: true,
      lane: {
        rpm: lane.rpm,
        source: lane.source,
        lastUpdated: lane.lastUpdated.toISOString(),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "Unable to fetch lane rate" },
      { status: 500 },
    );
  }
}
