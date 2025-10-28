"use client";

import { useState } from "react";

import LogButtons from "./LogButtons";
import type { TripCostingSnapshot, TripStopOption } from "@/types/trip";

interface LiveTripCostingCardProps {
  tripId: string;
  initialTrip: TripCostingSnapshot;
  stops: TripStopOption[];
  lane: { origin: string | null; destination: string | null };
  tripNumber: string;
  driver: string | null;
  unit: string | null;
  status: string | null;
}

export default function LiveTripCostingCard({
  tripId,
  initialTrip,
  stops,
  lane,
  tripNumber,
  driver,
  unit,
  status,
}: LiveTripCostingCardProps) {
  const [trip, setTrip] = useState<TripCostingSnapshot>(initialTrip);

  const revenueValue = trip.revenue || trip.expectedRevenue;

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-6 text-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Trip / Lane</div>
          <div className="text-[15px] font-semibold text-white/90">
            {lane.origin || "—"} <span className="text-white/50">→</span> {lane.destination || "—"}
          </div>
          <div className="text-[12px] text-white/50">Trip #{tripNumber}</div>
        </div>
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Driver / Unit</div>
          <div className="text-[15px] font-medium text-white/90">
            {driver || "—"} <span className="text-white/40">/</span> {unit || "—"}
          </div>
          <div className="text-[12px] text-white/50">Status: {status || "Created"}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Metric label="Miles" value={trip.miles.toLocaleString(undefined, { maximumFractionDigits: 1 })} suffix=" mi" />
        <Metric label="Revenue" value={revenueValue.toFixed(2)} prefix="$" />
        <Metric label="Total CPM" value={trip.totalCPM.toFixed(2)} prefix="$" />
        <Metric label="Profit" value={trip.profit.toFixed(2)} prefix="$" />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric label="Fixed CPM" value={trip.fixedCPM.toFixed(2)} prefix="$" subtle />
        <Metric label="Wage CPM" value={trip.wageCPM.toFixed(2)} prefix="$" subtle />
        <Metric label="Rolling CPM" value={trip.rollingCPM.toFixed(2)} prefix="$" subtle />
        <Metric label="Add-ons CPM" value={trip.addOnsCPM.toFixed(2)} prefix="$" subtle />
        <Metric label="Total Cost" value={trip.totalCost.toFixed(2)} prefix="$" subtle />
        <Metric
          label="Margin"
          value={(trip.marginPct * 100).toFixed(1)}
          suffix="%"
          tone={marginTone(trip.marginPct)}
          subtle
        />
      </div>

      <div className="mt-6">
        <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white">Log an Event</div>
        <p className="mt-2 text-[12px] text-white/60">
          Tap a button when it happens. We’ll timestamp it, capture geolocation, and update costing.
        </p>
      </div>
      <div className="mt-4">
        <LogButtons
          tripId={tripId}
          stops={stops}
          onTripUpdated={(updated) => {
            setTrip(updated);
          }}
        />
      </div>
    </section>
  );
}

function marginTone(marginPct: number): "positive" | "neutral" | "negative" {
  if (marginPct >= 0.12) {
    return "positive";
  }
  if (marginPct >= 0.08) {
    return "neutral";
  }
  return "negative";
}

function Metric({
  label,
  value,
  prefix,
  suffix,
  tone,
  subtle,
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  tone?: "positive" | "neutral" | "negative";
  subtle?: boolean;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
      ? "text-rose-300"
      : "text-white/85";

  return (
    <div
      className={`rounded-lg border border-white/10 ${
        subtle ? "bg-black/20" : "bg-black/30"
      } px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">{label}</div>
      <div className={`mt-1 text-[14px] font-semibold ${toneClass}`}>
        {prefix ?? ""}
        {value}
        {suffix ?? ""}
      </div>
    </div>
  );
}
