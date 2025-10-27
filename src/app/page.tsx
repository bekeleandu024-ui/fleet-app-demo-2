import Link from "next/link";

import { getAnalyticsKpis } from "@/server/analytics";

function formatCount(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }
  return value.toLocaleString();
}

function formatPercent(value: number | null | undefined, digits = 0) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }
  return `${(value * 100).toFixed(digits)}%`;
}

function formatMargin(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function getMarginAccent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "text-neutral-100";
  }
  if (value >= 0.15) return "text-emerald-400";
  if (value >= 0.08) return "text-amber-400";
  return "text-rose-400";
}

export default async function DashboardPage() {
  const { waitingOrders, atRiskTrips, marginWeek, onTimeEvents } = await getAnalyticsKpis();

  const onTimePct = onTimeEvents?.onTimePct;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
        <div>
          <h1 className="text-xl font-semibold text-neutral-100">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-400">Live ops snapshot</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/orders"
            className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 font-medium text-neutral-200 transition-colors duration-200 hover:border-neutral-700 hover:text-white"
          >
            Orders intake
          </Link>
          <Link
            href="/rates"
            className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 font-medium text-neutral-200 transition-colors duration-200 hover:border-neutral-700 hover:text-white"
          >
            Plan &amp; Price
          </Link>
          <Link
            href="/map"
            className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 font-medium text-neutral-200 transition-colors duration-200 hover:border-neutral-700 hover:text-white"
          >
            Live Map
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg shadow-black/40 backdrop-blur-sm">
          <div className="text-sm font-medium text-neutral-300">Orders Waiting</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-neutral-100">{formatCount(waitingOrders)}</div>
          <p className="mt-2 text-xs text-neutral-400">Orders needing qualification or pricing</p>
          <Link
            href="/orders"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-neutral-300 transition-colors duration-200 hover:text-neutral-100"
          >
            View <span aria-hidden>›</span>
          </Link>
        </article>
        <article className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg shadow-black/40 backdrop-blur-sm">
          <div className="text-sm font-medium text-neutral-300">At-Risk Trips</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-neutral-100">{formatCount(atRiskTrips)}</div>
          <p className="mt-2 text-xs text-neutral-400">Delay risk ≥ 30%</p>
          <Link
            href="/trips"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-neutral-300 transition-colors duration-200 hover:text-neutral-100"
          >
            View <span aria-hidden>›</span>
          </Link>
        </article>
        <article className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg shadow-black/40 backdrop-blur-sm">
          <div className="text-sm font-medium text-neutral-300">Avg Margin This Week</div>
          <div className={`mt-3 text-3xl font-semibold tracking-tight ${getMarginAccent(marginWeek)}`}>
            {formatMargin(marginWeek)}
          </div>
          <p className="mt-2 text-xs text-neutral-400">Blended margin on active trips</p>
          <Link
            href="/rates"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-neutral-300 transition-colors duration-200 hover:text-neutral-100"
          >
            View <span aria-hidden>›</span>
          </Link>
        </article>
        <article className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg shadow-black/40 backdrop-blur-sm">
          <div className="text-sm font-medium text-neutral-300">On-Time Events</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-neutral-100">{formatPercent(onTimePct)}</div>
          <p className="mt-2 text-xs text-neutral-400">PU / DEL on-time rate</p>
          <Link
            href="/analytics"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-neutral-300 transition-colors duration-200 hover:text-neutral-100"
          >
            View <span aria-hidden>›</span>
          </Link>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40 backdrop-blur-sm">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Intake</span>
            <h2 className="text-lg font-semibold text-neutral-100">Orders Intake</h2>
          </div>
          <div className="my-3 h-px bg-neutral-800" />
          <div className="space-y-1">
            <Link
              href="/orders/new"
              className="group flex items-center justify-between py-1 text-sm text-neutral-200 transition-colors duration-200"
            >
              <span className="transition-colors duration-200 group-hover:text-white">New Order</span>
              <span className="text-neutral-500 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white">›</span>
            </Link>
            <Link
              href="/orders"
              className="group flex items-center justify-between py-1 text-sm text-neutral-200 transition-colors duration-200"
            >
              <span className="transition-colors duration-200 group-hover:text-white">OCR / Email / CSV workspace</span>
              <span className="text-neutral-500 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white">›</span>
            </Link>
          </div>
        </article>

        <article className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40 backdrop-blur-sm">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Plan</span>
            <h2 className="text-lg font-semibold text-neutral-100">Plan &amp; Price</h2>
          </div>
          <div className="my-3 h-px bg-neutral-800" />
          <div className="space-y-1">
            <Link
              href="/rates"
              className="group flex items-center justify-between py-1 text-sm text-neutral-200 transition-colors duration-200"
            >
              <span className="transition-colors duration-200 group-hover:text-white">Rate &amp; assign guardrails</span>
              <span className="text-neutral-500 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white">›</span>
            </Link>
            <Link
              href="/drivers"
              className="group flex items-center justify-between py-1 text-sm text-neutral-200 transition-colors duration-200"
            >
              <span className="transition-colors duration-200 group-hover:text-white">Driver/unit suggestion rules</span>
              <span className="text-neutral-500 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white">›</span>
            </Link>
          </div>
        </article>

        <article className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40 backdrop-blur-sm">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Fleet</span>
            <h2 className="text-lg font-semibold text-neutral-100">Live Map</h2>
          </div>
          <div className="my-3 h-px bg-neutral-800" />
          <div className="space-y-1">
            <Link
              href="/map"
              className="group flex items-center justify-between py-1 text-sm text-neutral-200 transition-colors duration-200"
            >
              <span className="transition-colors duration-200 group-hover:text-white">Map &amp; active units</span>
              <span className="text-neutral-500 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white">›</span>
            </Link>
            <Link
              href="/units"
              className="group flex items-center justify-between py-1 text-sm text-neutral-200 transition-colors duration-200"
            >
              <span className="transition-colors duration-200 group-hover:text-white">Available units</span>
              <span className="text-neutral-500 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white">›</span>
            </Link>
          </div>
        </article>

        <article className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40 backdrop-blur-sm">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Insights</span>
            <h2 className="text-lg font-semibold text-neutral-100">Analytics</h2>
          </div>
          <div className="my-3 h-px bg-neutral-800" />
          <div className="space-y-1">
            <Link
              href="/analytics"
              className="group flex items-center justify-between py-1 text-sm text-neutral-200 transition-colors duration-200"
            >
              <span className="transition-colors duration-200 group-hover:text-white">Margin, dwell, guardrails</span>
              <span className="text-neutral-500 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white">›</span>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
