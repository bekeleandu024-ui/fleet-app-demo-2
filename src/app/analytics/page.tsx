// Acceptance criteria:
// - Displays KPIs and weekly insights with why/actions context.
// - Uses server helpers to retrieve data; no Prisma.Decimal leaks to client.
// - Insights show recommended actions with apply/dismiss badges.

import prisma from "@/lib/prisma";
import { getWeeklyInsights, getAnalyticsKpis } from "@/server/analytics";

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "--";
  return `${(value * 100).toFixed(1)}%`;
}

export default async function AnalyticsPage() {
  const [kpis, insights, dwellHotspots] = await Promise.all([
    getAnalyticsKpis(),
    getWeeklyInsights(),
    prisma.event.groupBy({
      by: ["location"],
      _count: { id: true },
      where: { type: { contains: "DWELL" } },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="text-sm text-zinc-400">Margin, service, and dwell performance</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Orders waiting</p>
          <p className="mt-2 text-3xl font-semibold text-white">{kpis.waitingOrders}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">At-risk trips</p>
          <p className="mt-2 text-3xl font-semibold text-white">{kpis.atRiskTrips}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Avg margin</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatPercent(kpis.avgMargin)}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">On-time events today</p>
          <p className="mt-2 text-3xl font-semibold text-white">{kpis.onTimeEvents}</p>
        </div>
      </section>

      <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6">
        <h2 className="text-base font-semibold text-white">Weekly insights</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {insights.map((insight) => (
            <div key={insight.title} className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
              <p className="mt-1 text-sm text-emerald-100">{insight.detail}</p>
              <p className="mt-3 text-xs text-emerald-200">{insight.summary.textSummary}</p>
              <ul className="mt-2 list-disc pl-5 text-xs text-emerald-200">
                {insight.summary.why.map((why) => (
                  <li key={why}>{why}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-emerald-200">
                {insight.summary.actions.map((action) => (
                  <span key={action.label} className="rounded-full border border-emerald-400/40 px-3 py-1">
                    {action.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-base font-semibold text-white">Dwell hotspots</h2>
        <table className="mt-4 min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900/60 text-zinc-400">
            <tr>
              <th className="px-4 py-2 text-left">Location</th>
              <th className="px-4 py-2 text-right">Events</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/60">
            {dwellHotspots.map((row) => (
              <tr key={row.location ?? "unknown"} className="hover:bg-zinc-900/50">
                <td className="px-4 py-2 text-white">{row.location ?? "Unknown"}</td>
                <td className="px-4 py-2 text-right text-zinc-300">{row._count.id}</td>
              </tr>
            ))}
            {dwellHotspots.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-zinc-400">
                  No dwell events recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
