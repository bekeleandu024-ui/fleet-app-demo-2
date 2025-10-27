"use client";

import { useState } from "react";

type UnitMarker = {
  unitId: string;
  code: string;
  lat: number;
  lon: number;
  available: boolean;
  driverName?: string;
  homeBase?: string;
  lastMarginPct?: number | null;
};

type LanePolyline = {
  tripId: string;
  origin: { lat: number; lon: number };
  dest: { lat: number; lon: number };
  miles: number;
  marketRPM: number;
};

type Props = {
  units: UnitMarker[];
  lanes: LanePolyline[];
};

export function MapView({ units, lanes }: Props) {
  const [selectedUnit, setSelectedUnit] = useState<UnitMarker | null>(null);
  const [selectedLane, setSelectedLane] = useState<LanePolyline | null>(null);

  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
      <div className="flex h-[480px] flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/70 text-sm text-zinc-400">
        <p>Map placeholder</p>
        <p className="text-xs text-zinc-500">Integrate Leaflet/Mapbox here</p>
        <div className="mt-4 grid w-full grid-cols-2 gap-2 px-6">
          {units.map((unit) => (
            <button
              key={unit.unitId}
              type="button"
              onClick={() => setSelectedUnit(unit)}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                selectedUnit?.unitId === unit.unitId
                  ? "border-sky-400/60 bg-sky-500/10 text-sky-200"
                  : "border-zinc-700 text-zinc-300 hover:border-sky-400/40"
              }`}
            >
              <p className="font-semibold text-white">{unit.code}</p>
              <p>{unit.available ? "Available" : "Committed"}</p>
            </button>
          ))}
        </div>
      </div>
      <aside className="flex flex-col gap-4">
        {selectedUnit ? (
          <div className="rounded-xl border border-sky-500/40 bg-sky-500/5 p-4 text-sm text-sky-100">
            <h3 className="text-sm font-semibold text-white">Unit {selectedUnit.code}</h3>
            <p className="text-xs text-sky-200">Home base: {selectedUnit.homeBase ?? "—"}</p>
            <p className="text-xs text-sky-200">Last margin: {selectedUnit.lastMarginPct !== undefined && selectedUnit.lastMarginPct !== null ? `${(selectedUnit.lastMarginPct * 100).toFixed(1)}%` : "--"}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">Select a unit</div>
        )}
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm text-emerald-100">
          <h3 className="text-sm font-semibold text-white">Active lanes</h3>
          <ul className="mt-2 space-y-2">
            {lanes.map((lane) => (
              <li key={lane.tripId}>
                <button
                  type="button"
                  onClick={() => setSelectedLane(lane)}
                  className="w-full rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-left text-xs text-emerald-100 hover:bg-emerald-500/20"
                >
                  {lane.origin.lat.toFixed(2)},{lane.origin.lon.toFixed(2)} → {lane.dest.lat.toFixed(2)},{lane.dest.lon.toFixed(2)} ({lane.miles} mi)
                </button>
              </li>
            ))}
          </ul>
          {selectedLane && (
            <div className="mt-3 text-xs text-emerald-200">
              <p>Trip {selectedLane.tripId}</p>
              <p>Market RPM: {selectedLane.marketRPM.toFixed(2)}</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
