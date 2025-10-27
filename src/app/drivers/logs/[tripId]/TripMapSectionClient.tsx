"use client";

import TripMapClient, { type StopDTO } from "./TripMapClient";

interface TripMapSectionClientProps {
  stops: StopDTO[];
  etaToDeliveryText: string;
  delayRiskPct: number;
  nextCommitmentText: string;
}

export default function TripMapSectionClient({
  stops,
  etaToDeliveryText,
  delayRiskPct,
  nextCommitmentText,
}: TripMapSectionClientProps) {
  const riskBadge = getRiskBadge(delayRiskPct);

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-5 text-white/90 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
      <div className="mb-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-white">
        Trip Map &amp; Status
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TripMapClient stops={stops} />
        <div className="flex flex-col gap-6 text-[13px]">
          <KpiBlock label="ETA to Delivery" value={etaToDeliveryText} />
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
              Delay Risk
            </div>
            <span
              className={`inline-flex min-w-[96px] items-center justify-center rounded-full border px-3 py-1 text-[12px] font-semibold leading-none ${riskBadge.classes}`}
            >
              {Math.round(delayRiskPct)}%
            </span>
            <p className="text-[12px] text-white/50">
              Higher percentages mean tighter slack to the next commitment.
            </p>
          </div>
          <KpiBlock label="Next Commitment" value={nextCommitmentText} />
        </div>
      </div>
    </section>
  );
}

function KpiBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">{label}</div>
      <div className="text-[14px] font-semibold text-white">{value}</div>
    </div>
  );
}

function getRiskBadge(pct: number) {
  if (pct <= 30) {
    return {
      tone: "low" as const,
      classes: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
    };
  }
  if (pct <= 60) {
    return {
      tone: "medium" as const,
      classes: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    };
  }
  return {
    tone: "high" as const,
    classes: "border-rose-500/40 bg-rose-500/15 text-rose-200",
  };
}
