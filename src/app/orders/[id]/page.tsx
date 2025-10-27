import Link from "next/link";
import prisma from "@/lib/prisma";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDate(date?: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatNumber(value: unknown) {
  if (value === null || value === undefined) return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return "—";
  return number.toLocaleString();
}

function formatCurrency(value: unknown) {
  if (value === null || value === undefined) return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(number);
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      trips: { orderBy: { weekStart: "desc" } },
    },
  });

  if (!order) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm text-zinc-400">Order not found.</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">{order.customer}</h1>
            <p className="text-sm text-zinc-300">
              {order.origin} → {order.destination}
            </p>
            <p className="text-xs text-zinc-500">Created {formatDateTime(order.createdAt)}</p>
          </div>
          <Link
            href={`/orders/${order.id}/book-trip`}
            className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400"
          >
            Book Trip
          </Link>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Pickup Window</dt>
            <dd className="text-sm text-zinc-200">
              {formatDate(order.puWindowStart)} – {formatDate(order.puWindowEnd)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Delivery Window</dt>
            <dd className="text-sm text-zinc-200">
              {formatDate(order.delWindowStart)} – {formatDate(order.delWindowEnd)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Required Truck</dt>
            <dd className="text-sm text-zinc-200">{order.requiredTruck ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Notes</dt>
            <dd className="whitespace-pre-line text-sm text-zinc-200">{order.notes?.trim() || "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Trips</h2>
          <span className="text-xs uppercase tracking-wide text-zinc-500">{order.trips.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-900/60 text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Driver</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Unit</th>
                <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">Miles</th>
                <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">Revenue</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Week Start</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {order.trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-white">{trip.driver}</td>
                  <td className="px-4 py-3 text-zinc-300">{trip.unit || "—"}</td>
                  <td className="px-4 py-3 text-right text-zinc-200">{formatNumber(trip.miles)}</td>
                  <td className="px-4 py-3 text-right text-zinc-200">{formatCurrency(trip.revenue)}</td>
                  <td className="px-4 py-3 text-zinc-300">{formatDate(trip.weekStart)}</td>
                </tr>
              ))}
              {order.trips.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    No trips booked yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
