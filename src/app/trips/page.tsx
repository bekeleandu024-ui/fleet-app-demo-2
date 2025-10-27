import Link from "next/link";
import prisma from "@/lib/prisma";

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatMiles(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(0)} mi`;
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(value);
}

export default async function TripsPage() {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      driverRef: { select: { name: true } },
      unitRef: { select: { code: true } },
      rateRef: { select: { type: true, zone: true } },
    },
  });

  const safeTrips = trips.map((trip) => ({
    id: trip.id,
    driverName: trip.driverRef?.name ?? trip.driver ?? "Unassigned",
    unitCode: trip.unitRef?.code ?? trip.unit ?? "—",
    miles: Number(trip.miles ?? 0),
    revenue: trip.revenue ? Number(trip.revenue) : null,
    weekStart: trip.weekStart,
    status: trip.status,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Trips</h1>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/60 shadow-card backdrop-blur">
        <table className="min-w-full divide-y divide-slate-800/60 text-sm">
          <thead className="bg-slate-900/60 text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Driver</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Unit</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Miles</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Revenue</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Week Start</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/50">
            {safeTrips.map((trip) => (
              <tr key={trip.id} className="transition hover:bg-slate-900/50">
                <td className="px-4 py-3 text-white">{trip.driverName}</td>
                <td className="px-4 py-3 text-slate-300">{trip.unitCode}</td>
                <td className="px-4 py-3 text-slate-300">{formatMiles(trip.miles)}</td>
                <td className="px-4 py-3 text-slate-300">{formatCurrency(trip.revenue)}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(trip.weekStart)}</td>
                <td className="px-4 py-3 text-slate-300">{trip.status}</td>
                <td className="px-4 py-3 text-sm text-sky-300">
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/trips/${trip.id}/edit`} className="transition hover:text-sky-200">
                      Edit
                    </Link>
                    <Link href={`/trips/${trip.id}/recalc`} className="transition hover:text-sky-200">
                      Recalc
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {safeTrips.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No trips yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
