import Link from "next/link";

import { prisma } from "@/lib/prisma";

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

const formatDate = (date: Date | null) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatNumber = (value: unknown) => {
  if (value === null || value === undefined) return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return "—";
  return number.toLocaleString();
};

const formatCurrency = (value: unknown) => {
  if (value === null || value === undefined) return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(number);
};

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { trips: { orderBy: { weekStart: "desc" } } },
  });

  if (!order) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-3xl rounded-lg border border-zinc-800 p-4 text-sm text-zinc-300">
          Order not found.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between rounded-lg border border-zinc-800 p-4">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-white">{order.customer}</h1>
            <p className="text-sm text-zinc-300">
              {order.origin} → {order.destination}
            </p>
            <p className="text-xs text-zinc-500">
              Created {formatDateTime(order.createdAt)}
            </p>
          </div>
          <Link
            href={`/orders/${order.id}/book-trip`}
            className="rounded border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-black"
          >
            Book Trip
          </Link>
        </div>

        <div className="rounded-lg border border-zinc-800 p-4 text-sm text-zinc-300">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                Pickup Window
              </dt>
              <dd className="text-sm">
                {formatDate(order.puWindowStart)} – {formatDate(order.puWindowEnd)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                Delivery Window
              </dt>
              <dd className="text-sm">
                {formatDate(order.delWindowStart)} – {formatDate(order.delWindowEnd)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                Required Truck
              </dt>
              <dd className="text-sm">{order.requiredTruck ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Notes</dt>
              <dd className="text-sm whitespace-pre-line">
                {order.notes?.trim() ? order.notes : "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">Trips</h2>
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Miles</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Week Start</th>
                </tr>
              </thead>
              <tbody>
                {order.trips.map((trip) => (
                  <tr
                    key={trip.id}
                    className="border-t border-zinc-800 text-zinc-300 hover:bg-zinc-900/60"
                  >
                    <td className="px-4 py-3 text-white">{trip.driver}</td>
                    <td className="px-4 py-3">{trip.unit || "—"}</td>
                    <td className="px-4 py-3">{formatNumber(trip.miles)}</td>
                    <td className="px-4 py-3">{formatCurrency(trip.revenue)}</td>
                    <td className="px-4 py-3">{formatDate(trip.weekStart)}</td>
                  </tr>
                ))}
                {order.trips.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-zinc-400"
                      colSpan={5}
                    >
                      No trips booked yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
