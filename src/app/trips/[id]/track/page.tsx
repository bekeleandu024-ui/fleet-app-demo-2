// Acceptance criteria:
// - Shows trip timeline, ETA, delay risk summary.
// - Action card allows drafting delay notification via server action.
// - Alerts from evaluateTripRisk are displayed with "why" context.
// - No Prisma.Decimal values are sent to the client directly.

import Link from "next/link";

import prisma from "@/lib/prisma";
import { evaluateTripRisk, draftDelayNotification } from "@/server/trip-risk";
import { DelayNotificationCard } from "./delay-notification-card";

function formatDate(date?: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const draftDelayAction = async (tripId: string) => {
  "use server";
  return draftDelayNotification(tripId);
};

export default async function TrackTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      order: true,
      events: { orderBy: { at: "asc" }, include: { stop: true } },
    },
  });

  if (!trip) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm text-zinc-400">Trip not found.</div>;
  }

  const risk = await evaluateTripRisk(trip.id);

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Trip tracking</h1>
            <p className="text-sm text-zinc-300">
              {trip.order?.customer ?? "Unassigned"} — {trip.order?.origin ?? trip.type ?? ""} → {trip.order?.destination ?? ""}
            </p>
          </div>
          <Link
            href={`/trips/${trip.id}/close`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500"
          >
            Close-out
          </Link>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          ETA {risk.eta ?? "TBD"} · Delay risk {(risk.delayRiskPct * 100).toFixed(0)}%
        </p>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60">
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-sm font-semibold text-white">Timeline</h2>
          <span className="text-xs uppercase tracking-wide text-zinc-500">{trip.events.length} events</span>
        </div>
        <div className="grid gap-0">
          {trip.events.map((event) => (
            <div key={event.id} className="border-t border-zinc-900 px-5 py-3 text-sm text-zinc-300">
              <p className="font-semibold text-white">{event.type}</p>
              <p className="text-xs text-zinc-400">{formatDate(event.at)}</p>
              {event.stop ? (
                <p className="text-xs text-zinc-500">
                  Stop {event.stop.seq} · {event.stop.city ?? event.stop.name ?? "Unknown"}
                </p>
              ) : null}
              {event.notes && <p className="mt-1 text-xs text-zinc-400">{event.notes}</p>}
            </div>
          ))}
          {trip.events.length === 0 && (
            <p className="px-5 py-6 text-sm text-zinc-400">No events recorded.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6 text-sm text-emerald-100">
        <h2 className="text-base font-semibold text-white">Risk summary</h2>
        <p className="mt-2 text-sm text-emerald-100">{risk.summary.textSummary}</p>
        <ul className="mt-3 list-disc pl-6 text-emerald-200">
          {risk.summary.why.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-emerald-200">
          {risk.summary.actions.map((action) => (
            <span key={action.label} className="rounded-full border border-emerald-400/40 px-3 py-1">
              {action.label}
            </span>
          ))}
        </div>
      </section>

      <DelayNotificationCard tripId={trip.id} draftAction={draftDelayAction} />
    </div>
  );
}
