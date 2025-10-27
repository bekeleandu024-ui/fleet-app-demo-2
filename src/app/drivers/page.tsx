import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function DriversPage() {
  const drivers = await prisma.driver.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Drivers</h1>
        <Link
          href="/drivers/new"
          className="rounded-lg bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/30"
        >
          + New Driver
        </Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/60 shadow-card backdrop-blur">
        <table className="min-w-full divide-y divide-slate-800/60 text-sm">
          <thead className="bg-slate-900/60 text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Home Base</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Active</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/50">
            {drivers.map((driver) => (
              <tr key={driver.id} className="transition hover:bg-slate-900/45">
                <td className="px-4 py-3 text-white">{driver.name}</td>
                <td className="px-4 py-3 text-slate-300">{driver.type ?? "—"}</td>
                <td className="px-4 py-3 text-slate-300">{driver.homeBase ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      driver.active
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {driver.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/drivers/${driver.id}/edit`} className="text-sm text-sky-300 transition hover:text-sky-200">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No drivers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
