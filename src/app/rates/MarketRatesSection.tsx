"use client";

import { useCallback, useEffect, useState } from "react";

import DashboardCard from "@/src/components/DashboardCard";

type SnapshotLane = {
  origin: string;
  destination: string;
  rpm: number;
  source: string;
  updatedAt: string;
};

type LookupResponse = {
  rpm: number;
  source: string;
};

const inputClass =
  "w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300/60";

export default function MarketRatesSection() {
  const [originInput, setOriginInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LookupResponse | null>(null);
  const [lastQueriedLane, setLastQueriedLane] = useState<{ origin: string; destination: string } | null>(null);
  const [snapshotLanes, setSnapshotLanes] = useState<SnapshotLane[]>([]);

  const fetchSnapshot = useCallback(async () => {
    try {
      const response = await fetch("/api/rates/snapshot");
      if (!response.ok) {
        throw new Error("Failed to load snapshot");
      }
      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; lanes?: SnapshotLane[] }
        | null;

      if (!data?.success || !Array.isArray(data.lanes)) {
        throw new Error("Invalid snapshot payload");
      }

      setSnapshotLanes(data.lanes);
    } catch (error) {
      console.error("Failed to fetch snapshot", error);
      setSnapshotLanes([]);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  const performLookup = useCallback(
    async (origin: string, destination: string, saveToSnapshot: boolean) => {
      if (!origin || !destination) {
        setErrorMsg("Origin and destination are required.");
        setLookupResult(null);
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);

      try {
        const response = await fetch("/api/rates/lookup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ origin, destination, saveToSnapshot }),
        });

        const data = (await response.json().catch(() => null)) as
          | {
              success?: boolean;
              error?: string;
              lane?: {
                rpm?: number;
                source?: string;
              };
            }
          | null;

        if (!response.ok || !data?.success || !data.lane) {
          const message = data?.error ?? `No rate available for ${origin} → ${destination}`;
          setErrorMsg(message);
          setLookupResult(null);
          return;
        }

        if (typeof data.lane.rpm !== "number" || typeof data.lane.source !== "string") {
          setErrorMsg(`No rate available for ${origin} → ${destination}`);
          setLookupResult(null);
          return;
        }

        setLookupResult({ rpm: data.lane.rpm, source: data.lane.source });
        setLastQueriedLane({ origin, destination });

        if (saveToSnapshot) {
          await fetchSnapshot();
        }
      } catch (error) {
        console.error("Failed to lookup rate", error);
        setErrorMsg("Unable to fetch lane rate. Please try again.");
        setLookupResult(null);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSnapshot],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const origin = originInput.trim();
    const destination = destinationInput.trim();
    await performLookup(origin, destination, false);
  };

  const handleSave = async () => {
    if (!lastQueriedLane) return;
    await performLookup(lastQueriedLane.origin, lastQueriedLane.destination, true);
  };

  const displayLane = lastQueriedLane ?? { origin: originInput.trim(), destination: destinationInput.trim() };

  return (
    <>
      <DashboardCard title="Rates" description="Per-mile cost templates for quick trip budgeting.">
        <div className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white">Query any lane</h2>
            <p className="text-xs text-white/60">Pull the latest spot RPM from market data feeds.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={originInput}
                onChange={(event) => setOriginInput(event.target.value)}
                placeholder="e.g. GTA"
                className={inputClass}
                aria-label="Origin market"
              />
              <input
                value={destinationInput}
                onChange={(event) => setDestinationInput(event.target.value)}
                placeholder="e.g. CHI"
                className={inputClass}
                aria-label="Destination market"
              />
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-emerald-300/40 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Loading…" : "Get rate"}
              </button>
            </div>
          </form>

          {errorMsg && <p className="text-sm text-rose-300">{errorMsg}</p>}

          {lookupResult && (
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
                  <div className="mt-1 font-semibold text-emerald-300">${lookupResult.rpm.toFixed(2)}/mi</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-white/50">Source</div>
                  <div className="mt-1 text-white/80">{lookupResult.source}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-white/50">Updated</div>
                  <div className="mt-1 text-white/80">{new Date().toLocaleString()}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-white/60">
                  ${lookupResult.rpm.toFixed(2)}/mi · {lookupResult.source}
                </p>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:border-emerald-300/40 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save to Snapshot
                </button>
              </div>
              <p className="text-xs text-white/60">
                External market rate. Use internal rate settings for contracted customers.
              </p>
            </div>
          )}
        </div>
      </DashboardCard>

      <DashboardCard title="Market Snapshot" description="Live spot data for priority GTA outbound lanes.">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Lane</th>
                <th className="px-4 py-3 text-right font-medium">Spot RPM</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {snapshotLanes.map((lane) => (
                <tr key={`${lane.origin}-${lane.destination}`} className="transition hover:bg-white/5">
                  <td className="px-4 py-3 text-white">
                    {lane.origin.toUpperCase()} → {lane.destination.toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-right text-white">${lane.rpm.toFixed(2)}/mi</td>
                  <td className="px-4 py-3 text-white/70">{lane.source}</td>
                  <td className="px-4 py-3 text-white/70">{new Date(lane.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
              {snapshotLanes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-white/60">
                    No lanes saved. Query a lane above and Save to Snapshot.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-white/60">
          External rates are advisory only. Use internal rate settings for contracted customers.
        </p>
      </DashboardCard>
    </>
  );
}
