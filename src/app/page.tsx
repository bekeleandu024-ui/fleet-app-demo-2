import { ReactNode } from "react";
import Link from "next/link";

import { getAnalyticsKpis } from "@/server/analytics";

type NavLink = {
  href: string;
  label: string;
  description: string;
};

type KpiCard = {
  label: string;
  description: string;
  href: string;
  value: ReactNode;
  accent?: string;
};

type FlowSection = {
  id: string;
  eyebrow: string;
  title: string;
  actions: Array<{ href: string; label: string; description?: string }>;
};

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

const navLinks: NavLink[] = [
  {
    href: "/orders",
    label: "Orders intake",
    description: "Review inbound quotes",
  },
  {
    href: "/rates",
    label: "Plan & Price",
    description: "Margin guardrails",
  },
  {
    href: "/map",
    label: "Live Map",
    description: "Active units",
  },
];

export default async function DashboardPage() {
  const { waitingOrders, atRiskTrips, marginWeek, onTimeEvents } = await getAnalyticsKpis();

  const kpiCards: KpiCard[] = [
    {
      label: "Orders Waiting",
      description: "Orders needing qualification or pricing",
      href: "/orders",
      value: <span>{formatCount(waitingOrders)}</span>,
    },
    {
      label: "At-Risk Trips",
      description: "Delay risk ≥ 30%",
      href: "/trips",
      value: <span>{formatCount(atRiskTrips)}</span>,
    },
    {
      label: "Avg Margin This Week",
      description: "Blended margin on active trips",
      href: "/rates",
      value: <span>{formatMargin(marginWeek)}</span>,
      accent: getMarginAccent(marginWeek),
    },
    {
      label: "On-Time Events",
      description: "PU / DEL on-time rate",
      href: "/analytics",
      value: <span>{formatPercent(onTimeEvents?.onTimePct)}</span>,
    },
  ];

  const flowSections: FlowSection[] = [
    {
      id: "orders",
      eyebrow: "Intake",
      title: "Orders Intake",
      actions: [
        { href: "/orders/new", label: "New Order" },
        { href: "/orders", label: "OCR / Email / CSV workspace" },
      ],
    },
    {
      id: "plan",
      eyebrow: "Plan",
      title: "Plan & Price",
      actions: [
        { href: "/rates", label: "Rate & assign guardrails" },
        { href: "/drivers", label: "Driver/unit suggestion rules" },
      ],
    },
    {
      id: "map",
      eyebrow: "Fleet",
      title: "Live Map",
      actions: [
        { href: "/map", label: "Map & active units" },
        { href: "/units", label: "Available units" },
      ],
    },
    {
      id: "insights",
      eyebrow: "Insights",
      title: "Analytics",
      actions: [{ href: "/analytics", label: "Margin, dwell, guardrails" }],
    },
  ];

  return (
    <main className="flex flex-col gap-12" aria-labelledby="dashboard-title">
      <header className="flex flex-col justify-between gap-8 rounded-3xl border border-neutral-800 bg-neutral-950/70 p-6 shadow-xl shadow-black/40 backdrop-blur">
        <div className="max-w-xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-400/80">Fleet Operations</p>
          <h1 id="dashboard-title" className="text-3xl font-semibold text-neutral-100">
            Dashboard
          </h1>
          <p className="text-sm text-neutral-400">
            Monitor intake, planning, and live operations in one responsive view.
          </p>
        </div>
        <nav
          aria-label="Primary dashboard views"
          className="-mb-2 flex flex-wrap gap-3 text-sm"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group inline-flex min-w-[8rem] flex-1 items-center justify-between gap-2 rounded-full border border-neutral-800 bg-neutral-900/80 px-4 py-2 text-neutral-200 shadow-inner shadow-black/40 transition duration-200 hover:border-neutral-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400/70 focus-visible:outline-offset-2"
            >
              <span className="font-medium">{link.label}</span>
              <span className="text-[11px] text-neutral-500 transition duration-200 group-hover:text-neutral-300">
                {link.description}
              </span>
            </Link>
          ))}
        </nav>
      </header>

      <section aria-labelledby="kpi-heading" className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="kpi-heading" className="text-lg font-semibold text-neutral-100">
              Key performance indicators
            </h2>
            <p className="text-sm text-neutral-400">Signals that drive action across the fleet.</p>
          </div>
          <Link
            href="/analytics"
            className="hidden items-center gap-2 rounded-full border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-200 transition duration-200 hover:border-neutral-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400/70 focus-visible:outline-offset-2 md:inline-flex"
          >
            View analytics overview
            <span aria-hidden className="text-base leading-none">
              ›
            </span>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <article
              key={card.label}
              className="group rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900/80 via-neutral-950/40 to-neutral-950/70 p-5 shadow-lg shadow-black/40 transition duration-200 hover:border-neutral-700 hover:shadow-black/60"
            >
              <div className="text-sm font-medium text-neutral-300">{card.label}</div>
              <div
                className={`mt-4 text-3xl font-semibold tracking-tight text-neutral-100 ${card.accent ?? ""}`.trim()}
              >
                {card.value}
              </div>
              <p className="mt-3 text-xs text-neutral-400">{card.description}</p>
              <Link
                href={card.href}
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-neutral-300 transition duration-200 hover:text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400/70 focus-visible:outline-offset-2"
              >
                View
                <span aria-hidden className="translate-y-[1px] text-base leading-none">›</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="flows-heading" className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="flows-heading" className="text-lg font-semibold text-neutral-100">
              Workflow shortcuts
            </h2>
            <p className="text-sm text-neutral-400">Jump into the flows the team touches most often.</p>
          </div>
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition duration-200 hover:bg-emerald-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400/70 focus-visible:outline-offset-2"
          >
            Start a new order
            <span aria-hidden className="translate-y-[1px] text-base leading-none">›</span>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {flowSections.map((section) => (
            <article
              key={section.id}
              className="flex h-full flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5 shadow-lg shadow-black/30 transition duration-200 hover:border-neutral-700 hover:shadow-black/50"
              aria-labelledby={`${section.id}-title`}
            >
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-500">
                  {section.eyebrow}
                </p>
                <h3 id={`${section.id}-title`} className="text-lg font-semibold text-neutral-100">
                  {section.title}
                </h3>
              </div>
              <ul className="mt-6 space-y-2" aria-label={`${section.title} quick actions`}>
                {section.actions.map((action) => (
                  <li key={action.href}>
                    <Link
                      href={action.href}
                      className="group flex items-center justify-between rounded-xl border border-transparent px-3 py-2 text-sm text-neutral-300 transition duration-200 hover:border-neutral-800 hover:bg-neutral-900/60 hover:text-white focus-visible:border-neutral-700 focus-visible:bg-neutral-900/60 focus-visible:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400/70 focus-visible:outline-offset-2"
                    >
                      <span className="font-medium">{action.label}</span>
                      <span aria-hidden className="text-base text-neutral-500 transition duration-200 group-hover:translate-x-1 group-hover:text-neutral-200">
                        ›
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
