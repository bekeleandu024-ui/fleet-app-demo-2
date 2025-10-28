"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { latLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/styles/Intellifleet.css";

export type FleetUnitStatus = "onTrack" | "watch" | "action";

export type StatusToken = {
  label: string;
  marker: string;
  chip: string;
  legend: string;
  mapFill: string;
  mapStroke: string;
};

export type StatusTokenMap = Record<FleetUnitStatus, StatusToken>;

export type FleetUnit = {
  id: string;
  code: string;
  driverName: string;
  status: FleetUnitStatus;
  statusDetail?: string | null;
  lat: number;
  lon: number;
  lastPingLabel?: string;
};

export type LaneCallout = {
  title: string;
  subtitle: string;
  meta: string;
};

export type FleetMapProps = {
  units: FleetUnit[];
  statusTokens: StatusTokenMap;
  laneCallout?: LaneCallout;
  heightClassName?: string;
};

const DEFAULT_CENTER: LatLngExpression = [43.7, -79.4];
const DEFAULT_ZOOM = 5;

const TILE_LAYER_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_LAYER_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function MapBoundsController({ units }: { units: FleetUnit[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (!units.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    const bounds = latLngBounds(
      units.map((unit) => [unit.lat, unit.lon] as [number, number]),
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.2), { animate: false });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [map, units]);

  return null;
}

export function FleetMap({
  units,
  statusTokens,
  laneCallout,
  heightClassName = "h-[460px]",
}: FleetMapProps) {
  const renderableUnits = useMemo(
    () =>
      units.filter(
        (unit) =>
          Number.isFinite(unit.lat) &&
          Number.isFinite(unit.lon) &&
          unit.lat >= -90 &&
          unit.lat <= 90 &&
          unit.lon >= -180 &&
          unit.lon <= 180,
      ),
    [units],
  );

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/70 shadow-lg shadow-black/40 ${heightClassName}`}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom
        className="relative h-full w-full"
      >
        <TileLayer url={TILE_LAYER_URL} attribution={TILE_LAYER_ATTRIBUTION} />
        <ZoomControl position="topright" />
        <MapBoundsController units={renderableUnits} />

        {renderableUnits.map((unit) => {
          const token = statusTokens[unit.status];
          const coordsLabel = `${unit.lat.toFixed(2)}, ${unit.lon.toFixed(2)}`;

          return (
            <CircleMarker
              key={unit.id}
              center={[unit.lat, unit.lon]}
              radius={8}
              pathOptions={{
                color: token.mapStroke,
                fillColor: token.mapFill,
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <div className="space-y-1 text-[0.7rem] text-slate-200">
                  <p className="text-xs font-semibold text-white">{unit.driverName || "Unassigned"}</p>
                  <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">Unit {unit.code}</p>
                  <div className="flex items-center gap-2 text-[0.65rem] text-slate-300">
                    <span
                      className="inline-flex h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: token.mapStroke,
                        boxShadow: `0 0 12px ${token.mapStroke}55`,
                      }}
                      aria-hidden
                    />
                    <span>{token.label}</span>
                  </div>
                  <p className="text-[0.65rem] text-slate-400">Ping: {coordsLabel}</p>
                  {unit.lastPingLabel ? (
                    <p className="text-[0.6rem] text-slate-500">Last ping {unit.lastPingLabel}</p>
                  ) : null}
                  {unit.statusDetail ? (
                    <p className="text-[0.6rem] text-slate-500">Status: {unit.statusDetail}</p>
                  ) : null}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {laneCallout ? (
        <div className="pointer-events-none absolute left-6 top-6 z-[401]">
          <div className="pointer-events-auto rounded-lg border border-neutral-800/80 bg-black/70 px-3 py-2 text-xs text-neutral-300 shadow-lg shadow-black/50 backdrop-blur">
            <p className="text-sm font-semibold text-white">{laneCallout.title}</p>
            <p className="text-[0.7rem] text-neutral-400">{laneCallout.subtitle}</p>
            <p className="text-[0.6rem] text-neutral-500">{laneCallout.meta}</p>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[401] flex justify-center">
        <div className="pointer-events-auto flex items-center gap-4 rounded-full border border-neutral-800 bg-black/60 px-4 py-2 text-[0.7rem] text-neutral-300 shadow-lg shadow-black/50">
          {(Object.entries(statusTokens) as Array<[FleetUnitStatus, StatusToken]>).map(([status, token]) => (
            <span key={status} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: token.mapStroke,
                  boxShadow: `0 0 14px ${token.mapStroke}55`,
                }}
                aria-hidden
              />
              {token.label}
            </span>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-[401] rounded-lg border border-neutral-800/80 bg-black/60 px-3 py-1 text-[0.55rem] uppercase tracking-wide text-neutral-500 shadow-lg shadow-black/50">
        <span dangerouslySetInnerHTML={{ __html: TILE_LAYER_ATTRIBUTION }} />
      </div>
    </div>
  );
}
