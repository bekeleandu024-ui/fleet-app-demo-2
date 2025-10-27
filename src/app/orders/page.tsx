import prisma from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 50,
  });

  return (
    <main className="min-h-screen bg-[#0a0f1c] text-neutral-100 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Orders</h1>
          <Link
            href="/orders/new"
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            + New Order
          </Link>
        </header>

        {orders.length === 0 ? (
          <div className="text-sm text-neutral-400">No orders yet.</div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg shadow-black/40 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-neutral-200 truncate">
                      {o.customer}
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                      <span className="font-mono text-neutral-300">{o.origin}</span>
                      <span className="mx-1 text-neutral-500">→</span>
                      <span className="font-mono text-neutral-300">{o.destination}</span>
                    </div>
                    {o.requiredTruck ? (
                      <div className="mt-1 text-[11px] text-amber-300/90">
                        Equipment: {o.requiredTruck}
                      </div>
                    ) : null}
                    {o.notes ? (
                      <div className="mt-1 text-[11px] text-neutral-400 line-clamp-2">
                        {o.notes}
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-[10px] text-neutral-500">Created</div>
                    <div className="text-[11px] text-neutral-300">
                      {format(o.createdAt, "PPp")}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <Link
                    href={`/orders/${o.id}`}
                    className="text-xs text-neutral-300 hover:text-white underline underline-offset-4"
                  >
                    View
                  </Link>

                  <Link
                    href={`/book?orderId=${o.id}`}
                    className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-emerald-500 transition-colors"
                  >
                    Book Trip
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
