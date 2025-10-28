import prisma from "@/lib/prisma";
import { fetchUnitLocations } from "@/src/server/integrations/telematics";
import { getLaneRate } from "@/src/server/integrations/marketRates";
import { getRouteEstimate } from "@/src/server/integrations/routing";
import { FleetMap, type FleetUnit, type FleetUnitStatus, type StatusTokenMap } from "./fleet-map";

import DashboardCard from "@/src/components/DashboardCard";

const pillBaseClass = "inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-medium text-white";

type StatusVariant = FleetUnitStatus;

const STATUS_STYLES: StatusTokenMap = {
  onTrack: {
    label: "On track",
    marker: "bg-emerald-400 shadow-[0_0_20px_0_rgba(16,185,129,0.35)]",
    chip: pillBaseClass,
    legend: "bg-gradient-to-r from-emerald-400/70 via-emerald-400 to-emerald-300",
    mapFill: "rgba(52, 211, 153, 0.28)",
    mapStroke: "#34d399",
  },
  watch: {
    label: "Watch",
    marker: "bg-yellow-300 shadow-[0_0_18px_0_rgba(253,224,71,0.45)]",
    chip: pillBaseClass,
    legend: "bg-gradient-to-r from-amber-300/80 via-amber-300 to-amber-200",
    mapFill: "rgba(250, 204, 21, 0.3)",
    mapStroke: "#facc15",
  },
  action: {
    label: "Action needed",
    marker: "bg-rose-400 shadow-[0_0_20px_0_rgba(251,113,133,0.45)]",
    chip: pillBaseClass,
    legend: "bg-gradient-to-r from-rose-400/80 via-rose-400 to-rose-300",
    mapFill: "rgba(248, 113, 113, 0.3)",
    mapStroke: "#f87171",
  },
};

const statusDot: Record<StatusVariant, string> = {
  onTrack: "bg-emerald-400",
  watch: "bg-yellow-300",
  action: "bg-rose-400",
};

