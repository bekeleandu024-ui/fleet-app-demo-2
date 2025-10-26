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

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Orders</h1>
          <Link
            href="/orders/new"
            className="rounded border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900"
          >
            + New Order
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-zinc-800 hover:bg-zinc-900/60"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-medium text-white hover:underline"
                    >
                      {order.customer}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{order.origin}</td>
                  <td className="px-4 py-3 text-zinc-300">{order.destination}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {formatDateTime(order.createdAt)}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-zinc-400"
                    colSpan={4}
                  >
                    No orders yet.
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
