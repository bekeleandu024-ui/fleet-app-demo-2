import prisma from "@/lib/prisma";
import { fetchUnitLocations } from "@/src/server/integrations/telematics";
import { getLaneRate } from "@/src/server/integrations/marketRates";
import { getRouteEstimate } from "@/src/server/integrations/routing";

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
    const lat = telemetryHit?.lat ?? (unit.lastKnownLat ?? null);
    const lon = telemetryHit?.lon ?? (unit.lastKnownLon ?? null);
    const lastSeen = telemetryHit?.lastSeenAtISO ? new Date(telemetryHit.lastSeenAtISO) : unit.lastKnownAt ?? null;
    const status = telemetryHit?.status ?? unit.status ?? "Unknown";

    return {
      id: unit.id,
      code: unit.code,
      driverName,
      status,
      lat,
      lon,
      lastSeen,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Live Fleet Map</h1>
        <p className="text-sm text-neutral-400">
          Connected to telematics, routing, and market feeds for real-time dispatch context.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40">
          <div className="text-sm font-semibold text-neutral-200">Active Units</div>
          <div className="mt-4 space-y-4">
            {decoratedUnits.map((unit) => {
              const locationLabel = unit.lat != null && unit.lon != null
                ? `${unit.lat.toFixed(2)}, ${unit.lon.toFixed(2)}`
                : "No ping";
              return (
                <div key={unit.id} className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-neutral-100">{unit.driverName}</div>
                      <div className="text-xs text-neutral-400">Unit {unit.code} · {unit.status}</div>
                    </div>
                    <span className="text-xs text-neutral-500">{formatRelativeTime(unit.lastSeen)}</span>
                  </div>
                  <div className="mt-2 text-xs text-neutral-500">
                    last seen near {locationLabel}
                  </div>
                </div>
              );
            })}
            {decoratedUnits.length === 0 && (
              <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-6 text-center text-sm text-neutral-500">
                No active units online.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40">
            <div className="text-sm font-semibold text-neutral-200">Route / Market Snapshot</div>
            <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500">Primary Lane</div>
              <div className="mt-1 text-lg font-semibold text-neutral-100">Toronto, ON → Chicago, IL</div>
              <p className="mt-1 text-sm text-neutral-300">
                Est. {routeEstimate.miles.toFixed(0)} mi / {(routeEstimate.etaMinutes / 60).toFixed(1)} hr · Market RPM ~${laneRate.rpm.toFixed(2)}
              </p>
              <p className="mt-2 text-xs text-neutral-400">Traffic-adjusted drive time comes from routing API.</p>
              <p className="text-xs text-neutral-400">Market rate fetched live from external rate index.</p>
            </div>
            <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500">Lane Intelligence</div>
              <ul className="mt-2 space-y-2 text-xs text-neutral-400">
                <li>Estimated arrival buffer: {routeEstimate.trafficNote}</li>
                <li>Lane RPM source: {laneRate.source} ({new Date(laneRate.observedAt).toLocaleTimeString()})</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
