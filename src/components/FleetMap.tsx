"use client";

import { useEffect, useMemo, useState } from "react";
import type { DivIcon } from "leaflet";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  ZoomControl,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: LatLngExpression = [43.5, -80.3];
const DEFAULT_ZOOM = 7;

export type UnitStatus = "available" | "watch" | "action";

export interface FleetMapUnit {
  unitId: string;
  status: UnitStatus;
  lastKnownLat: number;
  lastKnownLon: number;
  homeBase?: string | null;
  costPerWeek?: number | null;
}

export interface FleetMapTrip {
  tripId: string;
  driver: string;
  unitId: string;
  lane: string;
  origin: { lat: number; lon: number };
  destination: { lat: number; lon: number };
  risk: number;
  marginPct: number;
}

export interface FleetMapProps {
  units?: FleetMapUnit[];
  trips?: FleetMapTrip[];
}

const defaultUnits: FleetMapUnit[] = [
  {
    unitId: "734393",
    status: "available",
    lastKnownLat: 43.4,
    lastKnownLon: -80.34,
    homeBase: "CAMBRIDGE",
    costPerWeek: 696.75,
  },
  {
    unitId: "734401",
    status: "available",
    lastKnownLat: 43.54,
    lastKnownLon: -80.25,
    homeBase: "GUELPH",
    costPerWeek: 1019.19,
  },
  {
    unitId: "936011",
    status: "available",
    lastKnownLat: 43.73,
    lastKnownLon: -79.76,
    homeBase: "BRAMPTON",
    costPerWeek: 0,
  },
];

const defaultTrips: FleetMapTrip[] = [
  {
    tripId: "T-001",
    driver: "Denise Starr",
    unitId: "734393",
    lane: "Guelph → Wisconsin",
    origin: { lat: 43.5448, lon: -80.2482 },
    destination: { lat: 43.0389, lon: -87.9065 },
    risk: 0,
    marginPct: 1.0,
  },
  {
    tripId: "T-002",
    driver: "Jeff Churchill",
    unitId: "734401",
    lane: "Kitchener → London",
    origin: { lat: 43.4516, lon: -80.4925 },
    destination: { lat: 42.9837, lon: -81.2497 },
    risk: 0,
    marginPct: 1.0,
  },
];

const statusStyles: Record<
  UnitStatus,
  {
    label: string;
    fill: string;
    stroke: string;
  }
> = {
  available: {
    label: "On track",
    fill: "rgba(74, 222, 128, 0.35)",
    stroke: "rgba(74, 222, 128, 0.9)",
  },
  watch: {
    label: "Watch",
    fill: "rgba(250, 204, 21, 0.3)",
    stroke: "rgba(250, 204, 21, 0.85)",
  },
  action: {
    label: "Action needed",
    fill: "rgba(248, 113, 113, 0.35)",
    stroke: "rgba(248, 113, 113, 0.9)",
  },
};

const neonPolylineOptions = {
  color: "#34d399",
  weight: 3,
  opacity: 0.8,
  dashArray: "1,6",
  lineCap: "round" as const,
  lineJoin: "round" as const,
};

const tileLayerUrl =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

const tileLayerAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> | <span class="text-slate-400">TODO: replace with FleetOps tiles</span>';

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatCoords(lat: number, lon: number) {
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

const FleetMap = ({ units, trips }: FleetMapProps) => {
  const unitsToRender = (units && units.length > 0 ? units : defaultUnits).filter(
    (unit) =>
      typeof unit.lastKnownLat === "number" &&
      !Number.isNaN(unit.lastKnownLat) &&
      typeof unit.lastKnownLon === "number" &&
      !Number.isNaN(unit.lastKnownLon)
  );

  const tripsToRender = (trips && trips.length > 0 ? trips : defaultTrips).filter(
    (trip) =>
      typeof trip.origin?.lat === "number" &&
      typeof trip.origin?.lon === "number" &&
      typeof trip.destination?.lat === "number" &&
      typeof trip.destination?.lon === "number"
  );

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const DefaultIcon = L.icon({
      iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
      iconRetinaUrl: new URL(
        "leaflet/dist/images/marker-icon-2x.png",
        import.meta.url
      ).toString(),
      shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
      shadowSize: [41, 41],
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
    L.Marker.prototype.options.icon = DefaultIcon;
    setIsReady(true);
  }, []);

  const originIcons = useMemo(() => {
    const map = new Map<string, DivIcon>();
    tripsToRender.forEach((trip) => {
      const label = `${trip.driver} • Unit ${trip.unitId}`;
      const icon = L.divIcon({
        html: `<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:9999px;border:1px solid rgba(148,163,184,0.35);background:rgba(15,23,42,0.88);color:#e2e8f0;font-size:11px;font-weight:500;box-shadow:0 8px 18px rgba(2,6,23,0.55);backdrop-filter:blur(6px);">${label}</div>`,
        className: "fleet-map-origin-label",
        iconAnchor: [10, 10],
      });
      map.set(trip.tripId, icon);
    });
    return map;
  }, [tripsToRender]);

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.18),_rgba(2,6,23,0.85))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[length:20px_20px] opacity-30" />

      {isReady ? (
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          zoomControl={false}
          className="relative z-10 h-full w-full"
          scrollWheelZoom
        >
        <ZoomControl position="topright" />
        <TileLayer url={tileLayerUrl} attribution={tileLayerAttribution} />

        {tripsToRender.map((trip) => {
          const positions: LatLngExpression[] = [
            [trip.origin.lat, trip.origin.lon],
            [trip.destination.lat, trip.destination.lon],
          ];
          return (
            <Polyline
              key={`trip-polyline-${trip.tripId}`}
              positions={positions}
              pathOptions={{
                ...neonPolylineOptions,
                opacity:
                  trip.risk > 0.6
                    ? 0.95
                    : trip.risk > 0.3
                    ? 0.88
                    : neonPolylineOptions.opacity,
                color:
                  trip.risk > 0.6
                    ? "#f87171"
                    : trip.risk > 0.3
                    ? "#facc15"
                    : neonPolylineOptions.color,
              }}
            />
          );
        })}

        {tripsToRender.map((trip) => {
          const icon = originIcons.get(trip.tripId);
          if (!icon) return null;
          return (
            <Marker
              key={`trip-origin-${trip.tripId}`}
              position={[trip.origin.lat, trip.origin.lon]}
              icon={icon}
            >
              <Tooltip direction="top" offset={[0, -18]}>
                <div className="space-y-1 text-[11px]">
                  <div className="font-semibold text-slate-100">{trip.lane}</div>
                  <div className="text-slate-300">Driver: {trip.driver}</div>
                  <div className="text-slate-400">Unit {trip.unitId}</div>
                  <div className="text-slate-400">Margin {(trip.marginPct * 100).toFixed(1)}%</div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {unitsToRender.map((unit) => {
          const style = statusStyles[unit.status];
          return (
            <CircleMarker
              key={unit.unitId}
              center={[unit.lastKnownLat, unit.lastKnownLon]}
              radius={9}
              pathOptions={{
                color: style.stroke,
                fillColor: style.fill,
                fillOpacity: 0.9,
                weight: 2,
              }}
              className="shadow-lg"
            >
              <Tooltip direction="top" offset={[0, -4]}>
                <div className="space-y-1 text-[11px]">
                  <div className="font-semibold text-slate-100">Unit {unit.unitId}</div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span
                      className="inline-flex h-2 w-2 rounded-full"
                      style={{ backgroundColor: style.stroke }}
                    />
                    <span>{style.label}</span>
                  </div>
                  {unit.homeBase ? (
                    <div className="text-slate-400">Home base: {unit.homeBase}</div>
                  ) : null}
                  <div className="text-slate-400">
                    Last known: {formatCoords(unit.lastKnownLat, unit.lastKnownLon)}
                  </div>
                  <div className="text-slate-400">
                    Weekly fixed cost: {formatCurrency(unit.costPerWeek)}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
        </MapContainer>
      ) : (
        <div className="relative z-10 flex h-full w-full items-center justify-center text-sm text-slate-300/80">
          Loading map…
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-20 rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-[11px] text-slate-200 shadow-lg shadow-black/40 backdrop-blur">
        <div className="flex items-center gap-4">
          {(
            [
              { status: "available", color: "bg-emerald-400" },
              { status: "watch", color: "bg-amber-300" },
              { status: "action", color: "bg-rose-400" },
            ] as const
          ).map(({ status, color }) => (
            <span key={status} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
              {statusStyles[status].label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FleetMap;
