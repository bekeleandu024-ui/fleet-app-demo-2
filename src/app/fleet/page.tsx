import type { ReactNode } from "react";

import Link from "next/link";

import type { FleetMapProps, UnitStatus } from "@/components/FleetMap";
import FleetMapClient from "./FleetMapClient";
import prisma from "@/lib/prisma";

import DashboardCard from "@/src/components/DashboardCard";

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

const pillBaseClass = "inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-medium text-white";

const toneDot: Record<"ok" | "warn" | "danger", string> = {
  ok: "bg-emerald-400",
  warn: "bg-yellow-300",
  danger: "bg-rose-400",
};

function Pill({ tone, children }: { tone: "ok" | "warn" | "danger"; children: ReactNode }) {
  return (
    <span className={pillBaseClass}>
      <span className={`h-1.5 w-1.5 rounded-full ${toneDot[tone]}`} aria-hidden />
      {children}
    </span>
  );
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

  const mapUnits: FleetMapProps["units"] = activeUnits
    .filter(
      (unit) => typeof unit.lastKnownLat === "number" && typeof unit.lastKnownLon === "number"
    )
    .map((unit) => ({
      unitId: unit.code,
      status: classifyUnitStatus(unit),
      lastKnownLat: unit.lastKnownLat as number,
      lastKnownLon: unit.lastKnownLon as number,
      homeBase: unit.homeBase ?? null,
      costPerWeek: typeof unit.weeklyFixedCost === "number" ? Number(unit.weeklyFixedCost) : null,
    }));

  const mapTrips: FleetMapProps["trips"] = activeTrips
    .filter(
      (trip) =>
        typeof trip.originLat === "number" &&
        typeof trip.originLon === "number" &&
        typeof trip.destLat === "number" &&
        typeof trip.destLon === "number"
    )
    .map((trip) => {
      const margin = Number(trip.marginPct ?? 0);
      const delayRisk = Number(trip.delayRiskPct ?? 0);
      const origin = trip.order?.origin ?? "Origin TBD";
      const destination = trip.order?.destination ?? "Destination TBD";
      const riskScore = Math.max(0, Math.min(1, delayRisk));

      return {
        tripId: trip.id,
        driver: trip.driver || "Unassigned",
        unitId: trip.unit,
        lane: `${origin} → ${destination}`,
        origin: { lat: trip.originLat as number, lon: trip.originLon as number },
        destination: { lat: trip.destLat as number, lon: trip.destLon as number },
        risk: riskScore,
        marginPct: margin,
      };
    });

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard
        title="Fleet Control"
        description="Live map of assets and commitments. Monitor risk and drill in instantly."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Active Trips" value={activeTrips.length} description="In motion / assigned" />
          <StatCard title="At-Risk Trips" value={atRiskTripsCount} description="Needs attention" />
          <StatCard title="Units On Hold" value={unitsOnHold} description="Maintenance / restricted" />
        </div>
      </DashboardCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <DashboardCard
          title="Fleet Map"
          description="Active units and live trips. Hover markers for margin + risk context."
        >
          <FleetMapClient units={mapUnits} trips={mapTrips} />
        </DashboardCard>

        <DashboardCard
          title="Active Trips"
          description="AI verdict combines margin health and delay projections."
          headerRight={<span className="text-[11px] text-white/60">{activeTrips.length} trips</span>}
        >
          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1 text-sm">
            {activeTrips.length === 0 ? (
              <div className="text-sm text-white/60">No trips are in progress.</div>
            ) : (
              activeTrips.map((trip) => {
                const margin = Number(trip.marginPct ?? 0);
                const delayRisk = Number(trip.delayRiskPct ?? 0);
                const lane = `${trip.order?.origin ?? "TBD"} → ${trip.order?.destination ?? "TBD"}`;
                const tone = classifyRisk(margin, delayRisk);
                return (
                  <div key={trip.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{trip.driver || "Unassigned"}</div>
                        <div className="text-xs text-white/60">Unit {trip.unit || "—"}</div>
                      </div>
                      <Pill tone={tone}>Margin {(margin * 100).toFixed(1)}%</Pill>
                    </div>
                    <div className="mt-3 space-y-2 text-xs text-white/70">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-white/50">Lane</div>
                        <div className="text-sm text-white">{lane}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={delayRisk > 0.3 ? "danger" : delayRisk > 0.1 ? "warn" : "ok"}>
                          Delay risk {(delayRisk * 100).toFixed(0)}%
                        </Pill>
                        {trip.nextCommitmentAt ? (
                          <span className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/80">
                            Next {formatCommitment(new Date(trip.nextCommitmentAt))}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/drivers/logs/${trip.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-200 transition hover:border-emerald-300/60 hover:text-emerald-100"
                      >
                        Open Log
                      </Link>
                      {trip.status === "Created" || trip.status === "Assigned" ? (
                        <Link
                          href={`/book?tripId=${trip.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-[11px] font-medium text-sky-200 transition hover:border-sky-300/60 hover:text-sky-100"
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
        </DashboardCard>
      </div>

      <DashboardCard
        title="Units Overview"
        description="Rostered tractors and straight trucks with last known telemetry."
        headerRight={<span className="text-[11px] text-white/60">{activeUnits.length} active units</span>}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="py-2 pr-4 font-medium">Unit</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Home Base</th>
                <th className="py-2 pr-4 font-medium">Last Known</th>
                <th className="py-2 pr-4 font-medium">Weekly Fixed Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeUnits.map((unit) => (
                <tr key={unit.id} className="transition hover:bg-white/5">
                  <td className="py-3 pr-4 font-medium text-white">{unit.code}</td>
                  <td className="py-3 pr-4">
                    <span className={pillBaseClass}>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          unit.isOnHold
                            ? toneDot.danger
                            : unit.status === "Dispatched"
                              ? toneDot.warn
                              : toneDot.ok
                        }`}
                        aria-hidden
                      />
                      {unit.isOnHold ? "On Hold" : unit.status === "Dispatched" ? "Dispatched" : "Available"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-white/70">{unit.homeBase ?? "—"}</td>
                  <td className="py-3 pr-4 text-white/70">{formatCoordinate(unit.lastKnownLat, unit.lastKnownLon)}</td>
                  <td className="py-3 pr-4 text-white/70">
                    {unit.weeklyFixedCost ? `$${Number(unit.weeklyFixedCost).toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
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
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="text-[11px] uppercase tracking-wide text-white/50">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="text-[11px] text-white/60">{description}</div>
    </div>
  );
}

function classifyUnitStatus(unit: UnitRow): UnitStatus {
  if (unit.isOnHold) {
    return "action";
  }

  const normalized = (unit.status ?? "").toLowerCase();

  if (
    normalized.includes("maintenance") ||
    normalized.includes("repair") ||
    normalized.includes("hold") ||
    normalized.includes("down")
  ) {
    return "action";
  }

  if (
    normalized.includes("dispatch") ||
    normalized.includes("route") ||
    normalized.includes("transit") ||
    normalized.includes("trip")
  ) {
    return "watch";
  }

  return "available";
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
