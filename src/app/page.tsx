// Acceptance criteria:
// - Dashboard shows quick navigation cards to major workflows.
// - High-level KPIs display counts/averages for orders, at-risk trips, margin, on-time %.
// - Data is loaded server-side and Prisma Decimals are converted before render.
// - Links route to intake, planning, dispatch, map, analytics, admin.

import Link from "next/link";

import { getAnalyticsKpis } from "@/server/analytics";
import prisma from "@/lib/prisma";

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "--";
  return `${(value * 100).toFixed(1)}%`;
}

export default async function DashboardPage() {
  const [{ waitingOrders, atRiskTrips, avgMargin, onTimeEvents }, recentOrders] = await Promise.all([
    getAnalyticsKpis(),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section className="grid gap-4 text-sm text-zinc-300 md:grid-cols-4">
        <Link href="/orders/new" className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-sky-500">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Intake</p>
          <p className="mt-2 text-lg font-semibold text-white">Orders Intake</p>
          <p className="mt-1 text-xs text-zinc-400">OCR, email, CSV capture workspace</p>
        </Link>
        <Link href="/orders" className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-sky-500">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Plan</p>
          <p className="mt-2 text-lg font-semibold text-white">Plan & Price</p>
          <p className="mt-1 text-xs text-zinc-400">Driver, unit, margin guardrails</p>
        </Link>
        <Link href="/fleet/map" className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-sky-500">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Fleet</p>
          <p className="mt-2 text-lg font-semibold text-white">Live Map</p>
          <p className="mt-1 text-xs text-zinc-400">Available units & active lanes</p>
        </Link>
        <Link href="/analytics" className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-sky-500">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Insights</p>
          <p className="mt-2 text-lg font-semibold text-white">Analytics</p>
          <p className="mt-1 text-xs text-zinc-400">Margin, dwell, guardrails</p>
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Orders waiting</p>
          <p className="mt-2 text-3xl font-semibold text-white">{waitingOrders}</p>
          <p className="mt-2 text-xs text-zinc-400">Orders needing qualification or pricing today</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
          <p className="text-xs uppercase tracking-wide text-zinc-500">At-risk trips</p>
          <p className="mt-2 text-3xl font-semibold text-white">{atRiskTrips}</p>
          <p className="mt-2 text-xs text-zinc-400">Delay risk ≥ 30%</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Avg margin this week</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatPercent(avgMargin)}</p>
          <p className="mt-2 text-xs text-zinc-400">Based on booked revenue vs cost</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
          <p className="text-xs uppercase tracking-wide text-zinc-500">On-time events</p>
          <p className="mt-2 text-3xl font-semibold text-white">{onTimeEvents}</p>
          <p className="mt-2 text-xs text-zinc-400">Today&apos;s PU/DEL on-time confirmations</p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Recent Orders</h2>
            <p className="text-sm text-zinc-400">Latest five orders captured</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/orders/new" className="rounded-lg bg-sky-500/20 px-4 py-2 font-medium text-sky-300 hover:bg-sky-500/30">
              Create Order
            </Link>
            <Link href="/dispatch/exceptions" className="rounded-lg bg-zinc-800 px-4 py-2 text-zinc-200 hover:bg-zinc-700">
              Exceptions Board
            </Link>
            <Link href="/admin/rules" className="rounded-lg bg-zinc-800 px-4 py-2 text-zinc-200 hover:bg-zinc-700">
              Admin Rules
            </Link>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-900/60 text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Route</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-medium text-white">
                    <Link href={`/orders/${order.id}/plan`}>{order.customer}</Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {order.origin} → {order.destination}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{order.status}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
