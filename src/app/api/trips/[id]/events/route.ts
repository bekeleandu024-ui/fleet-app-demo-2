import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { applyTripEventCosting } from "@/lib/applyTripEventCosting";
import { refreshTripOperationalStatus } from "@/lib/refreshTripOperationalStatus";
import { buildTripCostingSnapshot, serializeTripEventForClient } from "@/lib/serializers";
import type { TripEventLogResponse, TripEventType } from "@/types/trip";

const ALLOWED_EVENT_TYPES: TripEventType[] = [
  "TRIP_START",
  "ARRIVED_PICKUP",
  "LEFT_PICKUP",
  "ARRIVED_DELIVERY",
  "LEFT_DELIVERY",
  "CROSSED_BORDER",
  "DROP_HOOK",
  "TRIP_FINISHED",
];

type EventRequestPayload = {
  eventType?: string;
  stopLabel?: string | null;
  stopId?: string | null;
  odometerMiles?: number | null;
  lat?: number | null;
  lon?: number | null;
  notes?: string | null;
};

function sanitizeCoordinate(value: unknown): number | null {
  if (typeof value !== "number") {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
}

function sanitizeOdometer(value: unknown): number | null {
  if (typeof value !== "number") {
    return null;
  }
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id?: string } | undefined> },
) {
  const params = context?.params ? await context.params : undefined;
  const tripId = params?.id;

  if (!tripId) {
    return NextResponse.json({ success: false, error: "Trip ID required" }, { status: 400 });
  }

  let payload: EventRequestPayload;
  try {
    payload = (await request.json()) as EventRequestPayload;
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = payload.eventType as TripEventType | undefined;
  if (!eventType || !ALLOWED_EVENT_TYPES.includes(eventType)) {
    return NextResponse.json({ success: false, error: "Unsupported event type" }, { status: 400 });
  }

  const stopId = payload.stopId ?? null;
  const stopLabel = typeof payload.stopLabel === "string" ? payload.stopLabel.trim() || null : null;
  const notes = typeof payload.notes === "string" ? payload.notes.trim() || null : null;
  const odometerMiles = sanitizeOdometer(payload.odometerMiles ?? null);
  const lat = sanitizeCoordinate(payload.lat ?? null);
  const lon = sanitizeCoordinate(payload.lon ?? null);
  const now = new Date();
  const at = new Date(Math.floor(now.getTime() / 1000) * 1000);

  try {
    const existingEvent = await prisma.tripEvent.findFirst({
      where: {
        tripId,
        eventType,
        at,
      },
    });

    if (existingEvent) {
      const serializedExisting = serializeTripEventForClient(existingEvent);
      const updatedTrip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
      const tripSnapshot = buildTripCostingSnapshot(updatedTrip);

      const responseBody: TripEventLogResponse = {
        success: true,
        trip: tripSnapshot,
        event: serializedExisting,
      };

      return NextResponse.json(responseBody);
    }

    const tripEvent = await prisma.tripEvent.create({
      data: {
        tripId,
        eventType,
        stopId,
        stopLabel,
        notes,
        odometerMiles,
        lat,
        lon,
        at,
      },
    });

    await prisma.event.create({
      data: {
        tripId,
        type: eventType,
        at,
        stopId,
        lat,
        lon,
        notes:
          typeof odometerMiles === "number"
            ? `Odometer: ${odometerMiles.toFixed(1)} mi`
            : notes ?? stopLabel,
      },
    });

    const updatedTrip = await applyTripEventCosting(tripId, eventType);

    await refreshTripOperationalStatus({ tripId, eventType, at });
    const tripSnapshot = buildTripCostingSnapshot(updatedTrip);
    const serializedEvent = serializeTripEventForClient(tripEvent);

    const responseBody: TripEventLogResponse = {
      success: true,
      trip: tripSnapshot,
      event: serializedEvent,
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Failed to log trip event", error);
    return NextResponse.json(
      { success: false, error: "Unable to log event" },
      { status: 500 },
    );
  }
}
