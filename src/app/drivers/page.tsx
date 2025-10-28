import Link from "next/link";
import prisma from "@/lib/prisma";

import DashboardCard from "@/src/components/DashboardCard";

const pillBaseClass = "inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-medium text-white";

export default async function DriversPage() {
  const drivers = await prisma.driver.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard
        title="Drivers"
        description="Roster of active and inactive drivers across the fleet."
        headerRight={
          <Link
            href="/drivers/new"
            className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-emerald-300/40 hover:text-emerald-100"
          >
            + New Driver
          </Link>
        }
      >
        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Home Base</th>
                  <th className="px-4 py-3 text-left font-medium">Active</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="transition hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{driver.name}</td>
                    <td className="px-4 py-3 text-white/70">{driver.type ?? "—"}</td>
                    <td className="px-4 py-3 text-white/70">{driver.homeBase ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={pillBaseClass}>
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${driver.active ? "bg-emerald-400" : "bg-rose-400"}`}
                          aria-hidden
                        />
                        {driver.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/drivers/${driver.id}/edit`}
                        className="text-sm text-emerald-200 underline-offset-4 transition hover:text-emerald-100"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
                {drivers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/60">
                      No drivers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
