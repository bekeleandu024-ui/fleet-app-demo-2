"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

import TripMapClient from "./TripMapClient";
import type { BadgeTone, TripOperationalStatus } from "@/server/tripStatus";

export interface TripStopDTO {
  id: string;
  seq: number;
  stopType: string;
  name?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal?: string | null;
  scheduledAt?: string | null;
  lat?: number | null;
  lon?: number | null;
}

export interface TripEventDTO {
  id: string;
  type: string;
  at: string;
  stopId?: string | null;
  lat?: number | null;
  lon?: number | null;
  notes?: string | null;
  stop?: {
    id: string;
    seq: number;
    stopType: string;
    name?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
}

interface SummaryProps {
  etaLabel: string;
  delayBadge: TripOperationalStatus["delayRiskBadge"];
  nextCommitmentLabel: string;
}

interface TripMapAndStatusProps {
  stops: TripStopDTO[];
  events: TripEventDTO[];
  summary: SummaryProps;
  statusCard: ReactNode;
  children?: ReactNode;
}

interface TripMapFocusContextValue {
  focusOnEvent: (eventId: string | null) => void;
  focusedEventId: string | null;
}

const TripMapFocusContext = createContext<TripMapFocusContextValue | null>(null);

export function useTripMapFocus() {
  const context = useContext(TripMapFocusContext);
  if (!context) {
    throw new Error("useTripMapFocus must be used within TripMapAndStatus");
  }
  return context;
}

function toneClasses(tone: BadgeTone) {
  switch (tone) {
    case "green":
      return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20";
    case "yellow":
      return "bg-amber-400/10 text-amber-200 border border-amber-300/30";
    case "red":
      return "bg-rose-500/10 text-rose-300 border border-rose-500/30";
    default:
      return "bg-slate-500/10 text-slate-200 border border-slate-500/20";
  }
}

export default function TripMapAndStatus({
  stops,
  events,
  summary,
  statusCard,
  children,
}: TripMapAndStatusProps) {
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const hasCoordinates = useMemo(
    () =>
      stops.some((stop) => typeof stop.lat === "number" && typeof stop.lon === "number") ||
      events.some((event) => typeof event.lat === "number" && typeof event.lon === "number"),
    [stops, events]
  );

  const delayBadgeTone = summary.delayBadge.tone ?? "yellow";

  return (
    <TripMapFocusContext.Provider
      value={{ focusOnEvent: setFocusedEventId, focusedEventId }}
    >
      <section className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <div className="text-sm font-semibold text-neutral-200">Trip Map &amp; Status</div>
              <div className="mt-3 h-[260px] overflow-hidden rounded-xl border border-neutral-800/60 bg-neutral-950/70">
                {hasCoordinates ? (
                  <TripMapClient
                    stops={stops}
                    events={events}
                    focusedEventId={focusedEventId}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[12px] text-neutral-500">
                    No live position yet.
                  </div>
                )}
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 lg:max-w-[220px]">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                  ETA to delivery
                </div>
                <div className="text-sm font-semibold text-neutral-100">
                  {summary.etaLabel}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                  Delay risk
                </div>
                <span
                  className={`inline-flex items-center rounded px-2 py-[3px] text-[11px] font-medium ${toneClasses(delayBadgeTone)}`}
                >
                  {summary.delayBadge.text}
                </span>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                  Next commitment
                </div>
                <div className="text-sm text-neutral-200">
                  {summary.nextCommitmentLabel}
                </div>
              </div>
            </div>
          </div>
        </div>

        {statusCard}
      </section>

      {children ? <div className="mt-6 space-y-6">{children}</div> : null}
    </TripMapFocusContext.Provider>
  );
}
