import Link from "next/link";
import prisma from "@/lib/prisma";
import EditForm from "./ui-edit-form";
import { updateTrip } from "./actions";

function toDateTimeInput(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 16);
}

function toDateInput(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export default async function EditTripPage({ params }: { params: { id: string } }) {
  const [trip, drivers, units, rates] = await Promise.all([
    prisma.trip.findUnique({
      where: { id: params.id },
      include: {
        order: { select: { id: true, customer: true, origin: true, destination: true } },
        driverRef: { select: { id: true, name: true } },
        unitRef: { select: { id: true, code: true } },
        rateRef: { select: { id: true, type: true, zone: true, fixedCPM: true, wageCPM: true, addOnsCPM: true, rollingCPM: true } },
      },
    }),
    prisma.driver.findMany({ orderBy: { name: "asc" } }),
    prisma.unit.findMany({ orderBy: { code: "asc" } }),
    prisma.rate.findMany({ orderBy: [{ type: "asc" }, { zone: "asc" }] }),
  ]);

  if (!trip) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm text-zinc-400">Trip not found.</div>;
  }

  const safeTrip = {
    id: trip.id,
    orderId: trip.orderId,
    driver: trip.driver,
    unit: trip.unit,
    driverId: trip.driverId ?? "",
    unitId: trip.unitId ?? "",
    rateId: trip.rateId ?? "",
    miles: Number(trip.miles ?? 0),
    revenue: trip.revenue ? Number(trip.revenue) : "",
    fixedCPM: trip.fixedCPM ? Number(trip.fixedCPM) : "",
    wageCPM: trip.wageCPM ? Number(trip.wageCPM) : "",
    addOnsCPM: trip.addOnsCPM ? Number(trip.addOnsCPM) : "",
    rollingCPM: trip.rollingCPM ? Number(trip.rollingCPM) : "",
    totalCPM: trip.totalCPM ? Number(trip.totalCPM) : "",
    totalCost: trip.totalCost ? Number(trip.totalCost) : "",
    profit: trip.profit ? Number(trip.profit) : "",
    marginPct: trip.marginPct ? Number(trip.marginPct) : "",
    status: trip.status,
    tripStart: toDateTimeInput(trip.tripStart),
    tripEnd: toDateTimeInput(trip.tripEnd),
    weekStart: toDateInput(trip.weekStart),
  } as const;

  const driverOptions = drivers.map((driver) => ({ id: driver.id, name: driver.name }));
  const unitOptions = units.map((unit) => ({ id: unit.id, code: unit.code }));
  const rateOptions = rates.map((rate) => ({
    id: rate.id,
    label: [rate.type, rate.zone].filter(Boolean).join(" • ") || "Untitled",
    fixedCPM: Number(rate.fixedCPM),
    wageCPM: Number(rate.wageCPM),
    addOnsCPM: Number(rate.addOnsCPM),
    rollingCPM: Number(rate.rollingCPM),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={trip.orderId ? `/orders/${trip.orderId}` : "/orders"} className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Back to order
        </Link>
        <h1 className="text-2xl font-semibold text-white">Edit Trip</h1>
        {trip.order && (
          <p className="text-sm text-zinc-400">
            {trip.order.customer}: {trip.order.origin} → {trip.order.destination}
          </p>
        )}
      </div>
      <EditForm
        trip={safeTrip}
        drivers={driverOptions}
        units={unitOptions}
        rates={rateOptions}
        updateTrip={updateTrip.bind(null, trip.id)}
      />
    </div>
  );
}
