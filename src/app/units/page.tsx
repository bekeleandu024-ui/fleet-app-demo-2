import Link from "next/link";
import prisma from "@/lib/prisma";

function formatWeeklyFixedCost(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "—";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(number);

  return `${formatted} / week`;
}

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
      <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/60 shadow-card backdrop-blur">
        <table className="min-w-full divide-y divide-slate-800/60 text-sm">
          <thead className="bg-slate-900/60 text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Code</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Home Base</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Weekly Fixed Cost</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Active</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/50">
            {units.map((unit) => (
              <tr key={unit.id} className="transition hover:bg-slate-900/45">
                <td className="px-4 py-3 text-white">{unit.code}</td>
                <td className="px-4 py-3 text-slate-300">{unit.type ?? "—"}</td>
                <td className="px-4 py-3 text-slate-300">{unit.homeBase ?? "—"}</td>
                <td className="px-4 py-3 text-slate-300">{formatWeeklyFixedCost(unit.weeklyFixedCost)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      unit.active
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {unit.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/units/${unit.id}/edit`} className="text-sm text-sky-300 transition hover:text-sky-200">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {units.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
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
