import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import Section from "@/src/components/ui/section";
import Stat from "@/src/components/ui/stat";
import { getAnalyticsKpis } from "@/src/server/analytics"; // keep as is
import { getLaneRate } from "@/src/server/integrations/marketRates";
import { fetchRegulatoryUpdates } from "@/src/server/integrations/compliance";
import { NAV_SECTIONS } from "@/src/lib/navigation";

const quickActions = [
  {
    label: "Book a Load",
    href: "/book",
    description: "Qualify, price, and assign freight with AI assistance.",
    accent: "bg-emerald-500/30",
  },
  {
    label: "Plan & Price",
    href: "/plan",
    description: "Scenario-plan coverage and margin guardrails before dispatch.",
    accent: "bg-sky-500/30",
  },
  {
    label: "Monitor Trips",
    href: "/trips",
    description: "Track milestones, risks, and communications in flight.",
    accent: "bg-amber-500/30",
  },
  {
    label: "Orders Intake",
    href: "/orders",
    description: "OCR documents, email queues, and CSV uploads in one workspace.",
    accent: "bg-purple-500/30",
  },
  {
    label: "Fleet Overview",
    href: "/fleet",
    description: "See power units, drivers, and lane assignments at a glance.",
    accent: "bg-rose-500/30",
  },
  {
    label: "Analytics",
    href: "/analytics",
    description: "Margin, dwell, and service guardrails with drill-down analytics.",
    accent: "bg-indigo-500/30",
  },
];

export default async function DashboardPage() {
  const [kpis, laneRate, regulatory] = await Promise.all([
    getAnalyticsKpis(),
    getLaneRate("GTA", "CHI"),
    fetchRegulatoryUpdates(),
  ]);
  const { waitingOrders, atRiskTrips, avgMargin, onTimeEvents } = kpis;
  const complianceHighlight = regulatory.find((item) => item.severity !== "info") ?? regulatory[0] ?? null;

  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.8fr]">
        <Card className="border border-slate-800/70 bg-slate-900/60 shadow-lg shadow-black/40">
          <CardHeader>
            <CardTitle>Where do you want to focus?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-300">
              Use the shortcuts below to jump into core workflows across the platform. Each path keeps
              context intact so handoffs between intake, planning, dispatch, and analytics stay tight.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group relative overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/70 p-4 transition hover:border-emerald-500/60"
                >
                  <div className={`absolute inset-0 opacity-20 blur-2xl ${action.accent}`} />
                  <div className="relative">
                    <div className="text-sm font-semibold text-slate-100 group-hover:text-white">
                      {action.label}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-800/70 bg-slate-900/60 shadow-lg shadow-black/40">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-neutral-200">Live Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                RPM GTA→CHI trending +7% w/w · Spot {laneRate.rpm.toFixed(2)} {laneRate.source} ({
                  laneRate.lastUpdated.toLocaleTimeString()
                })
              </li>
              {complianceHighlight ? (
                <li>
                  {complianceHighlight.rule}: {complianceHighlight.change} (effective {complianceHighlight.effective})
                </li>
              ) : (
                <li>No active compliance alerts.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Section title="Explore the platform">
        {NAV_SECTIONS.map((section) => (
          <Card
            key={section.title}
            className="border border-slate-800/70 bg-slate-900/60 shadow-lg shadow-black/30 transition hover:border-emerald-500/60"
          >
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-300">{section.blurb}</p>
              <div className="flex flex-wrap gap-2">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full border border-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-emerald-500/60 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </Section>

      {/* KPI row */}
      <Section title="Today’s KPIs">
        <Card>
          <CardHeader><CardTitle>Orders Waiting</CardTitle></CardHeader>
          <CardContent>
            <Stat value={waitingOrders ?? 0} label="Needing qualification or pricing today" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>At-Risk Trips</CardTitle></CardHeader>
          <CardContent>
            <Stat value={atRiskTrips ?? 0} label="Delay risk ≥ 30%" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Avg Margin This Week</CardTitle></CardHeader>
          <CardContent>
            <Stat value={`${Math.round((avgMargin ?? 0) * 100) / 100}%`} label="Avg revenue vs cost" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>On-Time Events</CardTitle></CardHeader>
          <CardContent>
            <Stat value={onTimeEvents ?? 0} label="Planned commitments met" />
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
