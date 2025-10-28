import type { ReactNode } from "react";

import TripActivityTimeline from "./TripActivityTimeline";
import TripMapAndStatus from "./TripMapAndStatus";
import type { TripStopOption } from "@/types/trip";
import LiveTripCostingCard from "./LiveTripCostingCard";
import prisma from "@/lib/prisma";
import { buildTripCostingSnapshot } from "@/lib/serializers";
import { formatDateTimeLabel } from "@/lib/formatters";
import { getTripOperationalStatus } from "@/server/tripStatus";

export default async function DriverLogPage({
  params,
}: {
  params: { tripId: string };
}) {
  const [trip, operationalStatus] = await Promise.all([
    prisma.trip.findUnique({
      where: { id: params.tripId },
      include: {
        order: true,
        unitRef: true,
        stops: { orderBy: { seq: "asc" } },
        events: {
          orderBy: { at: "desc" },
          include: { stop: true },
        },
      },
    }),
    getTripOperationalStatus(params.tripId),
  ]);

  if (!trip) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#040711] via-[#090d1c] to-[#02030a] text-white/80">
        <div className="text-center text-sm text-white/60">Trip not found.</div>
      </main>
    );
  }

  const tripSnapshot = buildTripCostingSnapshot(trip);

  const timelineEvents = trip.events.map((event) => ({
    id: event.id,
    type: event.type,
    at: event.at.toISOString(),
    notes: event.notes ?? null,
    stop: event.stop
      ? {
          id: event.stop.id,
          seq: event.stop.seq,
          stopType: event.stop.stopType,
          name: event.stop.name,
          city: event.stop.city,
          state: event.stop.state,
        }
      : null,
  }));

  const nextCommitmentLabel =
    operationalStatus?.nextCommitmentLabel ??
    (trip.nextCommitmentAt
      ? `Due ${formatDateTimeLabel(trip.nextCommitmentAt) ?? "soon"}`
      : "No upcoming stops");

  const statusCard = (
    <TripStatusCard
      driver={trip.driver}
      unit={trip.unit}
      statusLabel={trip.status || "Created"}
      nextCommitmentLabel={nextCommitmentLabel}
      delayBadge={
        operationalStatus?.delayRiskBadge ?? ({ text: "On track", tone: "green" } as const)
      }
      marginBadge={
        operationalStatus?.marginBadge ?? ({ text: "No margin data", tone: "yellow" } as const)
      }
      operationalAlerts={operationalStatus?.operationalAlerts ?? []}
    />
  );

  const logButtonStops: TripStopOption[] = trip.stops.map((stop) => ({
    id: stop.id,
    seq: stop.seq,
    stopType: stop.stopType,
    name: stop.name ?? null,
    city: stop.city ?? null,
    state: stop.state ?? null,
  }));

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#040711] via-[#090d1c] to-[#02030a] text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Driver Log / Trip Clock</h1>
          <p className="text-[13px] text-white/60">
            One-tap milestones. Every press is timestamped, location-tagged, and costed.
          </p>
        </header>

        <LiveTripCostingCard
          tripId={trip.id}
          initialTrip={tripSnapshot}
          stops={logButtonStops}
          lane={{ origin: trip.order?.origin ?? null, destination: trip.order?.destination ?? null }}
          tripNumber={trip.id.slice(0, 8).toUpperCase()}
          driver={trip.driver}
          unit={trip.unit}
          status={trip.status}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <TripMapAndStatus trip={trip} nextCommitmentLabel={nextCommitmentLabel} />
          {statusCard}
        </div>

        <TripActivityTimeline events={timelineEvents} />

        <p className="text-[11px] text-white/40">
          Logs are immutable and auditable. Update in real time to keep ops synchronized.
        </p>
      </div>
    </main>
  );
}

function TripStatusCard({
  driver,
  unit,
  statusLabel,
  nextCommitmentLabel,
  delayBadge,
  marginBadge,
  operationalAlerts,
}: {
  driver: string | null;
  unit: string | null;
  statusLabel: string;
  nextCommitmentLabel: string;
  delayBadge: { text: string; tone: "green" | "yellow" | "red" };
  marginBadge: { text: string; tone: "green" | "yellow" | "red" };
  operationalAlerts: string[];
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-6 text-white/85 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
      <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white">Trip Status</div>
      <div className="mt-4 space-y-4 text-[13px]">
        <StatusRow label="Driver / Unit" value={`${driver || "—"} / ${unit || "—"}`} />
        <StatusRow label="Trip State" value={statusLabel || "Created"} />
        <StatusRow label="Next Commitment" value={nextCommitmentLabel} />
        <StatusRow label="Delay Risk" value={<Badge tone={delayBadge.tone}>{delayBadge.text}</Badge>} />
        <StatusRow label="Margin Health" value={<Badge tone={marginBadge.tone}>{marginBadge.text}</Badge>} />
      </div>

      <div className="mt-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Operational Alerts</div>
        <ul className="mt-3 space-y-1 text-[12px] text-white/60">
          {operationalAlerts.length === 0 ? (
            <li className="text-white/40">No active alerts.</li>
          ) : (
            operationalAlerts.map((alert) => (
              <li key={alert} className="text-rose-300">• {alert}</li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}

function StatusRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">{label}</div>
      <div className="mt-1 text-[14px] text-white/90">{value}</div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "green" | "yellow" | "red"; children: ReactNode }) {
  const toneClass =
    tone === "green"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : tone === "yellow"
      ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
      : "border-rose-500/40 bg-rose-500/15 text-rose-200";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-[4px] text-[12px] font-semibold leading-none ${toneClass}`}
    >
      {children}
    </span>
  );
}
