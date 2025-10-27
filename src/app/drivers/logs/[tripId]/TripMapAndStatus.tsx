import dynamic from "next/dynamic";

import type { EventDTO, StopDTO } from "./TripMapClient";

const TripMapClient = dynamic(() => import("./TripMapClient"), {
  ssr: false,
});

interface TripMapAndStatusProps {
  stops: StopDTO[];
  events: EventDTO[];
  etaToFinalStopLabel: string;
  delayRiskPctLabel: string;
  nextCommitmentText: string;
}

export default function TripMapAndStatus({
  stops,
  events,
  etaToFinalStopLabel,
  delayRiskPctLabel,
  nextCommitmentText,
}: TripMapAndStatusProps) {
  return (
    <section>
      <div className="mb-3 text-sm font-semibold text-slate-200">Trip Map &amp; Status</div>
      <div className="grid gap-4 rounded-xl border border-white/10 bg-slate-900/40 p-4 text-slate-100 md:grid-cols-[2fr_1fr]">
        <TripMapClient stops={stops} events={events} />

        <div className="space-y-4 text-xs">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              ETA to Delivery
            </div>
            <div className="text-sm font-medium text-slate-100">{etaToFinalStopLabel}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Delay Risk
            </div>
            <div className="text-sm font-medium text-slate-100">{delayRiskPctLabel}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Next Commitment
            </div>
            <div className="text-sm font-medium text-slate-100">{nextCommitmentText}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
