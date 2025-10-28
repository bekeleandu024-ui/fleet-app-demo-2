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
          <ul className="flex flex-col gap-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/5 px-5 py-4 transition hover:border-white/30 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-6">
                  <div className="min-w-0 space-y-2">
                    <div className="truncate text-sm font-semibold text-white">{o.customer}</div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
                      <div>
                        <span className="font-mono text-white/80">{o.origin}</span>
                        <span className="mx-1 text-white/40">→</span>
                        <span className="font-mono text-white/80">{o.destination}</span>
                      </div>
                      {o.requiredTruck ? (
                        <span className="text-[11px] text-white/60">Equipment: {o.requiredTruck}</span>
                      ) : null}
                    </div>
                    {o.notes ? (
                      <div className="line-clamp-2 text-[11px] text-white/60">{o.notes}</div>
                    ) : null}
                  </div>
                </div>
                <div className="flex w-full flex-col gap-3 text-[11px] text-white/60 md:w-auto md:items-end md:text-right">
                  <div>
                    <div className="uppercase tracking-wide text-[10px] text-white/40">Created</div>
                    <div>{format(o.createdAt, "PPp")}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <Link
                      href={`/orders/${o.id}`}
                      className="text-white/70 underline-offset-4 transition hover:text-white"
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>
    </div>
  );
}
