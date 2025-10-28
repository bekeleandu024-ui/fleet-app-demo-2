import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import Stat from "@/src/components/ui/stat";
import prisma from "@/src/lib/prisma";
import { getAnalyticsKpis } from "@/src/server/analytics";
import { fetchRegulatoryUpdates } from "@/src/server/integrations/compliance";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function formatWindow(start?: Date | null, end?: Date | null) {
  if (!start && !end) {
    return "Scheduling TBD";
  }

  const format = (value: Date | null | undefined) =>
    value
      ? new Date(value).toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : null;

  const startLabel = format(start);
  const endLabel = format(end);

  if (startLabel && endLabel) {
    return `${startLabel} – ${endLabel}`;
  }

  return startLabel ?? endLabel ?? "Scheduling TBD";
}

function formatCommitment(value?: Date | null) {
  if (!value) return "Unscheduled";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const NAV_SECTIONS = [
  {
    title: "Operations",
    description: "Move freight, clear blockers, and keep assignments aligned.",
    links: [
      { label: "Dispatch Console", href: "/orders", blurb: "Qualify, dispatch, and audit orders." },
      { label: "Exception Board", href: "/dispatch/exceptions", blurb: "Triage trips with active alerts." },
      { label: "Driver Check-ins", href: "/drivers", blurb: "Daily contact summary and hours available." },
      { label: "Live Fleet Map", href: "/map", blurb: "Track movements and dwell in real time." },
    ],
  },
  {
    title: "Planning",
    description: "Balance supply, coverage, and profitability before go-live.",
    links: [
      { label: "Plan Scenarios", href: "/plan", blurb: "Run what-if coverage plays." },
      { label: "Roster Builder", href: "/fleet", blurb: "Align drivers, units, and regions." },
      { label: "Rate Desk", href: "/rates", blurb: "Surface contract vs. spot benchmarks." },
      { label: "Available Units", href: "/units", blurb: "See capacity opening windows." },
    ],
  },
  {
    title: "Insights",
    description: "Surface what matters from signal overload and track follow-ups.",
    links: [
      { label: "Analytics Console", href: "/analytics", blurb: "Margin, dwell, and service KPIs." },
      { label: "Trip Risk", href: "/trips", blurb: "Monitor commitments and ETA variance." },
      { label: "Order Intake", href: "/orders", blurb: "Where new freight is entering the queue." },
    ],
  },
  {
    title: "Governance",
    description: "Capture guardrails, audits, and compliance-ready workflows.",
    links: [
      { label: "Regulatory Feed", href: "/insights", blurb: "Rules updates & certifications." },
      { label: "AI Console", href: "/book", blurb: "See automation assists & approvals." },
      { label: "Admin Overview", href: "/admin", blurb: "Manage guardrails & business rules." },
    ],
  },
];

export default async function DispatchHomePage() {
  const [dispatchQueueRaw, commitmentsRaw, driversRaw, unitsRaw, kpis, regulatory] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: ["Qualified", "Booked", "ReadyToDispatch"] } },
      include: { trips: { select: { id: true, status: true } } },
      orderBy: { createdAt: "asc" },
      take: 6,
    }),
    prisma.trip.findMany({
      where: {
        status: { in: ["Booked", "Dispatched", "InProgress", "InTransit"] },
        nextCommitmentAt: { not: null },
      },
      include: { order: true },
      orderBy: { nextCommitmentAt: "asc" },
      take: 6,
    }),
    prisma.driver.findMany({
      where: { active: true },
      orderBy: [{ hoursAvailableToday: "desc" }, { name: "asc" }],
      take: 6,
    }),
    prisma.unit.findMany({
      where: { active: true, isOnHold: false },
      orderBy: [{ availableFrom: "asc" }, { code: "asc" }],
      take: 6,
    }),
    getAnalyticsKpis(),
    fetchRegulatoryUpdates(),
  ]);

  const dispatchQueue = dispatchQueueRaw.map((order) => ({
    id: order.id,
    customer: order.customer,
    origin: order.origin,
    destination: order.destination,
    status: order.status,
    window: formatWindow(order.puWindowStart, order.puWindowEnd),
    createdAt: order.createdAt.toLocaleString(),
    tripStatuses: order.trips.map((trip) => trip.status).join(", "),
  }));

  const commitments = commitmentsRaw.map((trip) => ({
    id: trip.id,
    driver: trip.driver,
    unit: trip.unit,
    lane: `${trip.order?.origin ?? "?"} → ${trip.order?.destination ?? "?"}`,
    commitment: formatCommitment(trip.nextCommitmentAt),
    marginPct: toNumber(trip.marginPct),
    delayRiskPct: toNumber(trip.delayRiskPct),
  }));

  const driverAvailability = driversRaw.map((driver) => ({
    id: driver.id,
    name: driver.name,
    homeBase: driver.homeBase ?? "",
    hoursAvailable: driver.hoursAvailableToday ?? 0,
    milesLast7d: driver.milesLast7d ?? 0,
    onTimeScore: driver.onTimeScore ?? null,
  }));

  const units = unitsRaw.map((unit) => ({
    id: unit.id,
    code: unit.code,
    type: unit.type ?? "",
    availableFrom: unit.availableFrom ? new Date(unit.availableFrom).toLocaleString() : "Now",
    status: unit.status ?? "Available",
    weeklyFixedCost: toNumber(unit.weeklyFixedCost),
  }));

  const complianceHighlight = regulatory.find((item) => item.severity !== "info") ?? regulatory[0] ?? null;
  const avgMarginDisplay = `${((kpis.avgMargin ?? 0) * 100).toFixed(1)}%`;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6 shadow-lg shadow-black/40">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Dispatch Control Center</h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Balance supply with commitments, respond to live risk, and push freight forward. Start your shift with a
              single view of what needs action right now.
            </p>
          </div>
          {complianceHighlight ? (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              <div className="text-xs uppercase tracking-wide text-amber-200">Regulatory highlight</div>
              <div className="mt-1 font-semibold text-white">{complianceHighlight.rule}</div>
              <div className="mt-1 text-xs text-amber-200">{complianceHighlight.change}</div>
              <div className="mt-2 text-[11px] uppercase tracking-wide text-amber-300">
                Effective {complianceHighlight.effective}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-800/60 bg-slate-950/40 p-4">
            <CardContent>
              <Stat value={kpis.waitingOrders ?? 0} label="Orders waiting" />
            </CardContent>
          </Card>
          <Card className="border-slate-800/60 bg-slate-950/40 p-4">
            <CardContent>
              <Stat value={kpis.atRiskTrips ?? 0} label="Trips flagged" />
            </CardContent>
          </Card>
          <Card className="border-slate-800/60 bg-slate-950/40 p-4">
            <CardContent>
              <Stat value={avgMarginDisplay} label="Avg margin" />
            </CardContent>
          </Card>
          <Card className="border-slate-800/60 bg-slate-950/40 p-4">
            <CardContent>
              <Stat value={kpis.onTimeEvents ?? 0} label="On-time events today" />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-5 shadow-inner">
            <div className="text-sm font-semibold text-white">{section.title}</div>
            <p className="mt-1 text-xs text-slate-300">{section.description}</p>
            <div className="mt-4 space-y-3">
              {section.links.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  className="block rounded-lg border border-slate-800/70 bg-slate-950/50 p-3 transition hover:border-emerald-500/50 hover:text-emerald-200"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-200">{link.label}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{link.blurb}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="border-slate-800/60 bg-slate-900/60 shadow-card">
          <CardHeader>
            <CardTitle>Dispatch queue</CardTitle>
            <Link href="/orders" className="text-xs text-emerald-300 hover:text-emerald-200">
              View all orders →
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {dispatchQueue.length === 0 ? (
              <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4 text-sm text-slate-400">
                No qualified freight is waiting for dispatch.
              </div>
            ) : (
              dispatchQueue.map((order) => (
                <div key={order.id} className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white">
                    <div className="font-semibold">{order.customer}</div>
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-[2px] text-[10px] uppercase tracking-wide text-emerald-200">
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-300">{order.origin} → {order.destination}</div>
                  <div className="mt-2 text-[11px] text-slate-400">{order.window}</div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>Created {order.createdAt}</span>
                    {order.tripStatuses ? <span>Trips: {order.tripStatuses || "--"}</span> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/orders/${order.id}`}
                      className="rounded border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200 transition hover:border-emerald-300/60 hover:text-emerald-100"
                    >
                      Review order
                    </Link>
                    <Link
                      href={`/orders/${order.id}/dispatch`}
                      className="rounded border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-200 transition hover:border-sky-300/60 hover:text-sky-100"
                    >
                      Draft dispatch
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800/60 bg-slate-900/60 shadow-card">
          <CardHeader>
            <CardTitle>Driver availability</CardTitle>
            <Link href="/drivers" className="text-xs text-emerald-300 hover:text-emerald-200">
              Driver roster →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-200">
            {driverAvailability.length === 0 ? (
              <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4 text-xs text-slate-400">
                No active drivers on file.
              </div>
            ) : (
              driverAvailability.map((driver) => (
                <div key={driver.id} className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-3">
                  <div className="flex items-center justify-between text-sm text-white">
                    <div className="font-semibold">{driver.name}</div>
                    <div className="text-[11px] text-slate-400">{driver.homeBase || "Remote"}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
                    <span>{driver.hoursAvailable.toFixed(1)} hrs available</span>
                    <span>{driver.milesLast7d} mi last 7d</span>
                  </div>
                  {driver.onTimeScore != null ? (
                    <div className="mt-1 text-[11px] text-emerald-200">
                      On-time score {(driver.onTimeScore * 100).toFixed(0)}%
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-800/60 bg-slate-900/60 shadow-card">
          <CardHeader>
            <CardTitle>Upcoming commitments</CardTitle>
            <Link href="/trips" className="text-xs text-emerald-300 hover:text-emerald-200">
              Trips board →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {commitments.length === 0 ? (
              <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4 text-sm text-slate-400">
                No upcoming commitments scheduled.
              </div>
            ) : (
              commitments.map((trip) => (
                <div key={trip.id} className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4 text-sm text-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-white">
                    <div className="font-semibold">{trip.driver || "Unassigned"}</div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">{trip.unit || "Unit TBD"}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-300">{trip.lane}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span className="rounded border border-slate-700/70 bg-slate-800/60 px-2 py-[1px] text-[10px] uppercase tracking-wide text-slate-200">
                      {trip.commitment}
                    </span>
                    {trip.marginPct != null ? (
                      <span className="rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-[1px] text-[10px] uppercase tracking-wide text-emerald-200">
                        Margin {(trip.marginPct * 100).toFixed(0)}%
                      </span>
                    ) : null}
                    {trip.delayRiskPct != null ? (
                      <span className="rounded border border-amber-400/40 bg-amber-500/10 px-2 py-[1px] text-[10px] uppercase tracking-wide text-amber-200">
                        Delay risk {(trip.delayRiskPct * 100).toFixed(0)}%
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800/60 bg-slate-900/60 shadow-card">
          <CardHeader>
            <CardTitle>Units coming available</CardTitle>
            <Link href="/units" className="text-xs text-emerald-300 hover:text-emerald-200">
              Units desk →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-200">
            {units.length === 0 ? (
              <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4 text-sm text-slate-400">
                No free capacity logged.
              </div>
            ) : (
              units.map((unit) => (
                <div key={unit.id} className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-3">
                  <div className="flex items-center justify-between text-white">
                    <div className="font-semibold">{unit.code}</div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">{unit.status}</div>
                  </div>
                  {unit.type ? <div className="mt-1 text-xs text-slate-300">{unit.type}</div> : null}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Available {unit.availableFrom}</span>
                    {unit.weeklyFixedCost != null ? <span>${unit.weeklyFixedCost.toFixed(0)}/wk fixed</span> : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
