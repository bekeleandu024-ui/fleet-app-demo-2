import Link from "next/link";
import { format } from "date-fns";
import prisma from "@/lib/prisma";

export default async function DashboardPage() {
  const [orderCount, tripCount, recentOrders] = await Promise.all([
    prisma.order.count(),
    prisma.trip.count(),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section className="grid gap-6 md:grid-cols-2">
        <div className="section-card">
          <p className="text-sm uppercase tracking-wide text-zinc-500">Orders</p>
          <h2 className="mt-2 text-4xl font-semibold text-white">{orderCount}</h2>
          <p className="mt-3 text-sm text-zinc-400">
            Total orders captured in the system.
          </p>
          <Link href="/orders" className="mt-6 inline-flex items-center text-sm font-semibold text-sky-400">
            Manage Orders →
          </Link>
        </div>
        <div className="section-card">
          <p className="text-sm uppercase tracking-wide text-zinc-500">Trips</p>
          <h2 className="mt-2 text-4xl font-semibold text-white">{tripCount}</h2>
          <p className="mt-3 text-sm text-zinc-400">Trips tracked for margin and assignments.</p>
          <Link href="/orders" className="mt-6 inline-flex items-center text-sm font-semibold text-sky-400">
            View Orders & Trips →
          </Link>
        </div>
      </section>

      <section className="section-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Recent Orders</h3>
            <p className="text-sm text-zinc-400">Latest five orders captured via dispatch.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/orders/new" className="rounded-lg bg-sky-500/20 px-4 py-2 font-medium text-sky-300 hover:bg-sky-500/30">
              Create Order
            </Link>
            <Link href="/drivers" className="rounded-lg bg-zinc-800 px-4 py-2 text-zinc-200 hover:bg-zinc-700">
              View Drivers
            </Link>
            <Link href="/units" className="rounded-lg bg-zinc-800 px-4 py-2 text-zinc-200 hover:bg-zinc-700">
              View Units
            </Link>
            <Link href="/rates" className="rounded-lg bg-zinc-800 px-4 py-2 text-zinc-200 hover:bg-zinc-700">
              Rates
            </Link>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-900/60 text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Route</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-medium text-white">
                    <Link href={`/orders/${order.id}`}>{order.customer}</Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {order.origin} → {order.destination}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {format(order.createdAt, "MMM d, yyyy p")}
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
