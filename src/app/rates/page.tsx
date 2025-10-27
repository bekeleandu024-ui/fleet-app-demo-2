import type { ReactNode } from "react";

import prisma from "@/lib/prisma";
import { getLaneRate } from "@/src/server/integrations/marketRates";

import LaneQueryForm from "./LaneQueryForm";

function formatUpdated(date: Date) {
  return date.toLocaleString();
}

export default async function RatesPage() {
  const [[laneChi, laneNyc], rates, settings] = await Promise.all([
    Promise.all([getLaneRate("GTA", "CHI"), getLaneRate("GTA", "NYC")]),
    prisma.rate.findMany({ orderBy: [{ type: "asc" }, { zone: "asc" }] }),
    prisma.rateSetting.findMany({ orderBy: [{ rateKey: "asc" }, { category: "asc" }] }),
  ]);

  const safeRates = rates.map((rate) => ({
    id: rate.id,
    label: [rate.type, rate.zone].filter(Boolean).join(" • ") || "Untitled",
    fixedCPM: Number(rate.fixedCPM),
    wageCPM: Number(rate.wageCPM),
    addOnsCPM: Number(rate.addOnsCPM),
    rollingCPM: Number(rate.rollingCPM),
    zone: rate.zone ?? null,
  }));

  const safeSettings = settings.map((setting) => ({
    id: setting.id,
    rateKey: setting.rateKey,
    category: setting.category,
    value: Number(setting.value),
    unit: setting.unit,
    note: setting.note,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Rates</h1>
        <p className="text-sm text-slate-400">Per-mile cost templates for quick trip budgeting.</p>
      </div>

      <div className="space-y-6">
        <LaneQueryForm />

        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 shadow-card backdrop-blur">
          <div className="px-6 py-4 text-lg font-semibold text-white">Market Snapshot</div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800/60 text-sm">
              <thead className="bg-slate-900/60 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Lane</th>
                  <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">Spot RPM</th>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Source</th>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/50">
                {[{ label: "GTA → CHI", data: laneChi }, { label: "GTA → NYC", data: laneNyc }].map(({ label, data }) => (
                  <tr key={label} className="transition hover:bg-slate-900/50">
                    <td className="px-4 py-3 text-white">{label}</td>
                    <td className="px-4 py-3 text-right text-slate-200">${data.rpm.toFixed(2)}/mi</td>
                    <td className="px-4 py-3 text-slate-300">{data.source}</td>
                    <td className="px-4 py-3 text-slate-300">{formatUpdated(data.lastUpdated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-800/70 px-6 py-3 text-xs text-slate-500">
            External rates are advisory only. Use internal RateSetting for contracted customers.
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 shadow-card backdrop-blur">
        <div className="px-6 py-4 text-lg font-semibold text-white">Rate Templates</div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800/60 text-sm">
            <thead className="bg-slate-900/60 text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Label</th>
                <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">Fixed CPM</th>
                <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">Wage CPM</th>
                <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">Add-ons CPM</th>
                <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">Rolling CPM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/50">
              {safeRates.map((rate) => {
                const totalCpm = rate.fixedCPM + rate.wageCPM + rate.addOnsCPM + rate.rollingCPM;
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
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                        Competitive
                      </span>
                    );
                  } else if (diff <= -0.4) {
                    pill = (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                        High vs Market
                      </span>
                    );
                  }
                }

                return (
                  <tr key={rate.id} className="transition hover:bg-slate-900/50">
                    <td className="px-4 py-3 text-white">
                      <div className="flex items-center gap-2">
                        <span>{rate.label}</span>
                        {pill}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200">{rate.fixedCPM.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{rate.wageCPM.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{rate.addOnsCPM.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{rate.rollingCPM.toFixed(2)}</td>
                  </tr>
                );
              })}
              {safeRates.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No rates configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 shadow-card backdrop-blur">
        <div className="px-6 py-4 text-lg font-semibold text-white">Rate Settings</div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800/60 text-sm">
            <thead className="bg-slate-900/60 text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Rate Key</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">Value</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Unit</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/50">
              {safeSettings.map((setting) => (
                <tr key={setting.id} className="transition hover:bg-slate-900/50">
                  <td className="px-4 py-3 text-white">{setting.rateKey}</td>
                  <td className="px-4 py-3 text-slate-300">{setting.category}</td>
                  <td className="px-4 py-3 text-right text-slate-200">{setting.value.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-300">{setting.unit}</td>
                  <td className="px-4 py-3 text-slate-400">{setting.note ?? "—"}</td>
                </tr>
              ))}
              {safeSettings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No settings configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
