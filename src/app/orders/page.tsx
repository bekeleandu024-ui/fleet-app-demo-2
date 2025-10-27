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

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Orders</h1>
        <Link
          href="/orders/new"
          className="rounded-lg bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/30"
        >
          + New Order
        </Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900/60 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Customer</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Origin</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Destination</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/60 text-zinc-300">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-zinc-900/60">
                <td className="px-4 py-3 font-semibold text-white">
                  <Link href={`/orders/${order.id}`} className="hover:text-sky-300">
                    {order.customer}
                  </Link>
                </td>
                <td className="px-4 py-3">{order.origin}</td>
                <td className="px-4 py-3">{order.destination}</td>
                <td className="px-4 py-3 text-zinc-400">{formatDateTime(order.createdAt)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  No orders yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
