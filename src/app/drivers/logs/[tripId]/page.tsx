import type { ReactNode } from "react";

import LogButtons from "./LogButtons";
import TripMiniMap from "./TripMiniMap";
import prisma from "@/lib/prisma";

export default async function DriverLogPage({
  params,
}: {
  params: { tripId: string };
}) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.tripId },
    include: {
      order: true,
      events: {
        orderBy: { at: "desc" },
      },
      unitRef: true,
    },
  });

  if (!trip) {
    return (
      <main className="min-h-screen bg-[#0a0f1c] text-neutral-200 flex items-center justify-center">
        <div className="text-center text-sm text-neutral-400">Trip not found.</div>
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
  const delayRiskPct = Number(trip.delayRiskPct ?? 0);
  const nextCommitmentAt = trip.nextCommitmentAt ? new Date(trip.nextCommitmentAt) : null;

  const hasTripStart = trip.events.some((ev) => ev.type === "TRIP_START");
  const operationalAlerts: { label: string; tone: "danger" | "warn" }[] = [];
  if (marginPct < 0.05) {
    operationalAlerts.push({ label: "Margin below 5%", tone: "danger" });
  }
  if (delayRiskPct > 0.3) {
    operationalAlerts.push({ label: "High delay probability", tone: "danger" });
  }
  if (trip.status !== "Delivered" && !hasTripStart) {
    operationalAlerts.push({ label: "Trip start not confirmed", tone: "warn" });
  }

  const originLat = trip.originLat ?? undefined;
  const originLon = trip.originLon ?? undefined;
  const destLat = trip.destLat ?? undefined;
  const destLon = trip.destLon ?? undefined;

  const tripLastKnown = (trip as unknown as {
    lastKnownLat?: number | null;
    lastKnownLon?: number | null;
  }) || { lastKnownLat: undefined, lastKnownLon: undefined };

  const currentLat =
    tripLastKnown?.lastKnownLat ??
    trip.unitRef?.lastKnownLat ??
    trip.originLat ??
    undefined;
  const currentLon =
    tripLastKnown?.lastKnownLon ??
    trip.unitRef?.lastKnownLon ??
    trip.originLon ??
    undefined;

  const originPoint =
    originLat !== undefined && originLon !== undefined
      ? { lat: originLat, lon: originLon, label: trip.order?.origin || "Origin" }
      : null;

  const destPoint =
    destLat !== undefined && destLon !== undefined
      ? { lat: destLat, lon: destLon, label: trip.order?.destination || "Destination" }
      : null;

  const currentPoint =
    currentLat !== undefined && currentLon !== undefined
      ? { lat: currentLat, lon: currentLon, label: trip.unit || "Current" }
      : null;

  const mapFallbackOrigin =
    originPoint ?? ({ lat: 43.6532, lon: -79.3832, label: trip.order?.origin || "Origin" } as const);
  const mapFallbackDest =
    destPoint ?? ({ lat: 41.8781, lon: -87.6298, label: trip.order?.destination || "Destination" } as const);
  const mapCurrent = currentPoint ?? (originPoint ?? null);

  return (
    <main className="min-h-screen bg-[#0a0f1c] text-neutral-100 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Driver Log / Trip Clock</h1>
          <p className="text-sm text-neutral-400">
            One-tap milestones. Every press is timestamped, cost is updated.
          </p>
        </header>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40 grid gap-4 md:grid-cols-2 text-[13px] leading-relaxed">
          <div>
            <div className="text-[11px] text-neutral-400 uppercase">Trip / Lane</div>
            <div className="text-neutral-100 font-semibold text-sm">
              {trip.order?.origin || "—"} → {trip.order?.destination || "—"}
            </div>
            <div className="text-neutral-400 text-[11px]">
              Trip #{trip.id.slice(0, 8).toUpperCase()}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-400 uppercase">Driver / Unit</div>
            <div className="text-neutral-100 font-medium text-sm">
              {trip.driver || "—"} &nbsp; / &nbsp; {trip.unit || "—"}
            </div>
            <div className="text-neutral-400 text-[11px]">Status: {trip.status || "Created"}</div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-400 uppercase">Miles / Revenue</div>
            <div className="text-neutral-100 font-medium text-sm">{miles} mi</div>
            <div className="text-neutral-400 text-[11px]">${revenue.toFixed(2)} total</div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-400 uppercase">Cost / Margin</div>
            <div className="text-neutral-100 font-medium text-sm">
              Total CPM {totalCPM.toFixed(2)}
            </div>
            <div
              className={`text-[11px] ${
                marginPct >= 0.12
                  ? "text-emerald-400"
                  : marginPct >= 0.08
                  ? "text-yellow-300"
                  : "text-red-400"
              }`}
            >
              Margin {(marginPct * 100).toFixed(1)}%
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-3 text-[11px] text-neutral-300">
            <Metric label="Fixed CPM" value={fixedCPM.toFixed(2)} prefix="$" />
            <Metric label="Wage CPM" value={wageCPM.toFixed(2)} prefix="$" />
            <Metric label="Rolling CPM" value={rollingCPM.toFixed(2)} prefix="$" />
            <Metric label="Add-ons CPM" value={addOnsCPM.toFixed(2)} prefix="$" />
            <Metric label="Total Cost" value={totalCost.toFixed(2)} prefix="$" />
            <Metric label="Profit" value={profit.toFixed(2)} prefix="$" />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="flex-1">
                <div className="text-sm font-semibold text-neutral-200">Trip Map &amp; Status</div>
                <div className="mt-3">
                  {originPoint || destPoint || currentPoint ? (
                    <TripMiniMap
                      origin={mapFallbackOrigin}
                      dest={mapFallbackDest}
                      current={mapCurrent ?? undefined}
                    />
                  ) : (
                    <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-neutral-800 text-[12px] text-neutral-500">
                      No live position yet.
                    </div>
                  )}
                </div>
              </div>
              <div className="flex w-full flex-col gap-3 lg:max-w-[220px]">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-neutral-500">ETA to delivery</div>
                  <div className="text-sm font-semibold text-neutral-100">
                    {nextCommitmentAt ? timeUntil(nextCommitmentAt) : "Awaiting schedule"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-neutral-500">Delay risk</div>
                  <div
                    className={`inline-flex items-center gap-1 rounded border px-2 py-[2px] text-[11px] font-medium leading-none ${
                      delayRiskPct > 0.3
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : delayRiskPct > 0.1
                        ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {(delayRiskPct * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-neutral-500">Next commitment</div>
                  <div className="text-sm text-neutral-200">
                    {nextCommitmentAt ? formatCommitment(nextCommitmentAt) : "No upcoming stops"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40 space-y-4">
            <div>
              <div className="text-sm font-semibold text-neutral-200">Trip Status</div>
              <div className="mt-4 space-y-3 text-[13px] text-neutral-200">
                <StatusRow label="Driver / Unit" value={`${trip.driver || "—"} / ${trip.unit || "—"}`} />
                <StatusRow
                  label="Next Commitment"
                  value={nextCommitmentAt ? formatCommitment(nextCommitmentAt) : "Awaiting dispatch"}
                />
                <StatusRow
                  label="Delay Risk"
                  value={
                    <Badge tone={delayRiskPct > 0.3 ? "danger" : delayRiskPct > 0.1 ? "warn" : "ok"}>
                      {delayRiskPct > 0.3
                        ? "High delay risk"
                        : delayRiskPct > 0.1
                        ? "Watch"
                        : "On track"}
                    </Badge>
                  }
                />
                <StatusRow
                  label="Margin Health"
                  value={
                    <Badge
                      tone={marginPct >= 0.12 ? "ok" : marginPct >= 0.05 ? "warn" : "danger"}
                    >
                      {marginPct >= 0.12
                        ? "Strong margin"
                        : marginPct >= 0.05
                        ? "Tight margin"
                        : "Low margin"}
                    </Badge>
                  }
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wide text-neutral-500">Operational Alerts</div>
              <ul className="mt-2 space-y-1 text-[12px]">
                {operationalAlerts.length === 0 ? (
                  <li className="text-neutral-500">No active alerts.</li>
                ) : (
                  operationalAlerts.map((alert, idx) => (
                    <li
                      key={`${alert.label}-${idx}`}
                      className={
                        alert.tone === "danger" ? "text-red-400" : "text-yellow-300"
                      }
                    >
                      • {alert.label}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40 space-y-4">
          <div className="text-sm font-semibold text-neutral-200">Log an Event</div>
          <div className="text-[12px] text-neutral-400">
            Tap a button when it happens. We'll timestamp it, update cost, and factor
            detention / accessorials automatically.
          </div>
          <LogButtons tripId={trip.id} />
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40">
          <div className="text-sm font-semibold text-neutral-200 mb-4">Recent Activity</div>
          <ul className="space-y-3 text-[12px] text-neutral-200">
            {trip.events.length === 0 && (
              <li className="text-neutral-500 text-[11px]">No events logged yet.</li>
            )}

            {trip.events.map((ev) => (
              <li
                key={ev.id}
                className={`grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-left ${
                  eventAccent(ev.type).background
                }`}
              >
                <div
                  className={`h-full w-1 rounded ${eventAccent(ev.type).bar}`}
                  aria-hidden
                />
                <div className="space-y-1">
                  <div className="text-[12px] font-semibold text-neutral-100">
                    {prettyEventType(ev.type)}
                  </div>
                  {(ev.location || ev.notes) && (
                    <div className="space-y-1 text-[11px] text-neutral-400">
                      {ev.location ? <div>Loc: {ev.location}</div> : null}
                      {ev.notes ? <div>Note: {ev.notes}</div> : null}
                    </div>
                  )}
                </div>
                <div className="text-right text-[11px] text-neutral-400">
                  <div className="font-mono">{formatTimestamp(ev.at)}</div>
                  <div>{relativeTime(new Date(ev.at))}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-[11px] text-neutral-500">
          Tap to log events in real time. Edits are timestamped and auditable.
        </p>
      </div>
    </main>
  );
}

function formatTimestamp(date: Date) {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

function formatCommitment(date: Date) {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return "moments ago";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m ago`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h ago`;
}

function eventAccent(type: string) {
  switch (type) {
    case "PICKUP_ARRIVE":
    case "PICKUP_DEPART":
      return {
        bar: "bg-sky-500",
        background: "bg-sky-500/5",
      };
    case "DELIVERY_ARRIVE":
    case "DELIVERY_DEPART":
      return {
        bar: "bg-fuchsia-500",
        background: "bg-fuchsia-500/5",
      };
    case "BORDER_CROSS":
      return {
        bar: "bg-red-500",
        background: "bg-red-500/5",
      };
    case "DROP_HOOK":
      return {
        bar: "bg-amber-400",
        background: "bg-amber-400/5",
      };
    case "TRIP_START":
      return {
        bar: "bg-emerald-500",
        background: "bg-emerald-500/5",
      };
    case "TRIP_END":
      return {
        bar: "bg-neutral-500",
        background: "bg-neutral-500/10",
      };
    default:
      return {
        bar: "bg-slate-500",
        background: "bg-slate-500/10",
      };
  }
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-sm text-neutral-100">{value}</div>
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "danger";
  children: ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-500/30 bg-red-500/10 text-red-400"
      : tone === "warn"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-[2px] text-[11px] font-medium leading-none ${toneClass}`}>
      {children}
    </span>
  );
}

function prettyEventType(type: string) {
  switch (type) {
    case "TRIP_START":
      return "Trip started";
    case "TRIP_END":
      return "Trip finished";
    case "PICKUP_ARRIVE":
      return "Arrived pickup";
    case "PICKUP_DEPART":
      return "Left pickup";
    case "DELIVERY_ARRIVE":
      return "Arrived delivery";
    case "DELIVERY_DEPART":
      return "Left delivery";
    case "BORDER_CROSS":
      return "Crossed border";
    case "DROP_HOOK":
      return "Drop & hook";
    default:
      return type;
  }
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
    <div className="rounded-lg border border-neutral-800/80 bg-neutral-900/70 px-3 py-2 shadow-inner shadow-black/40">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-[12px] font-semibold text-neutral-100">
        {prefix ? `${prefix}` : ""}
        {value}
        {suffix ? `${suffix}` : ""}
      </div>
    </div>
  );
}
