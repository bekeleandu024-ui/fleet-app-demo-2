import prisma from "@/lib/prisma";
import { fetchUnitLocations } from "@/src/server/integrations/telematics";
import { getLaneRate } from "@/src/server/integrations/marketRates";
import { getRouteEstimate } from "@/src/server/integrations/routing";
import { FleetMap, type FleetUnit, type FleetUnitStatus, type StatusTokenMap } from "./fleet-map";

type StatusVariant = FleetUnitStatus;

const STATUS_STYLES: StatusTokenMap = {
  onTrack: {
    label: "On track",
    marker: "bg-emerald-400 shadow-[0_0_20px_0_rgba(16,185,129,0.35)]",
    chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    legend: "bg-gradient-to-r from-emerald-400/70 via-emerald-400 to-emerald-300",
    mapFill: "rgba(52, 211, 153, 0.28)",
    mapStroke: "#34d399",
  },
  watch: {
    label: "Watch",
    marker: "bg-amber-300 shadow-[0_0_18px_0_rgba(253,230,138,0.45)]",
    chip: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    legend: "bg-gradient-to-r from-amber-300/80 via-amber-300 to-amber-200",
    mapFill: "rgba(250, 204, 21, 0.3)",
    mapStroke: "#facc15",
  },
  action: {
    label: "Action needed",
    marker: "bg-rose-400 shadow-[0_0_20px_0_rgba(251,113,133,0.45)]",
    chip: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    legend: "bg-gradient-to-r from-rose-400/80 via-rose-400 to-rose-300",
    mapFill: "rgba(248, 113, 113, 0.3)",
    mapStroke: "#f87171",
  },
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Live Fleet Map</h1>
        <p className="text-sm text-neutral-400">
          Connected to telematics, routing, and market feeds for real-time dispatch context.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-6 shadow-lg shadow-black/40">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-200">Fleet map</p>
              <p className="text-xs text-neutral-400">
                Hover units for live context. Coordinates align with the latest telematics ping.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300">
              <span className="rounded-lg border border-neutral-800 bg-black/40 px-3 py-1 font-semibold text-white">
                {summary.total} active units
              </span>
              {Object.entries(STATUS_STYLES).map(([key, value]) => (
                <span key={key} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${value.chip}`}>
                  <span className={`h-2 w-2 rounded-full ${value.marker}`} aria-hidden />
                  {value.label}: {summary[key as StatusVariant]}
                </span>
              ))}
            </div>
          </header>

          <div className="mt-6">
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
        </section>

        <aside className="space-y-6">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-6 shadow-lg shadow-black/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-200">Active roster</p>
                <p className="text-xs text-neutral-400">Dispatch visibility across every rolling unit.</p>
              </div>
              <span className="rounded-lg border border-neutral-800 bg-black/50 px-3 py-1 text-xs text-neutral-300">
                {summary.total} tracked
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {decoratedUnits.map((unit) => (
                <div key={unit.id} className="rounded-lg border border-neutral-800 bg-black/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-100">{unit.driverName}</p>
                      <p className="text-xs text-neutral-400">Unit {unit.code}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] ${STATUS_STYLES[unit.variant].chip}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[unit.variant].marker}`} aria-hidden />
                      {STATUS_STYLES[unit.variant].label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                    <span>Ping: {unit.locationLabel}</span>
                    <span className="h-1 w-1 rounded-full bg-neutral-700" aria-hidden />
                    <span>{formatRelativeTime(unit.lastSeen)}</span>
                  </div>
                  <div className="mt-2 text-[0.65rem] uppercase tracking-wide text-neutral-500">Status: {unit.status}</div>
                </div>
              ))}
              {decoratedUnits.length === 0 && (
                <div className="rounded-lg border border-dashed border-neutral-800 bg-black/30 p-6 text-center text-sm text-neutral-500">
                  No active units online.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-6">
            <p className="text-sm font-semibold text-neutral-200">Route / Market snapshot</p>
            <div className="mt-4 rounded-lg border border-neutral-800 bg-black/40 p-4 text-sm text-neutral-300">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Primary lane</p>
              <p className="mt-1 text-lg font-semibold text-white">Toronto, ON → Chicago, IL</p>
              <p className="mt-1 text-neutral-300">
                Est. {routeEstimate.miles.toFixed(0)} mi / {(routeEstimate.etaMinutes / 60).toFixed(1)} hr · Market RPM ~${laneRate.rpm.toFixed(2)}
              </p>
              <p className="mt-2 text-xs text-neutral-400">Traffic-adjusted drive time comes from routing API.</p>
              <p className="text-xs text-neutral-400">Market rate fetched live from external rate index.</p>
            </div>
            <div className="mt-4 rounded-lg border border-neutral-800 bg-black/40 p-4 text-xs text-neutral-400">
              <p>Estimated arrival buffer: {routeEstimate.trafficNote}</p>
              <p className="mt-1">Lane RPM source: {laneRate.source} ({laneRate.lastUpdated.toLocaleTimeString()})</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
