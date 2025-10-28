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

function formatStopLocation(stop: {
  name: string | null;
  city: string | null;
  state: string | null;
}) {
  const parts = [stop.name, stop.city, stop.state].filter((part) => part && part.trim().length > 0);
  if (parts.length === 0) {
    return "Unknown";
  }
  return parts.join(", ");
}

export default async function AnalyticsPage() {
  const [kpis, insights, dwellEvents] = await Promise.all([
    getAnalyticsKpis(),
    getWeeklyInsights(),
    prisma.event.findMany({
      where: { type: { contains: "DWELL" } },
      include: {
        stop: {
          select: {
            name: true,
            city: true,
            state: true,
          },
        },
      },
    }),
  ]);

  const dwellHotspots = Object.entries(
    dwellEvents.reduce<Record<string, number>>((acc, event) => {
      const location = event.stop ? formatStopLocation(event.stop) : "Unknown";
      acc[location] = (acc[location] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([location, count]) => ({
      location,
      _count: { id: count },
    }))
    .sort((a, b) => b._count.id - a._count.id)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-6 shadow-card backdrop-blur">
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="text-sm text-slate-400">Margin, service, and dwell performance</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-card backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-slate-400">Orders waiting</p>
          <p className="mt-2 text-3xl font-semibold text-white">{kpis.waitingOrders}</p>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-card backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-slate-400">At-risk trips</p>
          <p className="mt-2 text-3xl font-semibold text-white">{kpis.atRiskTrips}</p>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-card backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-slate-400">Avg margin</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatPercent(kpis.avgMargin)}</p>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-card backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-slate-400">On-time events today</p>
          <p className="mt-2 text-3xl font-semibold text-white">{kpis.onTimeEvents}</p>
        </div>
      </section>

      <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6 shadow-[0_20px_50px_-25px_rgba(16,185,129,0.4)] backdrop-blur">
        <h2 className="text-base font-semibold text-white">Weekly insights</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {insights.map((insight) => (
            <div
              key={insight.title}
              className="rounded-lg border border-emerald-400/50 bg-emerald-500/15 p-4 text-sm text-emerald-100 shadow-inner"
            >
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

      <section className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-6 shadow-card backdrop-blur">
        <h2 className="text-base font-semibold text-white">Dwell hotspots</h2>
        <table className="mt-4 min-w-full divide-y divide-slate-800/60 text-sm">
          <thead className="bg-slate-900/60 text-slate-400">
            <tr>
              <th className="px-4 py-2 text-left">Location</th>
              <th className="px-4 py-2 text-right">Events</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/50">
            {dwellHotspots.map((row) => (
              <tr key={row.location} className="transition hover:bg-slate-900/50">
                <td className="px-4 py-2 text-white">{row.location}</td>
                <td className="px-4 py-2 text-right text-slate-300">{row._count.id}</td>
              </tr>
            ))}
            {dwellHotspots.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
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
