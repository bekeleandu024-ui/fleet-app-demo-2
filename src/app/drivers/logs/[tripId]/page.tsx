import type { ReactNode } from "react";

import LogButtons from "./LogButtons";
import TripActivityTimeline from "./TripActivityTimeline";
import TripMapAndStatus from "./TripMapAndStatus";
import prisma from "@/lib/prisma";
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

  const miles = Number(trip.miles ?? 0);
  const revenue = Number(trip.revenue ?? 0);
  const wageCPM = Number(trip.wageCPM ?? 0);
  const fixedCPM = Number(trip.fixedCPM ?? 0);
  const rollingCPM = Number(trip.rollingCPM ?? 0);
  const addOnsCPM = Number(trip.addOnsCPM ?? 0);
  const totalCPM = Number(trip.totalCPM ?? 0);
  const totalCost = Number(trip.totalCost ?? 0);
  const profit = Number(trip.profit ?? 0);
  const marginPct = Number(trip.marginPct ?? 0);

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

  const logButtonStops = trip.stops.map((stop) => ({
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

        <section className="rounded-xl border border-white/10 bg-white/5 p-6 text-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Trip / Lane</div>
              <div className="text-[15px] font-semibold text-white/90">
                {trip.order?.origin || "—"} <span className="text-white/50">→</span> {trip.order?.destination || "—"}
              </div>
              <div className="text-[12px] text-white/50">Trip #{trip.id.slice(0, 8).toUpperCase()}</div>
            </div>
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Driver / Unit</div>
              <div className="text-[15px] font-medium text-white/90">
                {trip.driver || "—"} <span className="text-white/40">/</span> {trip.unit || "—"}
              </div>
              <div className="text-[12px] text-white/50">Status: {trip.status || "Created"}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Metric label="Miles" value={miles.toLocaleString()} suffix=" mi" />
            <Metric label="Revenue" value={revenue.toFixed(2)} prefix="$" />
            <Metric label="Total CPM" value={totalCPM.toFixed(2)} prefix="$" />
            <Metric label="Profit" value={profit.toFixed(2)} prefix="$" />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric label="Fixed CPM" value={fixedCPM.toFixed(2)} prefix="$" subtle />
            <Metric label="Wage CPM" value={wageCPM.toFixed(2)} prefix="$" subtle />
            <Metric label="Rolling CPM" value={rollingCPM.toFixed(2)} prefix="$" subtle />
            <Metric label="Add-ons CPM" value={addOnsCPM.toFixed(2)} prefix="$" subtle />
            <Metric label="Total Cost" value={totalCost.toFixed(2)} prefix="$" subtle />
            <Metric label="Margin" value={(marginPct * 100).toFixed(1)} suffix="%" tone={marginTone(marginPct)} subtle />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <TripMapAndStatus trip={trip} nextCommitmentLabel={nextCommitmentLabel} />
          {statusCard}
        </div>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6 text-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white">Log an Event</div>
          <p className="mt-2 text-[12px] text-white/60">
            Tap a button when it happens. We&apos;ll timestamp it, capture geolocation, and update costing.
          </p>
          <div className="mt-4">
            <LogButtons tripId={trip.id} stops={logButtonStops} />
          </div>
        </section>

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

function Metric({
  label,
  value,
  prefix,
  suffix,
  tone,
  subtle,
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  tone?: "positive" | "neutral" | "negative";
  subtle?: boolean;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
      ? "text-rose-300"
      : "text-white/85";

  return (
    <div
      className={`rounded-lg border border-white/10 ${
        subtle ? "bg-black/20" : "bg-black/30"
      } px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">{label}</div>
      <div className={`mt-1 text-[14px] font-semibold ${toneClass}`}>
        {prefix ?? ""}
        {value}
        {suffix ?? ""}
      </div>
    </div>
  );
}

function marginTone(marginPct: number): "positive" | "neutral" | "negative" {
  if (marginPct >= 0.12) {
    return "positive";
  }
  if (marginPct >= 0.08) {
    return "neutral";
  }
  return "negative";
}
