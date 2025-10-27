"use client";

import { useState } from "react";

type LaneResponse = {
  rpm: number;
  source: string;
  lastUpdated: string;
};

export default function LaneQueryForm() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [laneResult, setLaneResult] = useState<null | LaneResponse>(null);
  const [lastQuery, setLastQuery] = useState<null | { origin: string; destination: string }>(null);

  // TODO: Reuse this component on /book so dispatch
  // can live-check a lane they’re about to assign.
  // The plan is to render <LaneQueryForm /> in a side card
  // on the Book page next to the order + driver suggestion.

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedOrigin = origin.trim();
    const trimmedDestination = destination.trim();

    if (!trimmedOrigin || !trimmedDestination) {
      setError("Origin and destination are required");
      setLaneResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/rates/lane", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ origin: trimmedOrigin, destination: trimmedDestination }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "Unable to fetch lane rate");
        setLaneResult(null);
        return;
      }

      setLaneResult(data.lane as LaneResponse);
      setLastQuery({ origin: trimmedOrigin, destination: trimmedDestination });
    } catch (err) {
      console.error(err);
      setError("Unable to fetch lane rate. Please try again.");
      setLaneResult(null);
    } finally {
      setLoading(false);
    }
  };

  const displayLane = lastQuery ?? { origin, destination };
  const formattedUpdated = laneResult ? new Date(laneResult.lastUpdated).toLocaleString() : null;

  return (
    <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-card backdrop-blur">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">Query any lane</h2>
          <p className="text-xs text-slate-400">Pull the latest spot RPM from market data feeds.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              placeholder="e.g. GTA"
              className="w-full rounded-md border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
              aria-label="Origin market"
            />
            <input
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="e.g. CHI"
              className="w-full rounded-md border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
              aria-label="Destination market"
            />
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-600 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Loading…" : "Get rate"}
            </button>
          </div>
        </form>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {laneResult && (
          <div className="space-y-3 rounded-lg border border-slate-800/70 bg-black/30 p-4 text-sm text-slate-200">
            <div className="grid gap-y-2 gap-x-6 sm:grid-cols-2">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Lane</div>
                <div className="mt-1 font-semibold text-slate-100">
                  {displayLane.origin.toUpperCase()} → {displayLane.destination.toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Spot RPM</div>
                <div className="mt-1 font-semibold text-emerald-300">${laneResult.rpm.toFixed(2)}/mi</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Source</div>
                <div className="mt-1 text-slate-200">{laneResult.source}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Updated</div>
                <div className="mt-1 text-slate-200">{formattedUpdated}</div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              External market rate. Use internal rate settings for contracted customers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
