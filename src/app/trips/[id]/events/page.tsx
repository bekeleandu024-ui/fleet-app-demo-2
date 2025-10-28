import Link from "next/link";

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

function formatDate(date?: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRelative(date?: Date | null) {
  if (!date) return "—";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "moments ago";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export default async function TripEventsPage({ params }: { params: { id: string } }) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      driver: true,
      unit: true,
      status: true,
      order: {
        select: {
          customer: true,
          origin: true,
          destination: true,
        },
      },
      tripEvents: {
        orderBy: { at: "desc" },
        include: {
          stop: {
            select: {
              seq: true,
              stopType: true,
              name: true,
              city: true,
              state: true,
            },
          },
        },
      },
    },
  });

  if (!trip) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0f1729] p-6 text-sm text-white/70">
        Trip not found.
      </div>
    );
  }

  const events = trip.tripEvents;
  const lastEvent = events[0]?.at ?? null;
  const stopsTouched = new Set(
    events
      .map((event) => event.stopLabel ?? event.stop?.city ?? event.stop?.name ?? null)
      .filter((value): value is string => Boolean(value)),
  ).size;
  const borderCrossings = events.filter((event) => event.eventType === "CROSSED_BORDER").length;
  const pickupTouches = events.filter((event) => event.eventType === "ARRIVED_PICKUP").length;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-white/10 bg-[#0f1729] p-6 text-white shadow-[0_30px_120px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Trip event history</h1>
            <p className="text-sm text-white/60">
              Trip {trip.id} · {trip.order?.origin ?? "Origin TBD"} → {trip.order?.destination ?? "Destination TBD"}
            </p>
            <p className="text-xs text-white/40">
              Driver {trip.driver ?? "Unassigned"} · Unit {trip.unit ?? "—"} · Status {trip.status ?? "Unknown"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/trips/${trip.id}`}
              className="inline-flex items-center rounded-lg border border-white/20 px-4 py-2 text-xs font-medium text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Trip overview
            </Link>
            <Link
              href={`/trips/${trip.id}/track`}
              className="inline-flex items-center rounded-lg border border-emerald-400/60 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300 hover:text-emerald-100"
            >
              Track trip
            </Link>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <dt className="text-[11px] uppercase tracking-wide text-white/50">Total events logged</dt>
            <dd className="mt-2 text-2xl font-semibold text-white">{events.length}</dd>
            <p className="text-[11px] text-white/60">Including dispatcher updates and telematics.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <dt className="text-[11px] uppercase tracking-wide text-white/50">Stops touched</dt>
            <dd className="mt-2 text-2xl font-semibold text-white">{stopsTouched}</dd>
            <p className="text-[11px] text-white/60">Unique pickup or delivery locations referenced.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <dt className="text-[11px] uppercase tracking-wide text-white/50">Border crossings</dt>
            <dd className="mt-2 text-2xl font-semibold text-white">{borderCrossings}</dd>
            <p className="text-[11px] text-white/60">Helps pre-alert customs & security teams.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <dt className="text-[11px] uppercase tracking-wide text-white/50">Last update</dt>
            <dd className="mt-2 text-xl font-semibold text-white">{formatRelative(lastEvent)}</dd>
            <p className="text-[11px] text-white/60">{formatDate(lastEvent)}</p>
          </div>
        </dl>
      </section>

      <DashboardCard
        title="Event feed"
        description="Chronological log of telematics pings and dispatcher notes for this trip."
        headerRight={
          events.length > 0 ? (
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
              {pickupTouches} pickup arrivals
            </span>
          ) : null
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Stop</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.map((event) => {
                const eventType = event.eventType as TripEventType;
                const badgeTone = EVENT_BADGES[eventType] ?? "bg-white/5 text-white border-white/10";
                const badgeLabel = EVENT_LABELS[eventType] ?? event.eventType;
                const stop = event.stop;
                const stopSummary =
                  event.stopLabel ??
                  (stop
                    ? [stop.city ?? stop.name, stop.state].filter(Boolean).join(", ") ||
                      `${stop.stopType} ${stop.seq}`
                    : "—");

                return (
                  <tr key={event.id} className="transition hover:bg-white/5">
                    <td className="whitespace-nowrap px-4 py-3 text-white">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{formatDate(event.at)}</span>
                        <span className="text-xs text-white/60">{formatRelative(event.at)}</span>
                      </div>
                    </td>
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
                        <span className="text-sm font-medium">{stopSummary}</span>
                        {stop?.stopType ? (
                          <span className="text-xs text-white/60">{stop.stopType} #{stop.seq}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      <div className="space-y-1">
                        {typeof event.odometerMiles === "number" && (
                          <div className="text-xs text-white/50">Odometer {event.odometerMiles.toFixed(1)} mi</div>
                        )}
                        {typeof event.lat === "number" && typeof event.lon === "number" && (
                          <div className="text-xs text-white/50">
                            Coords {event.lat.toFixed(3)}, {event.lon.toFixed(3)}
                          </div>
                        )}
                        {!event.odometerMiles && !event.lat && !event.lon ? (
                          <div className="text-xs text-white/50">No additional notes.</div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-white/60">
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
