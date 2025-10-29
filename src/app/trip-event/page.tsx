import prisma from "@/lib/prisma";

import TripEventConsole from "./TripEventConsole";
import type { TripEventType } from "@/src/types/trip";

type TripEventPageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

function normalizeParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return typeof value === "string" ? value : null;
}

export default async function TripEventPage({ searchParams }: TripEventPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const selectedTripId = normalizeParam(params?.tripId);

  const trips = await prisma.trip.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      order: {
        select: {
          origin: true,
          destination: true,
        },
      },
    },
    take: 50,
  });

  const tripOptions = trips.map((trip) => ({
    id: trip.id,
    driver: trip.driver ?? null,
    unit: trip.unit ?? null,
    status: trip.status ?? null,
    origin: trip.order?.origin ?? null,
    destination: trip.order?.destination ?? null,
  }));

  const events = await prisma.tripEvent.findMany({
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
    take: 25,
  });

  const initialEvents = events.map((event) => ({
    id: event.id,
    tripId: event.tripId,
    eventType: event.eventType as TripEventType,
    at: event.at.toISOString(),
    stopLabel: event.stopLabel ?? null,
    notes: event.notes ?? null,
    lat: typeof event.lat === "number" ? event.lat : null,
    lon: typeof event.lon === "number" ? event.lon : null,
    trip: event.trip,
  }));

  const uniqueTrips = new Set(events.map((event) => event.tripId));
  const borderCrossings = events.filter((event) => event.eventType === "CROSSED_BORDER").length;
  const completedTrips = events.filter(
    (event) => event.eventType === "TRIP_FINISHED" || event.eventType === "LEFT_DELIVERY",
  ).length;

  const initialSummary = {
    uniqueTrips: uniqueTrips.size,
    borderCrossings,
    completedTrips,
  };

  return (
    <TripEventConsole
      initialTrips={tripOptions}
      initialEvents={initialEvents}
      initialSummary={initialSummary}
      initialSelectedTripId={selectedTripId}
    />
  );
}
