// Acceptance criteria:
// - Displays order lane details and suggested driver/unit/rate with reasons.
// - Guardrails and AI summary are visible with structured "why" context.
// - Provides "Accept suggestions" link to dispatch step and manual adjustment options.
// - No Prisma.Decimal values are passed directly to the client.

import Link from "next/link";

import prisma from "@/lib/prisma";
import { suggestPlanAndPrice } from "@/server/suggest-plan";

function formatDate(date?: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export default async function PlanOrderPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      trips: true,
    },
  });

  if (!order) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm text-zinc-400">Order not found.</div>;
  }

  const suggestion = await suggestPlanAndPrice(order.id);
  const [drivers, units, rates] = await Promise.all([
    prisma.driver.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.rate.findMany({ take: 5, orderBy: { type: "asc" } }).catch(() => []),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">{order.customer}</h1>
            <p className="text-sm text-zinc-300">
              {order.origin} → {order.destination}
            </p>
            <p className="text-xs text-zinc-500">
              Pickup {formatDate(order.puWindowStart)} · Delivery {formatDate(order.delWindowStart)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/orders/${order.id}/dispatch`}
              className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30"
            >
              Accept suggestions
            </Link>
            <Link
              href={`/orders/${order.id}`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500"
            >
              Review intake
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Recommended driver</p>
          {suggestion.suggestedDriver ? (
            <>
              <p className="mt-2 text-lg font-semibold text-white">{suggestion.suggestedDriver.name}</p>
              <p className="mt-2 text-sm text-zinc-300">{suggestion.suggestedDriver.reason}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">No driver available</p>
          )}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Recommended unit</p>
          {suggestion.suggestedUnit ? (
            <>
              <p className="mt-2 text-lg font-semibold text-white">{suggestion.suggestedUnit.code}</p>
              <p className="mt-2 text-sm text-zinc-300">{suggestion.suggestedUnit.reason}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">No unit available</p>
          )}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Suggested rate</p>
          <p className="mt-2 text-lg font-semibold text-white">
            RPM {formatNumber(suggestion.suggestedRate.rpm ?? null)}
          </p>
          <div className="mt-3 space-y-1 text-xs text-zinc-300">
            <p>Wage CPM: {formatNumber(suggestion.suggestedRate.cpmBreakdown.wageCPM)}</p>
            <p>Fuel CPM: {formatNumber(suggestion.suggestedRate.cpmBreakdown.fuelCPM)}</p>
            <p>Add-ons CPM: {formatNumber(suggestion.suggestedRate.cpmBreakdown.addOnsCPM)}</p>
            <p>Fixed CPM: {formatNumber(suggestion.suggestedRate.cpmBreakdown.fixedCPM)}</p>
            <p>Total CPM: {formatNumber(suggestion.suggestedRate.cpmBreakdown.totalCPM)}</p>
            <p>Margin: {formatNumber(suggestion.suggestedRate.marginEstimatePct)}</p>
          </div>
          {suggestion.suggestedRate.warningLowMargin && (
            <p className="mt-3 text-xs font-semibold text-amber-400">Margin below guardrail</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6">
        <h2 className="text-base font-semibold text-white">AI summary</h2>
        <p className="mt-2 text-sm text-emerald-100">{suggestion.summary.textSummary}</p>
        <ul className="mt-3 list-disc pl-6 text-sm text-emerald-200">
          {suggestion.summary.why.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-emerald-200">
          {suggestion.summary.actions.map((action) => (
            <span key={action.label} className="rounded-full border border-emerald-400/40 px-3 py-1">
              {action.label}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6">
        <h2 className="text-base font-semibold text-white">Guardrails</h2>
        <ul className="mt-3 list-disc pl-6 text-sm text-amber-100">
          {suggestion.guardrails.length ? (
            suggestion.guardrails.map((item) => <li key={item}>{item}</li>)
          ) : (
            <li>No guardrail warnings</li>
          )}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center justify-between px-5 py-3">
            <h3 className="text-sm font-semibold text-white">Driver pool</h3>
            <span className="text-xs uppercase tracking-wide text-zinc-500">{drivers.length} active</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-900/60 text-zinc-400">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Home base</th>
                  <th className="px-3 py-2 text-right">Hours</th>
                  <th className="px-3 py-2 text-right">On-time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-zinc-900/50">
                    <td className="px-3 py-2 text-white">{driver.name}</td>
                    <td className="px-3 py-2 text-zinc-300">{driver.homeBase ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-zinc-300">
                      {formatNumber(driver.hoursAvailableToday ?? null)}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-300">
                      {formatNumber((driver.onTimeScore ?? 0.8) * 100, 0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center justify-between px-5 py-3">
            <h3 className="text-sm font-semibold text-white">Available units</h3>
            <span className="text-xs uppercase tracking-wide text-zinc-500">{units.length} total</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-900/60 text-zinc-400">
                <tr>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Home base</th>
                  <th className="px-3 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-zinc-900/50">
                    <td className="px-3 py-2 text-white">{unit.code}</td>
                    <td className="px-3 py-2 text-zinc-300">{unit.type ?? "—"}</td>
                    <td className="px-3 py-2 text-zinc-300">{unit.homeBase ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-zinc-300">{unit.status ?? "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60">
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="text-sm font-semibold text-white">Recent rates</h3>
          <span className="text-xs uppercase tracking-wide text-zinc-500">Top 5</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-900/60 text-zinc-400">
              <tr>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Zone</th>
                <th className="px-3 py-2 text-right">RPM</th>
                <th className="px-3 py-2 text-right">Fuel surcharge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50">
              {rates.map((rate) => (
                <tr key={rate.id} className="hover:bg-zinc-900/50">
                  <td className="px-3 py-2 text-white">{rate.type ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-300">{rate.zone ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-zinc-300">{formatNumber(rate.rpm ? Number(rate.rpm) : null)}</td>
                  <td className="px-3 py-2 text-right text-zinc-300">
                    {formatNumber(rate.fuelSurcharge ? Number(rate.fuelSurcharge) : null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
