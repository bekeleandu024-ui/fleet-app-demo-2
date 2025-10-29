import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function buildWhere(params: URLSearchParams) {
  const tripId = params.get("tripId");
  const driver = params.get("driver");
  const unit = params.get("unit");
  const eventType = params.get("eventType");

  return {
    AND: [
      tripId ? { tripId } : {},
      eventType ? { eventType } : {},
      driver || unit
        ? {
            trip: {
              AND: [
                driver ? { driver: { contains: driver, mode: "insensitive" as const } } : {},
                unit ? { unit: { contains: unit, mode: "insensitive" as const } } : {},
              ],
            },
          }
        : {},
    ],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const where = buildWhere(searchParams);

  const events = await prisma.tripEvent.findMany({
    where,
    include: {
      trip: {
        select: {
          id: true,
          driver: true,
          unit: true,
          status: true,
          order: {
            select: {
              origin: true,
              destination: true,
            },
          },
        },
      },
    },
    orderBy: [{ at: "desc" }],
    take: 50,
  });

  const uniqueTrips = new Set(events.map((event) => event.tripId));
  const borderCrossings = events.filter((event) => event.eventType === "CROSSED_BORDER").length;
  const completedTrips = events.filter((event) => event.eventType === "TRIP_FINISHED" || event.eventType === "LEFT_DELIVERY").length;

  const response = {
    events: events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      at: event.at,
      stopLabel: event.stopLabel,
      notes: event.notes,
      lat: event.lat,
      lon: event.lon,
      tripId: event.tripId,
      trip: event.trip,
    })),
    summary: {
      uniqueTrips: uniqueTrips.size,
      borderCrossings,
      completedTrips,
    },
  };

  return NextResponse.json(response);
}
