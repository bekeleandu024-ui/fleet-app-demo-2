import prisma from "@/lib/prisma";

import DashboardCard from "@/src/components/DashboardCard";
import type { TripEventType } from "@/src/types/trip";

const EVENT_LABELS: Record<TripEventType, string> = {
  TRIP_START: "Trip started",
  ARRIVED_PICKUP: "Arrived pickup",
  LEFT_PICKUP: "Left pickup",
  ARRIVED_DELIVERY: "Arrived delivery",
  LEFT_DELIVERY: "Left delivery",
  CROSSED_BORDER: "Crossed border",
  DROP_HOOK: "Drop & hook",
  TRIP_FINISHED: "Trip finished",
};

const EVENT_BADGES: Partial<Record<TripEventType, string>> = {
  TRIP_START: "bg-emerald-400/20 text-emerald-200 border-emerald-400/40",
  TRIP_FINISHED: "bg-sky-400/20 text-sky-200 border-sky-400/40",
  CROSSED_BORDER: "bg-amber-400/20 text-amber-200 border-amber-400/40",
  DROP_HOOK: "bg-purple-400/20 text-purple-200 border-purple-400/40",
};

function formatDate(date: Date) {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function TripEventPage() {
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

  const uniqueTrips = new Set(events.map((event) => event.tripId));
  const borderCrossings = events.filter((event) => event.eventType === "CROSSED_BORDER").length;
  const finishedTrips = events.filter((event) => event.eventType === "TRIP_FINISHED").length;

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard
        title="Trip Event Monitor"
        description="Newest operational pings across trips, with quick filter context."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-wide text-white/50">Unique trips touched</div>
            <div className="mt-2 text-2xl font-semibold text-white">{uniqueTrips.size}</div>
            <div className="text-[11px] text-white/60">Across last 25 logged events.</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-wide text-white/50">Border crossings</div>
            <div className="mt-2 text-2xl font-semibold text-white">{borderCrossings}</div>
            <div className="text-[11px] text-white/60">Trips needing customs coordination.</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-wide text-white/50">Trips completed</div>
            <div className="mt-2 text-2xl font-semibold text-white">{finishedTrips}</div>
            <div className="text-[11px] text-white/60">Marked finished within this feed.</div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        title="Recent trip events"
        description="Live feed of dispatcher touchpoints and telematics-triggered updates."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Trip</th>
                <th className="px-4 py-3 font-medium">Driver • Unit</th>
                <th className="px-4 py-3 font-medium">Location / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.map((event) => {
                const eventType = event.eventType as TripEventType;
                const badgeTone = EVENT_BADGES[eventType] ?? "bg-white/5 text-white border-white/10";
                const badgeLabel = EVENT_LABELS[eventType] ?? event.eventType;
                const trip = event.trip;
                const locationSummary =
                  event.stopLabel ||
                  [trip?.order?.origin, trip?.order?.destination].filter(Boolean).join(" → ") ||
                  "—";

                return (
                  <tr key={event.id} className="transition hover:bg-white/5">
                    <td className="whitespace-nowrap px-4 py-3 text-white">{formatDate(event.at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${badgeTone}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                        {badgeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{trip?.id ?? event.tripId}</span>
                        <span className="text-xs text-white/60">Status: {trip?.status ?? "Unknown"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      <div className="flex flex-col">
                        <span>{trip?.driver ?? "Unassigned"}</span>
                        <span className="text-xs text-white/60">{trip?.unit ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      <div className="space-y-1">
                        <div>{locationSummary}</div>
                        {typeof event.odometerMiles === "number" && (
                          <div className="text-xs text-white/50">
                            Odometer {event.odometerMiles.toFixed(1)} mi
                          </div>
                        )}
                        {typeof event.lat === "number" && typeof event.lon === "number" && (
                          <div className="text-xs text-white/50">
                            Coords {event.lat.toFixed(3)}, {event.lon.toFixed(3)}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-white/60">
                    No trip events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