function formatRelativeTime(date: Date | null) {
  if (!date) return "Unknown ping";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function determineVariant(status: string | null | undefined): StatusVariant {
  if (!status) return "onTrack";
  const normalized = status.toLowerCase();
  if (/hold|issue|maintenance|problem|late|alert|critical|inactive|breakdown/.test(normalized)) {
    return "action";
  }
  if (/delay|pending|watch|idle|review|detention/.test(normalized)) {
    return "watch";
  }
  return "onTrack";
}

export default async function FleetMapPage() {
  const units = await prisma.unit.findMany({
    where: { active: true, isOnHold: false },
    orderBy: { code: "asc" },
  });
  const unitIds = units.map((unit) => unit.id);

  const [telemetry, routeEstimate, laneRate, recentTrips] = await Promise.all([
    fetchUnitLocations(),
    getRouteEstimate("Toronto, ON", "Chicago, IL"),
    getLaneRate("GTA", "CHI"),
    prisma.trip.findMany({
      where: {
        unitId: { in: unitIds },
        status: { in: ["Booked", "Dispatched", "InProgress"] },
      },
      orderBy: { createdAt: "desc" },
      include: { driverRef: true },
    }),
  ]);

  const latestTripByUnit = new Map<string, (typeof recentTrips)[number]>();
  for (const trip of recentTrips) {
    if (!trip.unitId) continue;
    if (!latestTripByUnit.has(trip.unitId)) {
      latestTripByUnit.set(trip.unitId, trip);
    }
  }

  const telemetryByCode = new Map(telemetry.map((item) => [item.unitCode.toUpperCase(), item]));

  const decoratedUnits = units.map((unit) => {
    const telemetryHit = telemetryByCode.get(unit.code.toUpperCase());
    const trip = unit.id ? latestTripByUnit.get(unit.id) : undefined;
    const driverName = telemetryHit?.driverName ?? trip?.driverRef?.name ?? trip?.driver ?? "Unassigned";
    const lat = telemetryHit?.lat ?? unit.lastKnownLat ?? null;
    const lon = telemetryHit?.lon ?? unit.lastKnownLon ?? null;
    const lastSeen = telemetryHit?.lastSeenAtISO ? new Date(telemetryHit.lastSeenAtISO) : unit.lastKnownAt ?? null;
    const status = telemetryHit?.status ?? unit.status ?? "Unknown";
    const variant = determineVariant(status);

    return {
      id: unit.id,
      code: unit.code,
      driverName,
      status,
      lat,
      lon,
      lastSeen,
      variant,
      locationLabel: lat != null && lon != null ? `${lat.toFixed(2)}, ${lon.toFixed(2)}` : "No ping",
    };
  });

  const summary = decoratedUnits.reduce(
    (acc, unit) => {
      acc.total += 1;
      acc[unit.variant] += 1;
      return acc;
    },
    { total: 0, onTrack: 0, watch: 0, action: 0 } as { total: number } & Record<StatusVariant, number>,
  );

  const mapUnits: FleetUnit[] = decoratedUnits
    .filter((unit) => unit.lat != null && unit.lon != null)
    .map((unit) => ({
      id: unit.id,
      code: unit.code,
      driverName: unit.driverName,
      status: unit.variant,
      statusDetail: unit.status,
      lat: unit.lat as number,
      lon: unit.lon as number,
      lastPingLabel: unit.lastSeen ? formatRelativeTime(unit.lastSeen) : undefined,
    }));

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard
        title="Live Fleet Map"
        description="Connected to telematics, routing, and market feeds for real-time dispatch context."
        headerRight={<span className="text-[11px] text-white/60">{summary.total} active units</span>}
      >
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
          {Object.entries(statusDot).map(([key, dot]) => (
            <span key={key} className={pillBaseClass}>
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
              {STATUS_STYLES[key as StatusVariant].label}: {summary[key as StatusVariant]}
            </span>
          ))}
        </div>
        <div className="mt-4">
          <FleetMap
            units={mapUnits}
            statusTokens={STATUS_STYLES}
            laneCallout={{
              title: "Toronto ⇄ Chicago lane",
              subtitle: `${routeEstimate.miles.toFixed(0)} mi · ${(routeEstimate.etaMinutes / 60).toFixed(1)} hr drive`,
              meta: `RPM ${laneRate.rpm.toFixed(2)} · Source ${laneRate.source}`,
            }}
          />
        </div>
      </DashboardCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardCard
          title="Active roster"
          description="Dispatch visibility across every rolling unit."
          headerRight={<span className="text-[11px] text-white/60">{summary.total} tracked</span>}
        >
          <div className="space-y-3">
            {decoratedUnits.map((unit) => (
              <div key={unit.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{unit.driverName}</p>
                    <p className="text-xs text-white/60">Unit {unit.code}</p>
                  </div>
                  <span className={pillBaseClass}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDot[unit.variant]}`} aria-hidden />
                    {STATUS_STYLES[unit.variant].label}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/70">
                  <span>Ping: {unit.locationLabel}</span>
                  <span className="h-1 w-1 rounded-full bg-white/20" aria-hidden />
                  <span>{formatRelativeTime(unit.lastSeen)}</span>
                </div>
                <div className="mt-2 text-[0.65rem] uppercase tracking-wide text-white/50">Status: {unit.status}</div>
              </div>
            ))}
            {decoratedUnits.length === 0 && (
              <div className="rounded-lg border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-white/60">
                No active units online.
              </div>
            )}
          </div>
        </DashboardCard>

        <DashboardCard title="Route / Market snapshot" description="Lane intel blended from routing and rate feeds.">
          <div className="space-y-4 text-sm text-white/80">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-white/50">Primary lane</p>
              <p className="mt-1 text-lg font-semibold text-white">Toronto, ON → Chicago, IL</p>
              <p className="mt-1 text-white/70">
                Est. {routeEstimate.miles.toFixed(0)} mi / {(routeEstimate.etaMinutes / 60).toFixed(1)} hr · Market RPM ~${laneRate.rpm.toFixed(2)}
              </p>
              <p className="mt-2 text-xs text-white/60">Traffic-adjusted drive time comes from routing API.</p>
              <p className="text-xs text-white/60">Market rate fetched live from external rate index.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-white/70">
              <p>Estimated arrival buffer: {routeEstimate.trafficNote}</p>
              <p className="mt-1">Lane RPM source: {laneRate.source} ({laneRate.lastUpdated.toLocaleTimeString()})</p>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
