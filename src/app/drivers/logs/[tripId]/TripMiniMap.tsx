"use client";

import React from "react";

export interface TripMiniMapProps {
  origin?: { lat: number; lon: number; label: string };
  dest?: { lat: number; lon: number; label: string };
  current?: { lat: number; lon: number; label: string };
}

const DEFAULT_BOUNDS = {
  minLat: 40,
  maxLat: 50,
  minLon: -95,
  maxLon: -65,
};

export default function TripMiniMap({ origin, dest, current }: TripMiniMapProps) {
  const pins = [
    origin ? { ...origin, kind: "origin" as const } : null,
    dest ? { ...dest, kind: "dest" as const } : null,
    current ? { ...current, kind: "current" as const } : null,
  ].filter(Boolean) as Array<
    { lat: number; lon: number; label: string } & { kind: "origin" | "dest" | "current" }
  >;

  if (pins.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/60 text-[12px] text-neutral-500">
        No live position yet.
      </div>
    );
  }

  const bounds = pins.reduce(
    (acc, pin) => ({
      minLat: Math.min(acc.minLat, pin.lat),
      maxLat: Math.max(acc.maxLat, pin.lat),
      minLon: Math.min(acc.minLon, pin.lon),
      maxLon: Math.max(acc.maxLon, pin.lon),
    }),
    { ...DEFAULT_BOUNDS }
  );

  const latSpan = Math.max(0.001, bounds.maxLat - bounds.minLat);
  const lonSpan = Math.max(0.001, bounds.maxLon - bounds.minLon);

  const renderPin = (
    pin: (typeof pins)[number],
    index: number
  ): React.ReactElement => {
    const top = ((bounds.maxLat - pin.lat) / latSpan) * 100;
    const left = ((pin.lon - bounds.minLon) / lonSpan) * 100;

    const baseStyles =
      pin.kind === "origin"
        ? "bg-emerald-400 border-emerald-300"
        : pin.kind === "dest"
        ? "bg-sky-400 border-sky-300"
        : "bg-amber-300 border-amber-100";

    return (
      <div
        key={`${pin.kind}-${index}`}
        className="absolute"
        style={{ top: `${top}%`, left: `${left}%`, transform: "translate(-50%, -50%)" }}
      >
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-semibold text-slate-900 shadow-lg shadow-black/40 ${baseStyles}`}
        >
          {pin.kind === "origin" ? "S" : pin.kind === "dest" ? "D" : "•"}
        </div>
        <div className="mt-1 w-max rounded bg-neutral-900/90 px-2 py-[2px] text-[10px] text-neutral-200 shadow">
          {pin.label}
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/80">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%),_linear-gradient(135deg,_rgba(148,163,184,0.12)_1px,_transparent_1px)] bg-[length:100%_100%,16px_16px]" />
      <div className="absolute inset-0 opacity-40" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(148,163,184,0.08) 24px, rgba(148,163,184,0.08) 25px)" }} />
      <div className="absolute inset-0 opacity-20" style={{ background: "repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(148,163,184,0.08) 24px, rgba(148,163,184,0.08) 25px)" }} />
      <div className="absolute inset-0">
        {origin && dest ? (
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            {(() => {
              const originTop = ((bounds.maxLat - origin.lat) / latSpan) * 100;
              const originLeft = ((origin.lon - bounds.minLon) / lonSpan) * 100;
              const destTop = ((bounds.maxLat - dest.lat) / latSpan) * 100;
              const destLeft = ((dest.lon - bounds.minLon) / lonSpan) * 100;
              return (
                <line
                  x1={`${originLeft}%`}
                  y1={`${originTop}%`}
                  x2={`${destLeft}%`}
                  y2={`${destTop}%`}
                  stroke="rgba(96,165,250,0.6)"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
              );
            })()}
          </svg>
        ) : null}
        {pins.map(renderPin)}
      </div>
    </div>
  );
}
