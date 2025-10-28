import { NextRequest, NextResponse } from "next/server";

import { calculateTripCost, saveTripToDB, type TripInput } from "@/src/lib/tripCost";

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as TripInput;

    const breakdown = await calculateTripCost(input);
    const tripRecord = await saveTripToDB(input, breakdown);

    return NextResponse.json(
      { success: true, data: { trip: tripRecord, breakdown } },
      { status: 200 },
    );
  } catch (error) {
    console.error("bookTrip error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
