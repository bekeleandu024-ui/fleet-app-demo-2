// Acceptance criteria:
// - Displays planned vs actual miles, margin variance, cost breakdown, and suggested accessorials.
// - Finalize button runs close-out summary and mark closed action updates trip status.
// - Suggestion reasons are shown with apply/dismiss cues.
// - No Prisma.Decimal values are passed directly to the client.

import { redirect } from "next/navigation";
import Link from "next/link";

import prisma from "@/lib/prisma";
import { finalizeTripCloseout, markTripClosed } from "@/server/trip-closeout";

const markClosedAction = async (formData: FormData) => {
  "use server";
  const tripId = formData.get("tripId");
  if (typeof tripId !== "string" || !tripId) {
    throw new Error("Trip id missing");
  }
  await markTripClosed(tripId);
  redirect(`/trips/${tripId}`);
};

export default async function CloseTripPage({ params }: { params: { id: string } }) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      order: true,
      events: true,
    },
  });

  if (!trip) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm text-zinc-400">Trip not found.</div>;
  }

  const closeout = await finalizeTripCloseout(trip.id);
  const cost = closeout.cost.costBreakdown;

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Trip close-out</h1>
            <p className="text-sm text-zinc-300">
              {trip.order?.customer ?? "Unassigned"} — {trip.order?.origin ?? "?"} → {trip.order?.destination ?? "?"}
            </p>
          </div>
          <form action={markClosedAction} className="flex flex-col gap-2 md:flex-row md:items-center">
            <input type="hidden" name="tripId" value={trip.id} />
            <button
              type="submit"
              className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30"
            >
              Mark closed
            </button>
            <Link
              href={`/trips/${trip.id}/track`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500"
            >
              Back to tracking
            </Link>
          </form>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-300">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Miles variance</p>
          <p className="mt-2 text-lg font-semibold text-white">
            Planned {closeout.plannedMiles ?? 0} · Actual {closeout.actualMiles ?? 0}
          </p>
        </div>
       <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-300">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Margin variance</p>
          <p className="mt-2 text-lg font-semibold text-white">
            Planned {((closeout.plannedMarginPct ?? 0) * 100).toFixed(1)}% · Final
            {((closeout.finalMarginPct ?? 0) * 100).toFixed(1)}%
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-base font-semibold text-white">Cost breakdown</h2>
        <div className="mt-4 grid gap-3 text-sm text-zinc-300 md:grid-cols-2">
          <p>Wage CPM: {cost.wageCPM.toFixed(2)}</p>
          <p>Rolling CPM: {cost.rollingCPM.toFixed(2)}</p>
          <p>Add-ons CPM: {cost.addOnsCPM.toFixed(2)}</p>
          <p>Fixed CPM: {cost.fixedCPM.toFixed(2)}</p>
          <p>Total CPM: {cost.totalCPM.toFixed(2)}</p>
          <p>Total cost: {cost.totalCost.toFixed(2)}</p>
          <p>Revenue: {cost.revenue?.toFixed(2) ?? "--"}</p>
          <p>Profit: {cost.profit?.toFixed(2) ?? "--"}</p>
          <p>Margin: {cost.marginPct !== null ? `${(cost.marginPct * 100).toFixed(1)}%` : "--"}</p>
        </div>
      </section>

      <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6 text-sm text-emerald-100">
        <h2 className="text-base font-semibold text-white">AI summary</h2>
        <p className="mt-2 text-sm text-emerald-100">{closeout.summary.textSummary}</p>
        <ul className="mt-3 list-disc pl-6 text-emerald-200">
          {closeout.summary.why.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-emerald-200">
          {closeout.summary.actions.map((action) => (
            <span key={action.label} className="rounded-full border border-emerald-400/40 px-3 py-1">
              {action.label}
            </span>
          ))}
        </div>
      </section>

      {closeout.suggestedAccessorials.length > 0 && (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6 text-sm text-amber-100">
          <h2 className="text-base font-semibold text-white">Suggested accessorials</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {closeout.suggestedAccessorials.map((item) => (
              <div key={item.label} className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs text-amber-200">{item.reason}</p>
                <p className="mt-2 text-sm text-amber-100">Amount ${item.amount.toFixed(2)}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-amber-200">
                  {item.actions.map((action) => (
                    <span key={action.label} className="rounded-full border border-amber-400/40 px-3 py-1">
                      {action.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
