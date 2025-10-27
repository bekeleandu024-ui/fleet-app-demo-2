import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function UnitsPage() {
  const units = await prisma.unit.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Units</h1>
        <Link
          href="/units/new"
          className="rounded-lg bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/30"
        >
          + New Unit
        </Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900/60 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Code</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Home Base</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Active</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/60">
            {units.map((unit) => (
              <tr key={unit.id} className="hover:bg-zinc-900/50">
                <td className="px-4 py-3 text-white">{unit.code}</td>
                <td className="px-4 py-3 text-zinc-300">{unit.type ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-300">{unit.homeBase ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      unit.active
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {unit.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/units/${unit.id}/edit`} className="text-sm text-sky-300 hover:text-sky-200">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {units.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  No units yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
