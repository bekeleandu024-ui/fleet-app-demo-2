import type { ReactNode } from "react";

import Link from "next/link";

import FleetMapPanel from "./FleetMapPanel";
import prisma from "@/lib/prisma";

interface TripWithRelations {
  id: string;
  driver: string;
  unit: string;
  status: string;
  marginPct: number | null;
  delayRiskPct: number | null;
  nextCommitmentAt: Date | null;
  originLat?: number | null;
  originLon?: number | null;
  destLat?: number | null;
  destLon?: number | null;
  order?: { origin: string | null; destination: string | null } | null;
  unitRef?: { lastKnownLat?: number | null; lastKnownLon?: number | null } | null;
  lastKnownLat?: number | null;
  lastKnownLon?: number | null;
}

interface UnitRow {
  id: string;
  code: string;
  status?: string | null;
  homeBase?: string | null;
  isOnHold: boolean;
  lastKnownLat?: number | null;
  lastKnownLon?: number | null;
  weeklyFixedCost?: number | null;
}

export default async function FleetPage() {
  const [trips, units] = await Promise.all([
    prisma.trip.findMany({
      where: { status: { not: "Delivered" } },
      include: {
        order: true,
        unitRef: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.unit.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const activeTrips = trips as unknown as TripWithRelations[];
  const activeUnits = units as unknown as UnitRow[];

  const atRiskTripsCount = activeTrips.filter((trip) => classifyRisk(trip.marginPct ?? 0, trip.delayRiskPct ?? 0) === "danger").length;
  const unitsOnHold = activeUnits.filter((unit) => unit.isOnHold).length;

  const tripsForMap = activeTrips.map((trip) => {
    const margin = Number(trip.marginPct ?? 0);
    const delayRisk = Number(trip.delayRiskPct ?? 0);
    const tripLastKnownLat = (trip.lastKnownLat ?? trip.unitRef?.lastKnownLat) ?? null;
    const tripLastKnownLon = (trip.lastKnownLon ?? trip.unitRef?.lastKnownLon) ?? null;

    return {
      id: trip.id,
      driver: trip.driver,
      unit: trip.unit,
      marginPct: margin,
      delayRiskPct: delayRisk,
      currentLat: tripLastKnownLat ?? trip.originLat ?? null,
      currentLon: tripLastKnownLon ?? trip.originLon ?? null,
      risk: classifyRisk(margin, delayRisk),
    };
  });

  const unitsForMap = activeUnits.map((unit) => ({
    code: unit.code,
    status: unit.status,
    lat: unit.lastKnownLat ?? null,
    lon: unit.lastKnownLon ?? null,
    risk: unit.isOnHold ? ("danger" as const) : unit.status === "Dispatched" ? ("warn" as const) : ("ok" as const),
  }));

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Fleet Control</h1>
        <p className="text-sm text-neutral-400">Live map of assets and commitments. Monitor risk and drill in instantly.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Active Trips" value={activeTrips.length} description="In motion / assigned" />
        <StatCard title="At-Risk Trips" value={atRiskTripsCount} description="Needs attention" />
        <StatCard title="Units On Hold" value={unitsOnHold} description="Maintenance / restricted" />
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-200">Fleet Map</div>
              <div className="text-[11px] uppercase tracking-wide text-neutral-500">Active units &amp; live trips</div>
            </div>
          </div>
          <div className="mt-4">
            <FleetMapPanel units={unitsForMap} trips={tripsForMap} />
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-neutral-200">Active Trips</div>
            <div className="text-[11px] text-neutral-500">{activeTrips.length} trips</div>
          </div>
          <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1 text-[12px] text-neutral-200">
            {activeTrips.length === 0 ? (
              <div className="text-[11px] text-neutral-500">No trips are in progress.</div>
            ) : (
              activeTrips.map((trip) => {
                const margin = Number(trip.marginPct ?? 0);
                const delayRisk = Number(trip.delayRiskPct ?? 0);
                const lane = `${trip.order?.origin ?? "TBD"} → ${trip.order?.destination ?? "TBD"}`;
                return (
                  <div key={trip.id} className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-3 shadow-inner shadow-black/30">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold text-neutral-100">{trip.driver || "Unassigned"}</div>
                        <div className="text-[11px] text-neutral-400">Unit {trip.unit || "—"}</div>
                      </div>
                      <Badge tone={classifyRisk(margin, delayRisk)}>
                        Margin {(margin * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2 text-[11px] text-neutral-400">
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-neutral-500">Lane</span>
                        <div className="text-[12px] text-neutral-200">{lane}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={delayRisk > 0.3 ? "danger" : delayRisk > 0.1 ? "warn" : "ok"}>
                          Delay risk {(delayRisk * 100).toFixed(0)}%
                        </Badge>
                        {trip.nextCommitmentAt ? (
                          <span className="rounded border border-neutral-700/60 bg-neutral-800/60 px-2 py-[2px] text-[10px] text-neutral-300">
                            Next {formatCommitment(new Date(trip.nextCommitmentAt))}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/drivers/logs/${trip.id}`}
                        className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200 transition hover:border-emerald-400/60 hover:text-emerald-100"
                      >
                        Open Log
                      </Link>
                      {trip.status === "Created" || trip.status === "Assigned" ? (
                        <Link
                          href={`/book?tripId=${trip.id}`}
                          className="inline-flex items-center gap-1 rounded border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-200 transition hover:border-sky-400/60 hover:text-sky-100"
                        >
                          Book Page
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-neutral-200">Units Overview</div>
          <div className="text-[11px] text-neutral-500">{activeUnits.length} active units</div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-[12px] text-neutral-200">
            <thead className="text-[10px] uppercase tracking-wide text-neutral-500">
              <tr className="border-b border-neutral-800/70">
                <th className="py-2 pr-4 font-normal">Unit</th>
                <th className="py-2 pr-4 font-normal">Status</th>
                <th className="py-2 pr-4 font-normal">Home Base</th>
                <th className="py-2 pr-4 font-normal">Last Known</th>
                <th className="py-2 pr-4 font-normal">Weekly Fixed Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900/60">
              {activeUnits.map((unit) => (
                <tr key={unit.id} className="hover:bg-neutral-900/60">
                  <td className="py-2 pr-4 font-medium text-neutral-100">{unit.code}</td>
                  <td className="py-2 pr-4">
                    {unit.isOnHold ? (
                      <span className="text-amber-300">On Hold</span>
                    ) : unit.status === "Dispatched" ? (
                      <span className="text-sky-300">Dispatched</span>
                    ) : (
                      <span className="text-emerald-300">Available</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-neutral-300">{unit.homeBase ?? "—"}</td>
                  <td className="py-2 pr-4 text-neutral-300">
                    {formatCoordinate(unit.lastKnownLat, unit.lastKnownLon)}
                  </td>
                  <td className="py-2 pr-4 text-neutral-300">
                    {unit.weeklyFixedCost ? `$${Number(unit.weeklyFixedCost).toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg shadow-black/40">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-neutral-100">{value}</div>
      <div className="text-[11px] text-neutral-500">{description}</div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "ok" | "warn" | "danger"; children: ReactNode }) {
  const toneClass =
    tone === "danger"
      ? "border-red-500/30 bg-red-500/10 text-red-400"
      : tone === "warn"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  return <span className={`inline-flex items-center gap-1 rounded border px-2 py-[2px] text-[10px] font-medium leading-none ${toneClass}`}>{children}</span>;
}

function classifyRisk(marginPct: number, delayRiskPct: number): "ok" | "warn" | "danger" {
  const margin = Number(marginPct ?? 0);
  const delay = Number(delayRiskPct ?? 0);
  if (delay > 0.3 || margin < 0.05) return "danger";
  if (delay > 0.1 || margin < 0.08) return "warn";
  return "ok";
}

function formatCommitment(date: Date) {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCoordinate(lat?: number | null, lon?: number | null) {
  if (typeof lat !== "number" || typeof lon !== "number") {
    return "—";
  }
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}
