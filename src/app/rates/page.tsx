import type { ReactNode } from "react";

import { getAllMarketLanes } from "@/lib/marketRates";
import prisma from "@/lib/prisma";

import DashboardCard from "@/src/components/DashboardCard";
import MarketRatesSection from "./MarketRatesSection";

const pillBaseClass = "inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-medium text-white";

export default async function RatesPage() {
  const [rates, settings, marketLanes] = await Promise.all([
    prisma.rate.findMany({ orderBy: [{ type: "asc" }, { zone: "asc" }] }),
    prisma.rateSetting.findMany({ orderBy: [{ rateKey: "asc" }, { category: "asc" }] }),
    getAllMarketLanes(),
  ]);

  const laneChi = marketLanes.find(
    (lane) => lane.origin.toUpperCase() === "GTA" && lane.destination.toUpperCase() === "CHI",
  );
  const laneNyc = marketLanes.find(
    (lane) => lane.origin.toUpperCase() === "GTA" && lane.destination.toUpperCase() === "NYC",
  );

  const safeRates = rates.map((rate) => {
    const fuelCPM = Number(rate.fuelCPM);
    const truckMaintCPM = Number(rate.truckMaintCPM);
    const trailerMaintCPM = Number(rate.trailerMaintCPM);
    const derivedRolling = fuelCPM + truckMaintCPM + trailerMaintCPM;
    const storedRolling = Number(rate.rollingCPM);
    const rollingCPM = Number.isFinite(derivedRolling) && derivedRolling > 0 ? derivedRolling : storedRolling;

    return {
      id: rate.id,
      label: [rate.type, rate.zone].filter(Boolean).join(" • ") || "Untitled",
      fixedCPM: Number(rate.fixedCPM),
      wageCPM: Number(rate.wageCPM),
      addOnsCPM: Number(rate.addOnsCPM),
      fuelCPM,
      truckMaintCPM,
      trailerMaintCPM,
      rollingCPM,
      zone: rate.zone ?? null,
    };
  });

  const safeSettings = settings.map((setting) => ({
    id: setting.id,
    rateKey: setting.rateKey,
    category: setting.category,
    value: Number(setting.value),
    unit: setting.unit,
    note: setting.note,
  }));

  return (
    <div className="flex flex-col gap-6">
      <MarketRatesSection />

      <DashboardCard title="Rate Templates" description="Internal cost structure per zone.">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 text-right font-medium">Fixed CPM</th>
                <th className="px-4 py-3 text-right font-medium">Wage CPM</th>
                <th className="px-4 py-3 text-right font-medium">Fuel CPM</th>
                <th className="px-4 py-3 text-right font-medium">Truck Maint CPM</th>
                <th className="px-4 py-3 text-right font-medium">Trailer Maint CPM</th>
                <th className="px-4 py-3 text-right font-medium">Add-ons CPM</th>
                <th className="px-4 py-3 text-right font-medium">Total CPM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {safeRates.map((rate) => {
                const rolling = rate.fuelCPM + rate.truckMaintCPM + rate.trailerMaintCPM;
                const totalCpm = rate.fixedCPM + rate.wageCPM + rate.addOnsCPM + rolling;
                const zone = (rate.zone ?? "").toUpperCase();
                const marketContext = zone.includes("CHI")
                  ? laneChi
                  : zone.includes("NYC") || zone.includes("NEW YORK")
                    ? laneNyc
                    : null;
                const diff = marketContext ? marketContext.rpm - totalCpm : null;
                let pill: ReactNode = null;
                if (diff !== null) {
                  if (diff >= 0.4) {
                    pill = (
                      <span className={pillBaseClass}>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                        Competitive
                      </span>
                    );
                  } else if (diff <= -0.4) {
                    pill = (
                      <span className={pillBaseClass}>
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden />
                        High vs Market
                      </span>
                    );
                  }
                }

                return (
                  <tr key={rate.id} className="transition hover:bg-white/5">
                    <td className="px-4 py-3 text-white">
                      <div className="flex items-center gap-2">
                        <span>{rate.label}</span>
                        {pill}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-white">{rate.fixedCPM.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-white">{rate.wageCPM.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-white">{rate.fuelCPM.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-white">{rate.truckMaintCPM.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-white">{rate.trailerMaintCPM.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-white">{rate.addOnsCPM.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-white">{totalCpm.toFixed(2)}</td>
                  </tr>
                );
              })}
              {safeRates.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-white/60">
                    No rates configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <DashboardCard title="Rate Settings" description="Additional knobs for pricing automation.">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Rate Key</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {safeSettings.map((setting) => (
                <tr key={setting.id} className="transition hover:bg-white/5">
                  <td className="px-4 py-3 text-white">{setting.rateKey}</td>
                  <td className="px-4 py-3 text-white/70">{setting.category}</td>
                  <td className="px-4 py-3 text-right text-white">{setting.value.toFixed(2)}</td>
                  <td className="px-4 py-3 text-white/70">{setting.unit}</td>
                  <td className="px-4 py-3 text-white/70">{setting.note ?? "—"}</td>
                </tr>
              ))}
              {safeSettings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/60">
                    No settings configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
