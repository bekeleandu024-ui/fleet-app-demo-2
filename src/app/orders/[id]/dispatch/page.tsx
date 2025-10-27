// Acceptance criteria:
// - Displays selected driver, unit, rate summary, and drafted messages.
// - "Create Trip" form triggers server action to create trip, run cost engine, and redirect to tracking.
// - Drafted customer/driver messages are rendered with apply/dismiss cues.
// - No Prisma.Decimal values are passed to the client.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { draftDispatchMessages } from "@/server/dispatch-messaging";
import { recalcTripCost } from "@/server/cost-engine";

const { Decimal } = Prisma;

async function blockDriverCalendar(driverId: string | null, tripWindow: { start?: Date | null; end?: Date | null }) {
  void driverId;
  void tripWindow;
  return true;
}

async function pushToCommsChannels(orderId: string, tripId: string) {
  void orderId;
  void tripId;
  return true;
}

async function createTripFromOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");

  const miles = 250;
  const revenue = 2.5 * miles;

  const [driverRecord, unitRecord] = await Promise.all([
    order.lastSuggestedDriverId ? prisma.driver.findUnique({ where: { id: order.lastSuggestedDriverId } }) : null,
    order.lastSuggestedUnitId ? prisma.unit.findUnique({ where: { id: order.lastSuggestedUnitId } }) : null,
  ]);

  const driverName = driverRecord?.name ?? "Unassigned";
  const unitCode = unitRecord?.code ?? "Unassigned";

  const trip = await prisma.trip.create({
    data: {
      orderId: order.id,
      driver: driverName,
      unit: unitCode,
      driverId: order.lastSuggestedDriverId ?? null,
      unitId: order.lastSuggestedUnitId ?? null,
      rateId: order.lastSuggestedRateId ?? null,
      type: order.requiredTruck,
      zone: order.origin,
      miles: new Decimal(miles),
      plannedMiles: new Decimal(miles),
      revenue: new Decimal(revenue),
      status: "Dispatched",
      tripStart: order.puWindowStart ?? new Date(),
      tripEnd: order.delWindowEnd ?? null,
      weekStart: order.puWindowStart ?? new Date(),
    },
  });

  await blockDriverCalendar(order.lastSuggestedDriverId ?? null, {
    start: order.puWindowStart,
    end: order.delWindowEnd,
  });

  const cost = await recalcTripCost(trip.id);
  await pushToCommsChannels(order.id, trip.id);

  return { tripId: trip.id, cost };
}

const createTripAction = async (formData: FormData) => {
  "use server";
  const orderId = formData.get("orderId");
  if (typeof orderId !== "string" || !orderId) {
    throw new Error("Order id missing");
  }
  const result = await createTripFromOrder(orderId);
  redirect(`/trips/${result.tripId}/track`);
};

export default async function DispatchPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      trips: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!order) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm text-zinc-400">Order not found.</div>;
  }

  const dispatchDrafts = await draftDispatchMessages(order.id);
  const [driverRecord, unitRecord] = await Promise.all([
    order.lastSuggestedDriverId ? prisma.driver.findUnique({ where: { id: order.lastSuggestedDriverId } }) : null,
    order.lastSuggestedUnitId ? prisma.unit.findUnique({ where: { id: order.lastSuggestedUnitId } }) : null,
  ]);
  const latestTrip = order.trips[0] ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Dispatch order</h1>
            <p className="text-sm text-zinc-300">
              {order.customer} — {order.origin} → {order.destination}
            </p>
            <p className="text-xs text-zinc-500">
              Pickup {order.puWindowStart ? order.puWindowStart.toLocaleString() : "TBD"}
            </p>
          </div>
          <form action={createTripAction} className="flex flex-col gap-2 md:flex-row md:items-center">
            <input type="hidden" name="orderId" value={order.id} />
            <button
              type="submit"
              className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30"
            >
              Create Trip
            </button>
            <Link
              href={`/orders/${order.id}/plan`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500"
            >
              Back to plan
            </Link>
          </form>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-300">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Driver</p>
          <p className="mt-2 text-lg font-semibold text-white">{driverRecord?.name ?? "Unassigned"}</p>
          <p className="mt-2 text-xs text-zinc-400">Audit at {order.lastSuggestionAt?.toLocaleString() ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-300">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Unit</p>
          <p className="mt-2 text-lg font-semibold text-white">{unitRecord?.code ?? "Unassigned"}</p>
          <p className="mt-2 text-xs text-zinc-400">Equipment: {order.requiredTruck ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-300">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Rate</p>
          <p className="mt-2 text-lg font-semibold text-white">Guardrails captured</p>
          <p className="mt-2 text-xs text-zinc-400">Reason: {order.lastSuggestionReason ?? "—"}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6 text-sm text-emerald-100">
          <h2 className="text-base font-semibold text-white">Customer message</h2>
          <p className="mt-2 text-xs uppercase tracking-wide text-emerald-200">{dispatchDrafts.customerMsg.summary.textSummary}</p>
          <p className="mt-3 text-xs text-emerald-200">Subject</p>
          <p className="text-sm text-emerald-100">{dispatchDrafts.customerMsg.subject}</p>
          <p className="mt-3 text-xs text-emerald-200">Body</p>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-emerald-100">{dispatchDrafts.customerMsg.body}</pre>
          <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-emerald-200">
            {dispatchDrafts.customerMsg.summary.actions.map((action) => (
              <span key={action.label} className="rounded-full border border-emerald-400/40 px-3 py-1">
                {action.label}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-sky-500/40 bg-sky-500/5 p-6 text-sm text-sky-100">
          <h2 className="text-base font-semibold text-white">Driver message</h2>
          <p className="mt-2 text-xs uppercase tracking-wide text-sky-200">{dispatchDrafts.driverMsg.summary.textSummary}</p>
          <p className="mt-3 text-xs text-sky-200">Subject</p>
          <p className="text-sm text-sky-100">{dispatchDrafts.driverMsg.subject}</p>
          <p className="mt-3 text-xs text-sky-200">Body</p>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-sky-100">{dispatchDrafts.driverMsg.body}</pre>
          <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-sky-200">
            {dispatchDrafts.driverMsg.summary.actions.map((action) => (
              <span key={action.label} className="rounded-full border border-sky-400/40 px-3 py-1">
                {action.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {latestTrip && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-sm text-zinc-300">
          <h2 className="text-base font-semibold text-white">Latest trip snapshot</h2>
          <p className="mt-2 text-xs text-zinc-400">Trip {latestTrip.id}</p>
          <p className="mt-2 text-xs text-zinc-400">
            Last margin {(latestTrip.marginPct ? Number(latestTrip.marginPct) * 100 : 0).toFixed(1)}%
          </p>
        </section>
      )}
    </div>
  );
}
