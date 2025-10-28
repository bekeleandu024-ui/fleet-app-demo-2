"use client";

import { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type UnitPing = {
  id: string;
  driverName: string;
  unitLabel: string;
  status: "onTrack" | "watch" | "action";
  lat: number;
  lon: number;
  laneName: string;
  laneSummary: string;
  rpmInfo: string;
};

// helper component to auto-fit bounds to markers
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useMemo(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map(([lat, lon]) => [lat, lon]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [points, map]);
  return null;
}

// build a DivIcon that matches our glow style + status color
function makeTruckIcon(status: UnitPing["status"]) {
  let ringColor = "";
  let dotColor = "";

  if (status === "onTrack") {
    ringColor = "bg-emerald-400/30 border-emerald-400/60";
    dotColor = "bg-emerald-400";
  } else if (status === "watch") {
    ringColor = "bg-yellow-400/30 border-yellow-400/60";
    dotColor = "bg-yellow-400";
  } else {
    ringColor = "bg-rose-400/30 border-rose-400/60";
    dotColor = "bg-rose-400";
  }

  const html = `
    <div class="relative flex items-center justify-center">
      <div class="w-6 h-6 rounded-full border ${ringColor} shadow-[0_0_10px_rgba(0,0,0,0.8)] flex items-center justify-center">
        <div class="w-2.5 h-2.5 rounded-full ${dotColor} border border-black/40"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "truck-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export default function FleetMapCard({ pings }: { pings: UnitPing[] }) {
  const active = pings.length;
  const onTrack = pings.filter((p) => p.status === "onTrack").length;
  const watch = pings.filter((p) => p.status === "watch").length;
  const actionNeeded = pings.filter((p) => p.status === "action").length;

  const points: [number, number][] = pings.map((p) => [p.lat, p.lon]);

  return (
    <section className="rounded-xl border border-white/10 bg-[#0b0f1a] bg-[radial-gradient(ellipse_at_top_left,rgba(14,23,42,0.6),#000_70%)] p-4 text-white relative">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-white">Fleet map</h2>
          <p className="text-xs text-white/60 max-w-md">
            Hover units for live context. Coordinates align with the latest
            telematics ping.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] font-medium">
          <span className="rounded-md bg-white/10 border border-white/20 px-2 py-1 text-white">
            {active} active units
          </span>
          <span className="flex items-center gap-1 rounded-md bg-emerald-950/40 border border-emerald-600/40 px-2 py-1 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            On track {onTrack}
          </span>
          <span className="flex items-center gap-1 rounded-md bg-yellow-950/40 border border-yellow-500/40 px-2 py-1 text-yellow-300">
            <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
            Watch: {watch}
          </span>
          <span className="flex items-center gap-1 rounded-md bg-rose-950/40 border border-rose-500/40 px-2 py-1 text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]" />
            Action needed: {actionNeeded}
          </span>
        </div>
      </div>

      {/* Map container */}
      <div className="relative mt-4 rounded-lg border border-white/10 overflow-hidden">
        <MapContainer
          className="h-[400px] w-full"
          zoom={5}
          center={[43.7, -79.4]}
          scrollWheelZoom={false}
          preferCanvas={true}
        >
          {/* Dark-ish tile layer.
             Swap URL to a proper dark provider later if desired. */}
          <TileLayer
            // standard OSM for now; replace with a dark tile service if available
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution=""
          />

          <FitBounds points={points} />

          {pings.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lon]}
              icon={makeTruckIcon(p.status)}
            >
              <Tooltip
                direction="top"
                offset={[0, -10]}
                opacity={1}
                className="!bg-black !text-white !text-xs !rounded-md !px-3 !py-2 !border !border-white/20"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-white text-xs leading-tight">
                    {p.laneName}
                  </div>
                  <div className="text-[10px] text-white/80 leading-tight">
                    {p.laneSummary}
                  </div>
                  <div className="text-[10px] text-white/50 leading-tight">
                    {p.rpmInfo}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend overlay */}
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-4 flex items-center gap-4 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-[10px] text-white shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            On track
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
            Watch
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]" />
            Action needed
          </span>
        </div>
      </div>
    </section>
  );
}
