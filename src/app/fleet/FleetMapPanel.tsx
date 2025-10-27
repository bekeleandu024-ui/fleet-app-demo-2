"use client";

import React from "react";

export interface FleetMapPanelProps {
  units: {
    code: string;
    status?: string | null;
    lat?: number | null;
    lon?: number | null;
    risk?: "ok" | "warn" | "danger";
  }[];
  trips: {
    id: string;
    driver: string;
    unit: string;
    marginPct: number;
    delayRiskPct: number;
    currentLat?: number | null;
    currentLon?: number | null;
    risk?: "ok" | "warn" | "danger";
  }[];
}

const LAT_RANGE = { min: 40, max: 50 };
const LON_RANGE = { min: -90, max: -70 };

export default function FleetMapPanel({ units, trips }: FleetMapPanelProps) {
  const pins = [
    ...units
      .filter((unit) => typeof unit.lat === "number" && typeof unit.lon === "number")
      .map((unit) => ({
        key: `unit-${unit.code}`,
        label: unit.code,
        lat: unit.lat as number,
        lon: unit.lon as number,
        risk: unit.risk ?? "ok",
        kind: "unit" as const,
      })),
    ...trips
      .filter((trip) => typeof trip.currentLat === "number" && typeof trip.currentLon === "number")
      .map((trip) => ({
        key: `trip-${trip.id}`,
        label: trip.unit,
        lat: trip.currentLat as number,
        lon: trip.currentLon as number,
        risk: trip.risk ?? "ok",
        kind: "trip" as const,
      })),
  ];

  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/80">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%),_linear-gradient(135deg,_rgba(148,163,184,0.15)_1px,_transparent_1px)] bg-[length:100%_100%,18px_18px]" />
      <div className="absolute inset-0 opacity-30" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(148,163,184,0.08) 28px, rgba(148,163,184,0.08) 29px)" }} />
      <div className="absolute inset-0 opacity-20" style={{ background: "repeating-linear-gradient(90deg, transparent, transparent 28px, rgba(148,163,184,0.08) 28px, rgba(148,163,184,0.08) 29px)" }} />

      {pins.map((pin) => {
        const { top, left } = project(pin.lat, pin.lon);
        return (
          <div
            key={pin.key}
            className="absolute flex flex-col items-center gap-1"
            style={{ top: `${top}%`, left: `${left}%`, transform: "translate(-50%, -50%)" }}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-lg shadow-black/50 ${
                pin.risk === "danger"
                  ? "border-red-500/60 bg-red-500/20 text-red-200"
                  : pin.risk === "warn"
                  ? "border-yellow-400/60 bg-yellow-400/10 text-yellow-100"
                  : "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {pin.label}
            </div>
            <span className="rounded bg-neutral-900/80 px-2 py-[1px] text-[10px] font-medium text-neutral-200 shadow">
              {pin.kind === "unit" ? "Unit" : "Trip"}
            </span>
          </div>
        );
      })}

      <div className="absolute bottom-3 right-3 flex items-center gap-3 rounded-full border border-neutral-700/70 bg-neutral-900/80 px-3 py-1 text-[10px] text-neutral-300">
        <LegendSwatch className="bg-emerald-400/80" label="On track" />
        <LegendSwatch className="bg-yellow-300/80" label="Watch" />
        <LegendSwatch className="bg-red-400/80" label="Action needed" />
      </div>
    </div>
  );
}

function project(lat: number, lon: number) {
  const clampedLat = Math.min(Math.max(lat, LAT_RANGE.min), LAT_RANGE.max);
  const clampedLon = Math.min(Math.max(lon, LON_RANGE.min), LON_RANGE.max);
  const top = ((LAT_RANGE.max - clampedLat) / (LAT_RANGE.max - LAT_RANGE.min)) * 100;
  const left = ((clampedLon - LON_RANGE.min) / (LON_RANGE.max - LON_RANGE.min)) * 100;
  return { top, left };
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
