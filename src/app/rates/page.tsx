import type { ReactNode } from "react";

import prisma from "@/lib/prisma";
import { getLaneRate } from "@/src/server/integrations/marketRates";

import DashboardCard from "@/src/components/DashboardCard";
import LaneQueryForm from "./LaneQueryForm";

function formatUpdated(date: Date) {
  return date.toLocaleString();
}

const pillBaseClass = "inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-medium text-white";

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
    <div className="flex flex-col gap-6">
      <DashboardCard
        title="Rates"
        description="Per-mile cost templates for quick trip budgeting."
      >
        <LaneQueryForm />
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
              {[{ label: "GTA → CHI", data: laneChi }, { label: "GTA → NYC", data: laneNyc }].map(({ label, data }) => (
                <tr key={label} className="transition hover:bg-white/5">
                  <td className="px-4 py-3 text-white">{label}</td>
                  <td className="px-4 py-3 text-right text-white">${data.rpm.toFixed(2)}/mi</td>
                  <td className="px-4 py-3 text-white/70">{data.source}</td>
                  <td className="px-4 py-3 text-white/70">{formatUpdated(data.lastUpdated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-white/60">
          External rates are advisory only. Use internal rate settings for contracted customers.
        </p>
      </DashboardCard>

      <DashboardCard title="Rate Templates" description="Internal cost structure per zone.">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 text-right font-medium">Fixed CPM</th>
                <th className="px-4 py-3 text-right font-medium">Wage CPM</th>
                <th className="px-4 py-3 text-right font-medium">Add-ons CPM</th>
                <th className="px-4 py-3 text-right font-medium">Rolling CPM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
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
                    <td className="px-4 py-3 text-right text-white">{rate.addOnsCPM.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-white">{rate.rollingCPM.toFixed(2)}</td>
                  </tr>
                );
              })}
              {safeRates.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/60">
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
