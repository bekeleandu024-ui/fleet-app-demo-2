import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function UnitsPage() {
  const units = await prisma.unit.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Units</h1>
          <p className="mt-1 text-sm text-slate-600">Keep fleet equipment records up to date.</p>
        </div>
        <Link
          href="/units/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          + New unit
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Code</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Type</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Home base</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {units.map((unit) => (
              <tr key={unit.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-800">{unit.code}</td>
                <td className="px-4 py-2 text-slate-700">{unit.type ?? "—"}</td>
                <td className="px-4 py-2 text-slate-700">{unit.homeBase ?? "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      unit.active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {unit.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/units/${unit.id}/edit`}
                    className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {units.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
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
