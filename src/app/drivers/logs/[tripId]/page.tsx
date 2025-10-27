import type { ReactNode } from "react";

import LogButtons from "./LogButtons";
import TripActivityTimeline from "./TripActivityTimeline";
import TripMapAndStatus from "./TripMapAndStatus";
import type { EventDTO, StopDTO } from "./TripMapClient";
import prisma from "@/lib/prisma";
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
      <main className="flex min-h-screen items-center justify-center bg-[#0a0f1c] text-slate-200">
        <div className="text-center text-sm text-slate-400">Trip not found.</div>
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

  const mapStops: StopDTO[] = trip.stops.map((stop) => ({
    id: stop.id,
    seq: stop.seq,
    stopType: stop.stopType,
    name: stop.name ?? null,
    city: stop.city ?? null,
    state: stop.state ?? null,
    lat: stop.lat ?? null,
    lon: stop.lon ?? null,
  }));

  const mapEvents: EventDTO[] = trip.events.map((event) => ({
    id: event.id,
    type: event.type,
    at: event.at.toISOString(),
    stopId: event.stopId ?? null,
    lat: event.lat ?? null,
    lon: event.lon ?? null,
  }));

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

  const finalDeliveryStop = [...trip.stops]
    .filter((stop) => stop.stopType === "DELIVERY")
    .sort((a, b) => a.seq - b.seq)
    .at(-1);

  const etaLabel = finalDeliveryStop?.scheduledAt
    ? timeUntil(finalDeliveryStop.scheduledAt)
    : "Awaiting schedule";

  const delayRiskLabel = operationalStatus?.delayRiskBadge?.text ?? "On schedule";
  const nextCommitmentLabel = operationalStatus?.nextCommitmentLabel ?? "No upcoming stops";

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

  const logButtonStops = mapStops.map((stop) => ({
    id: stop.id,
    seq: stop.seq,
    stopType: stop.stopType,
    name: stop.name ?? null,
    city: stop.city ?? null,
    state: stop.state ?? null,
  }));

  return (
    <main className="min-h-screen bg-[#0a0f1c] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Driver Log / Trip Clock</h1>
          <p className="text-sm text-slate-400">
            One-tap milestones. Every press is timestamped, cost is updated.
          </p>
        </header>

        <section className="grid gap-4 rounded-xl border border-white/10 bg-slate-900/40 p-5 text-[13px] leading-relaxed shadow-lg shadow-black/40 md:grid-cols-2">
          <div>
            <div className="text-[11px] uppercase text-slate-400">Trip / Lane</div>
            <div className="text-sm font-semibold text-slate-100">
              {trip.order?.origin || "—"} → {trip.order?.destination || "—"}
            </div>
            <div className="text-[11px] text-slate-400">Trip #{trip.id.slice(0, 8).toUpperCase()}</div>
          </div>

          <div>
            <div className="text-[11px] uppercase text-slate-400">Driver / Unit</div>
            <div className="text-sm font-medium text-slate-100">
              {trip.driver || "—"} &nbsp;/&nbsp; {trip.unit || "—"}
            </div>
            <div className="text-[11px] text-slate-400">Status: {trip.status || "Created"}</div>
          </div>

          <div>
            <div className="text-[11px] uppercase text-slate-400">Miles / Revenue</div>
            <div className="text-sm font-medium text-slate-100">{miles} mi</div>
            <div className="text-[11px] text-slate-400">${revenue.toFixed(2)} total</div>
          </div>

          <div>
            <div className="text-[11px] uppercase text-slate-400">Cost / Margin</div>
            <div className="text-sm font-medium text-slate-100">Total CPM {totalCPM.toFixed(2)}</div>
            <div
              className={`text-[11px] ${
                marginPct >= 0.12
                  ? "text-emerald-400"
                  : marginPct >= 0.08
                  ? "text-amber-300"
                  : "text-rose-400"
              }`}
            >
              Margin {(marginPct * 100).toFixed(1)}%
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-300 md:col-span-2">
            <Metric label="Fixed CPM" value={fixedCPM.toFixed(2)} prefix="$" />
            <Metric label="Wage CPM" value={wageCPM.toFixed(2)} prefix="$" />
            <Metric label="Rolling CPM" value={rollingCPM.toFixed(2)} prefix="$" />
            <Metric label="Add-ons CPM" value={addOnsCPM.toFixed(2)} prefix="$" />
            <Metric label="Total Cost" value={totalCost.toFixed(2)} prefix="$" />
            <Metric label="Profit" value={profit.toFixed(2)} prefix="$" />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <TripMapAndStatus
            stops={mapStops}
            events={mapEvents}
            etaToFinalStopLabel={etaLabel}
            delayRiskPctLabel={delayRiskLabel}
            nextCommitmentText={nextCommitmentLabel}
          />
          {statusCard}
        </div>

        <section className="rounded-xl border border-white/10 bg-slate-900/40 p-5 shadow-lg shadow-black/40">
          <div className="text-sm font-semibold text-slate-200">Log an Event</div>
          <p className="mt-2 text-xs text-slate-400">
            Tap a button when it happens. We&apos;ll timestamp it, capture geolocation, and update costing.
          </p>
          <div className="mt-4">
            <LogButtons tripId={trip.id} stops={logButtonStops} />
          </div>
        </section>

        <TripActivityTimeline events={timelineEvents} />

        <p className="text-[11px] text-slate-500">
          Tap to log events in real time. Edits are timestamped and auditable.
        </p>
      </div>
    </main>
  );
}

function timeUntil(date: Date) {
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) {
    return "Due now";
  }
  const minutes = Math.floor(diffMs / 60000);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${Math.max(mins, 1)}m`;
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
    <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5 shadow-lg shadow-black/40">
      <div className="text-sm font-semibold text-slate-200">Trip Status</div>
      <div className="mt-4 space-y-3 text-xs text-slate-100">
        <StatusRow label="Driver / Unit" value={`${driver || "—"} / ${unit || "—"}`} />
        <StatusRow label="Trip State" value={statusLabel || "Created"} />
        <StatusRow label="Next Commitment" value={nextCommitmentLabel} />
        <StatusRow label="Delay Risk" value={<Badge tone={delayBadge.tone}>{delayBadge.text}</Badge>} />
        <StatusRow
          label="Margin Health"
          value={<Badge tone={marginBadge.tone}>{marginBadge.text}</Badge>}
        />
      </div>

      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-wide text-slate-400">Operational Alerts</div>
        <ul className="mt-2 space-y-1 text-[11px]">
          {operationalAlerts.length === 0 ? (
            <li className="text-slate-500">No active alerts.</li>
          ) : (
            operationalAlerts.map((alert) => (
              <li key={alert} className="text-rose-300">• {alert}</li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm text-slate-100">{value}</div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "green" | "yellow" | "red"; children: ReactNode }) {
  const toneClass =
    tone === "green"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : tone === "yellow"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
      : "border-rose-500/30 bg-rose-500/10 text-rose-300";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-[2px] text-[11px] font-medium leading-none ${toneClass}`}
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
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 shadow-inner shadow-black/40">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-[12px] font-semibold text-slate-100">
        {prefix ?? ""}
        {value}
        {suffix ?? ""}
      </div>
    </div>
  );
}
