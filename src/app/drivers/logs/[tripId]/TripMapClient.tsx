"use client";

import "leaflet/dist/leaflet.css";

import { useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

import { formatDateTimeLabel, formatRelativeAgo } from "@/lib/formatters";

export interface StopDTO {
  id: string;
  label: string;
  lat: number;
  lon: number;
  ts?: string;
  kind: "pickup" | "delivery" | "border" | "start" | "finish" | "other";
}

interface TripMapClientProps {
  stops: StopDTO[];
}

type LatLngTuple = [number, number];

const markerIconCache: Partial<Record<StopDTO["kind"], L.DivIcon>> = {};

function markerColor(kind: StopDTO["kind"]) {
  switch (kind) {
    case "pickup":
      return "#38bdf8"; // sky-400
    case "delivery":
      return "#a855f7"; // purple-500
    case "border":
      return "#f87171"; // red-400
    case "start":
      return "#34d399"; // emerald-400
    case "finish":
      return "#94a3b8"; // slate-400
    default:
      return "#facc15"; // amber-400
  }
}

function getMarkerIcon(kind: StopDTO["kind"]) {
  if (!markerIconCache[kind]) {
    const color = markerColor(kind);
    markerIconCache[kind] = L.divIcon({
      html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:${color};border:2px solid rgba(15,23,42,0.8);box-shadow:0 4px 10px rgba(0,0,0,0.35);"></span>`,
      className: "",
      iconSize: [18, 18],
      iconAnchor: [9, 18],
      popupAnchor: [0, -18],
    });
  }
  return markerIconCache[kind]!;
}

export default function TripMapClient({ stops }: TripMapClientProps) {
  const validStops = useMemo(() => {
    return stops.filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lon));
  }, [stops]);

  if (validStops.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-white/10 bg-black/20 text-[13px] text-white/60">
        No location data yet.
      </div>
    );
  }

  const positions = useMemo<LatLngTuple[]>(
    () => validStops.map((stop) => [stop.lat, stop.lon] as LatLngTuple),
    [validStops],
  );

  const bounds = useMemo(() => {
    if (positions.length === 0) {
      return null;
    }
    return L.latLngBounds(positions);
  }, [positions]);

  const defaultCenter: LatLngTuple = positions[0];

  return (
    <div className="h-64 w-full overflow-hidden rounded-lg border border-white/10 bg-black/20 text-white/80">
      <MapContainer
        style={{ height: "100%", width: "100%" }}
        bounds={bounds ?? undefined}
        center={bounds ? undefined : defaultCenter}
        zoom={bounds ? undefined : 6}
        scrollWheelZoom
        className="h-full w-full text-[10px]"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {positions.length >= 2 && (
          <Polyline positions={positions} pathOptions={{ color: "#38bdf8", weight: 3, opacity: 0.6 }} />
        )}

        {validStops.map((stop) => {
          const position: LatLngTuple = [stop.lat, stop.lon];
          const formattedTs = stop.ts ? formatDateTimeLabel(stop.ts) : null;
          const relative = stop.ts ? formatRelativeAgo(stop.ts) : null;
          return (
            <Marker key={stop.id} position={position} icon={getMarkerIcon(stop.kind)}>
              <Popup>
                <div className="space-y-1 text-[12px] text-white/90">
                  <div className="font-semibold text-white">{stop.label}</div>
                  {formattedTs ? (
                    <div className="space-y-0.5 text-[11px] text-white/70">
                      <div>{formattedTs}</div>
                      {relative ? <div className="text-white/50">{relative}</div> : null}
                    </div>
                  ) : (
                    <div className="text-[11px] text-white/50">No timestamp yet</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
