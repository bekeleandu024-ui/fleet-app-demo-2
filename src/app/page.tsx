import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import Section from "@/src/components/ui/section";
import Stat from "@/src/components/ui/stat";
import { getAnalyticsKpis } from "@/src/server/analytics"; // keep as is

export default async function DashboardPage() {
  const { waitingOrders, atRiskTrips, avgMargin, onTimeEvents } = await getAnalyticsKpis();

  return (
    <div className="space-y-8">
      {/* Quick Links by area */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Intake</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <Link href="/orders" className="nav-link no-underline text-slate-200 inline-block">Orders Intake</Link>
            <Link href="/intake" className="nav-link no-underline text-slate-200 inline-block">OCR, email, CSV workspace</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Plan</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <Link href="/plan" className="nav-link no-underline text-slate-200 inline-block">Plan &amp; Price</Link>
            <Link
              href="/plan"
              className="nav-link no-underline text-slate-200 inline-block"
            >
              Driver, unit, margin guardrails
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Fleet</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <Link href="/fleet" className="nav-link no-underline text-slate-200 inline-block">Live Map</Link>
            <Link
              href="/fleet"
              className="nav-link no-underline text-slate-200 inline-block"
            >
              Available units &amp; active lanes
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Insights</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <Link href="/insights" className="nav-link no-underline text-slate-200 inline-block">Analytics</Link>
            <Link
              href="/insights"
              className="nav-link no-underline text-slate-200 inline-block"
            >
              Margin, dwell, guardrails
            </Link>
          </CardContent>
        </Card>

        <Link
          href="/book"
          className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40 transition-colors hover:border-emerald-500/60 hover:shadow-emerald-900/30"
        >
          <div className="text-sm font-semibold text-neutral-200">Book</div>
          <div className="mt-2 text-xs text-neutral-400">
            AI-assisted dispatch console (select qualified order, apply rate &amp; assign)
          </div>
        </Link>
      </div>

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
