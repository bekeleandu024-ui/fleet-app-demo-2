import Link from "next/link";
import prisma from "@/lib/prisma";

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function TripsPage() {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      driverRef: true,
      unitRef: true,
      rateRef: true,
    },
    take: 25,
  });

  const safeTrips = trips.map((trip) => ({
    ...trip,
    miles: Number(trip.miles),
    revenue: trip.revenue ? Number(trip.revenue) : null,
    totalCost: trip.totalCost ? Number(trip.totalCost) : null,
    profit: trip.profit ? Number(trip.profit) : null,
    totalCPM: trip.totalCPM ? Number(trip.totalCPM) : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Trips</h1>
          <p className="mt-1 text-sm text-slate-600">
            Recent trips with quick access to edit or rerun profitability calculations.
          </p>
        </div>
        <Link
          href="/orders/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Create order
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Driver</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Unit</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Type</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Zone</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Miles</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Revenue</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Profit</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {safeTrips.map((trip) => (
              <tr key={trip.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-800">{trip.driver}</td>
                <td className="px-4 py-2 text-slate-700">{trip.unit}</td>
                <td className="px-4 py-2 text-slate-700">{trip.type ?? "—"}</td>
                <td className="px-4 py-2 text-slate-700">{trip.zone ?? "—"}</td>
                <td className="px-4 py-2 text-slate-700">{trip.miles.toLocaleString()}</td>
                <td className="px-4 py-2 text-slate-700">{formatCurrency(trip.revenue)}</td>
                <td className="px-4 py-2 text-slate-700">{formatCurrency(trip.profit)}</td>
                <td className="px-4 py-2 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/trips/${trip.id}/edit`}
                      className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/trips/${trip.id}/recalc`}
                      className="rounded border border-blue-500 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                    >
                      Recalc
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {safeTrips.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={8}>
                  No trips yet. Seed the database to view sample data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
