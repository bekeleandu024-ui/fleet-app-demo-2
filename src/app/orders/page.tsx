import prisma from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";

import DashboardCard from "@/src/components/DashboardCard";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard
        title="Orders"
        description="Recent order intake from EDI, email, and assisted booking."
        headerRight={
          <Link
            href="/orders/new"
            className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:border-emerald-300/40 hover:text-emerald-100"
          >
            + New Order
          </Link>
        }
      >
        {orders.length === 0 ? (
          <div className="text-sm text-white/60">No orders yet.</div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-white/10 bg-white/5 p-4 transition hover:border-white/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="truncate text-sm font-semibold text-white">{o.customer}</div>
                    <div className="text-xs text-white/60">
                      <span className="font-mono text-white/80">{o.origin}</span>
                      <span className="mx-1 text-white/40">→</span>
                      <span className="font-mono text-white/80">{o.destination}</span>
                    </div>
                    {o.requiredTruck ? (
                      <div className="text-[11px] text-white/60">Equipment: {o.requiredTruck}</div>
                    ) : null}
                    {o.notes ? (
                      <div className="line-clamp-2 text-[11px] text-white/60">{o.notes}</div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right text-[11px] text-white/60">
                    <div className="uppercase tracking-wide text-[10px] text-white/40">Created</div>
                    <div>{format(o.createdAt, "PPp")}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Link
                    href={`/orders/${o.id}`}
                    className="text-xs text-white/70 underline-offset-4 transition hover:text-white"
                  >
                    View details
                  </Link>
                  <Link
                    href={`/book?orderId=${o.id}`}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-[11px] font-semibold text-emerald-200 transition hover:border-emerald-300/60 hover:text-emerald-100"
                  >
                    Book Trip
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>
    </div>
  );
}
