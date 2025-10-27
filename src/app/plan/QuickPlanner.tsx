"use client";

import { useMemo, useState } from "react";

export default function QuickPlanner() {
  const [miles, setMiles] = useState<number>(310);
  const [tripType, setTripType] = useState("Linehaul");
  const [zone, setZone] = useState("GENERAL");
  const [targetRate, setTargetRate] = useState<number>(3.5);

  const wageCPM = 1.25;
  const fixedCPM = 0.45;
  const addOnsCPM = 0.15;
  const rollingCPM = 0.3;

  const totalCPM = useMemo(
    () => wageCPM + fixedCPM + addOnsCPM + rollingCPM,
    [wageCPM, fixedCPM, addOnsCPM, rollingCPM]
  );

  const estMarginPct = useMemo(() => {
    if (!targetRate || targetRate <= 0) return 0;
    return ((targetRate - totalCPM) / targetRate) * 100;
  }, [targetRate, totalCPM]);

  return (
    <div className="grid gap-4 md:grid-cols-2 text-[11px] text-neutral-200">
      <div className="space-y-3">
        <div className="flex flex-col">
          <label className="text-neutral-400 mb-1" htmlFor="qp-miles">
            Miles
          </label>
          <input
            id="qp-miles"
            className="rounded-md bg-neutral-950/70 border border-neutral-700 px-2 py-2 text-[11px] text-neutral-100 outline-none focus:border-emerald-500"
            value={miles}
            onChange={(e) => setMiles(Number(e.target.value) || 0)}
            inputMode="numeric"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-neutral-400 mb-1" htmlFor="qp-trip-type">
            Trip Type
          </label>
          <input
            id="qp-trip-type"
            className="rounded-md bg-neutral-950/70 border border-neutral-700 px-2 py-2 text-[11px] text-neutral-100 outline-none focus:border-emerald-500"
            value={tripType}
            onChange={(e) => setTripType(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-neutral-400 mb-1" htmlFor="qp-zone">
            Zone
          </label>
          <input
            id="qp-zone"
            className="rounded-md bg-neutral-950/70 border border-neutral-700 px-2 py-2 text-[11px] text-neutral-100 outline-none focus:border-emerald-500"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-neutral-400 mb-1" htmlFor="qp-target-rate">
            Target Sell ($/mile)
          </label>
          <input
            id="qp-target-rate"
            className="rounded-md bg-neutral-950/70 border border-neutral-700 px-2 py-2 text-[11px] text-neutral-100 outline-none focus:border-emerald-500"
            value={targetRate}
            onChange={(e) => setTargetRate(Number(e.target.value) || 0)}
            inputMode="decimal"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-neutral-800 bg-neutral-950/30 p-3 shadow-inner shadow-black/50">
        <div className="text-[11px] font-semibold text-neutral-100">
          Cost Breakdown
        </div>
        <div className="text-[11px] text-neutral-300">
          <div>Driver/Wage CPM: ${wageCPM.toFixed(2)}</div>
          <div>Fixed CPM (truck wkly / miles): ${fixedCPM.toFixed(2)}</div>
          <div>Accessorial CPM: ${addOnsCPM.toFixed(2)}</div>
          <div>Rolling CPM (fuel+maint): ${rollingCPM.toFixed(2)}</div>
        </div>

        <div className="pt-2 border-t border-neutral-800 text-[11px] text-neutral-100 font-semibold flex flex-wrap justify-between">
          <span>Total CPM</span>
          <span>${totalCPM.toFixed(2)}/mi</span>
        </div>

        <div className="text-[11px] text-neutral-300 flex flex-wrap justify-between">
          <span>Target Sell</span>
          <span>${targetRate.toFixed(2)}/mi</span>
        </div>

        <div className="text-[11px] flex flex-wrap justify-between font-semibold">
          <span className="text-neutral-200">Projected Margin</span>
          <span
            className={
              estMarginPct >= 12
                ? "text-emerald-400"
                : estMarginPct >= 8
                ? "text-yellow-300"
                : "text-red-400"
            }
          >
            {estMarginPct.toFixed(1)}%
          </span>
        </div>

        <div className="text-[10px] text-neutral-500 leading-relaxed">
          This is advisory only. Final RPM/CPM are locked when you “Book Trip”
          and confirmed with the driver/unit.
        </div>
      </div>
    </div>
  );
}
