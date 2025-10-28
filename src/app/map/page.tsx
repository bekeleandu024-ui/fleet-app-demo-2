import prisma from "@/lib/prisma";
import { fetchUnitLocations } from "@/src/server/integrations/telematics";
import { getLaneRate } from "@/src/server/integrations/marketRates";
import { getRouteEstimate } from "@/src/server/integrations/routing";

type StatusVariant = "onTrack" | "watch" | "action";

const STATUS_STYLES: Record<StatusVariant, { label: string; marker: string; chip: string; legend: string }> = {
  onTrack: {
    label: "On track",
    marker: "bg-emerald-400 shadow-[0_0_20px_0_rgba(16,185,129,0.35)]",
    chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    legend: "bg-gradient-to-r from-emerald-400/70 via-emerald-400 to-emerald-300",
  },
  watch: {
    label: "Watch",
    marker: "bg-amber-300 shadow-[0_0_18px_0_rgba(253,230,138,0.45)]",
    chip: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    legend: "bg-gradient-to-r from-amber-300/80 via-amber-300 to-amber-200",
  },
  action: {
    label: "Action needed",
    marker: "bg-rose-400 shadow-[0_0_20px_0_rgba(251,113,133,0.45)]",
    chip: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    legend: "bg-gradient-to-r from-rose-400/80 via-rose-400 to-rose-300",
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

  const latitudes = decoratedUnits.filter((unit) => unit.lat != null).map((unit) => unit.lat as number);
  const longitudes = decoratedUnits.filter((unit) => unit.lon != null).map((unit) => unit.lon as number);

  const defaultBounds = { minLat: 24, maxLat: 52, minLon: -125, maxLon: -67 };
  const minLat = latitudes.length ? Math.min(...latitudes) - 1 : defaultBounds.minLat;
  const maxLat = latitudes.length ? Math.max(...latitudes) + 1 : defaultBounds.maxLat;
  const minLon = longitudes.length ? Math.min(...longitudes) - 1 : defaultBounds.minLon;
  const maxLon = longitudes.length ? Math.max(...longitudes) + 1 : defaultBounds.maxLon;
  const latRange = Math.max(maxLat - minLat, 1);
  const lonRange = Math.max(maxLon - minLon, 1);

  const projectedUnits = decoratedUnits.map((unit) => {
    if (unit.lat == null || unit.lon == null) {
      return { ...unit, x: 50, y: 50 };
    }
    const rawX = ((unit.lon - minLon) / lonRange) * 100;
    const rawY = (1 - (unit.lat - minLat) / latRange) * 100;
    return {
      ...unit,
      x: clamp(rawX, 4, 96),
      y: clamp(rawY, 8, 92),
    };
  });

  const summary = projectedUnits.reduce(
    (acc, unit) => {
      acc.total += 1;
      acc[unit.variant] += 1;
      return acc;
    },
    { total: 0, onTrack: 0, watch: 0, action: 0 } as { total: number } & Record<StatusVariant, number>,
  );

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

          <div className="relative mt-6 h-[460px] overflow-hidden rounded-xl border border-neutral-800 bg-gradient-to-br from-slate-950 via-slate-900 to-black">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.08),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.07),transparent_60%),radial-gradient(circle_at_50%_80%,rgba(244,114,182,0.06),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[length:60px_60px]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 via-black/10 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

            <div className="absolute left-6 top-6 flex flex-wrap gap-3 text-xs">
              <div className="rounded-lg border border-neutral-800/80 bg-black/60 px-3 py-2 text-neutral-300">
                <p className="font-semibold text-white">Toronto ⇄ Chicago lane</p>
                <p className="text-[0.7rem] text-neutral-400">{routeEstimate.miles.toFixed(0)} mi · {(routeEstimate.etaMinutes / 60).toFixed(1)} hr drive</p>
                <p className="text-[0.65rem] text-neutral-500">RPM {laneRate.rpm.toFixed(2)} · Source {laneRate.source}</p>
              </div>
            </div>

            {projectedUnits.map((unit) => (
              <div
                key={unit.id}
                className="group absolute"
                style={{ left: `calc(${unit.x}% - 0.5rem)`, top: `calc(${unit.y}% - 0.5rem)` }}
              >
                <div className="relative flex flex-col items-center">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 ${STATUS_STYLES[unit.variant].marker}`}>
                    <span className="h-2 w-2 rounded-full bg-black/80" aria-hidden />
                  </span>
                  <div className="pointer-events-none absolute top-10 hidden w-48 -translate-x-1/2 rounded-lg border border-neutral-800 bg-black/80 p-3 text-xs text-neutral-200 shadow-xl shadow-black/60 group-hover:block">
                    <p className="font-semibold text-white">{unit.driverName}</p>
                    <p className="text-[0.65rem] uppercase tracking-wide text-neutral-400">Unit {unit.code}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.7rem] text-neutral-300">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${STATUS_STYLES[unit.variant].chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[unit.variant].marker}`} aria-hidden />
                        {STATUS_STYLES[unit.variant].label}
                      </span>
                      <span>{unit.locationLabel}</span>
                    </div>
                    <p className="mt-1 text-[0.65rem] text-neutral-500">Last ping {formatRelativeTime(unit.lastSeen)}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-neutral-800 bg-black/60 px-4 py-2 text-[0.7rem] text-neutral-300">
              {Object.entries(STATUS_STYLES).map(([key, value]) => (
                <span key={key} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${value.legend}`} aria-hidden />
                  {value.label}
                </span>
              ))}
            </div>
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
              {projectedUnits.map((unit) => (
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
              {projectedUnits.length === 0 && (
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
