"use client";

import { useState } from "react";

type LaneResponse = {
  rpm: number;
  source: string;
  lastUpdated: string;
};

const inputClass =
  "w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300/60";

export default function LaneQueryForm() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [laneResult, setLaneResult] = useState<null | LaneResponse>(null);
  const [lastQuery, setLastQuery] = useState<null | { origin: string; destination: string }>(null);

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
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-white">Query any lane</h2>
        <p className="text-xs text-white/60">Pull the latest spot RPM from market data feeds.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            placeholder="e.g. GTA"
            className={inputClass}
            aria-label="Origin market"
          />
          <input
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="e.g. CHI"
            className={inputClass}
            aria-label="Destination market"
          />
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-emerald-300/40 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Loading…" : "Get rate"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      {laneResult && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          <div className="grid gap-y-2 gap-x-6 sm:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-white/50">Lane</div>
              <div className="mt-1 font-semibold text-white">
                {displayLane.origin.toUpperCase()} → {displayLane.destination.toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-white/50">Spot RPM</div>
              <div className="mt-1 font-semibold text-emerald-300">${laneResult.rpm.toFixed(2)}/mi</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-white/50">Source</div>
              <div className="mt-1 text-white/80">{laneResult.source}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-white/50">Updated</div>
              <div className="mt-1 text-white/80">{formattedUpdated}</div>
            </div>
          </div>
          <p className="text-xs text-white/60">
            External market rate. Use internal rate settings for contracted customers.
          </p>
        </div>
      )}
    </div>
  );
}
