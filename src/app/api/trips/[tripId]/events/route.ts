import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

// Allowed event types for validation and business rules
const EVENT_TYPES = new Set([
  "TRIP_START",
  "ARRIVED_PICKUP",
  "LEFT_PICKUP",
  "ARRIVED_DELIVERY",
  "LEFT_DELIVERY",
  "CROSSED_BORDER",
  "DROP_HOOK",
  "TRIP_FINISHED",
]);

// Helper to coerce optional numeric inputs into numbers or null
function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number(value);

  if (Number.isNaN(numericValue) || !Number.isFinite(numericValue)) {
    return null;
  }

  return numericValue;
}

// Helper to convert numbers into Prisma Decimal instances
function toDecimal(value: number | null): Prisma.Decimal | null {
  if (value === null) {
    return null;
  }

  return new Prisma.Decimal(value);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { tripId?: string } },
) {
  try {
    // Extract the tripId from the route parameters
    const tripId = params?.tripId;
    if (!tripId) {
      return NextResponse.json(
        { success: false, error: "Trip id is required" },
        { status: 400 },
      );
    }

    // Parse the incoming JSON payload
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    // Validate the requested event type
    const { eventType, stopLabel, odometerMiles, lat, lon } = body as {
      eventType?: string;
      stopLabel?: unknown;
      odometerMiles?: unknown;
      lat?: unknown;
      lon?: unknown;
    };

    if (!eventType || !EVENT_TYPES.has(eventType)) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing event type" },
        { status: 400 },
      );
    }

    // Retrieve the existing trip so we can compute updated financials
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      return NextResponse.json(
        { success: false, error: "Trip not found" },
        { status: 400 },
      );
    }

    // Normalize optional number inputs and stop label
    const parsedOdometer = parseNullableNumber(odometerMiles);
    const parsedLat = parseNullableNumber(lat);
    const parsedLon = parseNullableNumber(lon);
    const normalizedStopLabel =
      typeof stopLabel === "string" && stopLabel.trim().length > 0
        ? stopLabel.trim()
        : null;

    // Determine the cost delta based on the event type
    let costDelta = 0;
    switch (eventType) {
      case "ARRIVED_PICKUP":
        costDelta = 30;
        break;
      case "ARRIVED_DELIVERY":
        costDelta = 30;
        break;
      case "CROSSED_BORDER":
        costDelta = 15;
        break;
      case "DROP_HOOK":
        costDelta = 15;
        break;
      default:
        costDelta = 0;
    }

    // Compute the new financial values for the trip
    const currentTotalCost = trip.totalCost ? Number(trip.totalCost) : 0;
    const expectedRevenue = trip.expectedRevenue ? Number(trip.expectedRevenue) : 0;
    const newTotalCost = currentTotalCost + costDelta;
    const profit = expectedRevenue - newTotalCost;
    const margin = expectedRevenue > 0 ? profit / expectedRevenue : 0;

    // Persist the new event and update the trip within a transaction
    const [event, updatedTrip] = await prisma.$transaction([
      prisma.tripEvent.create({
        data: {
          tripId,
          eventType,
          stopLabel: normalizedStopLabel,
          odometerMiles: parsedOdometer,
          lat: parsedLat,
          lon: parsedLon,
          at: new Date(),
        },
      }),
      prisma.trip.update({
        where: { id: tripId },
        data: {
          totalCost: toDecimal(newTotalCost),
          profit: toDecimal(profit),
          marginPct: toDecimal(margin),
        },
      }),
    ]);

    // Shape the trip response with native number values
    const safeTrip = {
      id: updatedTrip.id,
      expectedRevenue:
        updatedTrip.expectedRevenue == null
          ? null
          : Number(updatedTrip.expectedRevenue),
      totalCost:
        updatedTrip.totalCost == null ? null : Number(updatedTrip.totalCost),
      profit: updatedTrip.profit == null ? null : Number(updatedTrip.profit),
      margin:
        updatedTrip.marginPct == null ? null : Number(updatedTrip.marginPct),
      marginPct:
        updatedTrip.marginPct == null ? null : Number(updatedTrip.marginPct),
    };

    // Respond with the newly created event and updated trip
    return NextResponse.json({ success: true, event, trip: safeTrip });
  } catch (error) {
    console.error("Failed to log trip event", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
