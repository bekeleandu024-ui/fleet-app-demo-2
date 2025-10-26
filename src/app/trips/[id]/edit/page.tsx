import { format } from "date-fns";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import EditForm, { type TripForClient } from "./ui-edit-form";

function toInputValue(value: Date | null | undefined) {
  if (!value) return null;
  return format(value, "yyyy-MM-dd'T'HH:mm");
}

export default async function TripEditPage({ params }: { params: { id: string } }) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
  });

  if (!trip) {
    notFound();
  }

  const [drivers, units, rates, otherTrips] = await Promise.all([
    prisma.driver.findMany({ orderBy: { name: "asc" } }),
    prisma.unit.findMany({ orderBy: { code: "asc" } }),
    prisma.rate.findMany({ orderBy: [{ type: "asc" }, { zone: "asc" }] }),
    prisma.trip.findMany({ select: { type: true, zone: true } }),
  ]);

  const types = Array.from(new Set(otherTrips.map((t) => t.type).filter((t): t is string => Boolean(t)))).sort();
  const zones = Array.from(new Set(otherTrips.map((t) => t.zone).filter((t): t is string => Boolean(t)))).sort();

  const clientTrip: TripForClient = {
    id: trip.id,
    driver: trip.driver,
    unit: trip.unit,
    miles: Number(trip.miles),
    revenue: trip.revenue ? Number(trip.revenue) : null,
    fixedCPM: trip.fixedCPM ? Number(trip.fixedCPM) : null,
    wageCPM: trip.wageCPM ? Number(trip.wageCPM) : null,
    addOnsCPM: trip.addOnsCPM ? Number(trip.addOnsCPM) : null,
    rollingCPM: trip.rollingCPM ? Number(trip.rollingCPM) : null,
    totalCPM: trip.totalCPM ? Number(trip.totalCPM) : null,
    totalCost: trip.totalCost ? Number(trip.totalCost) : null,
    profit: trip.profit ? Number(trip.profit) : null,
    marginPct: trip.marginPct ? Number(trip.marginPct) : null,
    type: trip.type,
    zone: trip.zone,
    status: trip.status,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
    driverId: trip.driverId,
    unitId: trip.unitId,
    rateId: trip.rateId,
    tripStart: toInputValue(trip.tripStart),
    tripEnd: toInputValue(trip.tripEnd),
  };

  const driverOptions = drivers.map((driver) => ({ id: driver.id, name: driver.name }));
  const unitOptions = units.map((unit) => ({ id: unit.id, code: unit.code }));
  const rateOptions = rates.map((rate) => ({
    id: rate.id,
    label: [rate.type, rate.zone].filter(Boolean).join(" • ") || "General",
    fixedCPM: Number(rate.fixedCPM),
    wageCPM: Number(rate.wageCPM),
    addOnsCPM: Number(rate.addOnsCPM),
    rollingCPM: Number(rate.rollingCPM),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit trip</h1>
        <p className="mt-2 text-sm text-slate-600">
          Adjust drivers, units, and cost components. Select a rate program to populate CPM fields.
        </p>
      </div>
      <EditForm
        trip={clientTrip}
        drivers={driverOptions}
        units={unitOptions}
        types={types}
        zones={zones}
        rates={rateOptions}
      />
    </div>
  );
}
