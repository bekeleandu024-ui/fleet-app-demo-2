import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import EditForm from "./ui-edit-form";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

export default async function TripEditPage({ params }: { params: { id: string } }) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      driverRef: true,
      unitRef: true,
      rateRef: true,
    },
  });

  if (!trip) {
    notFound();
  }

  const [drivers, units, rates, distinctTypes, distinctZones] = await Promise.all([
    prisma.driver.findMany({ orderBy: { name: "asc" } }),
    prisma.unit.findMany({ orderBy: { code: "asc" } }),
    prisma.rate.findMany({ orderBy: [{ type: "asc" }, { zone: "asc" }] }),
    prisma.trip.findMany({ distinct: ["type"], where: { type: { not: null } }, select: { type: true } }),
    prisma.trip.findMany({ distinct: ["zone"], where: { zone: { not: null } }, select: { zone: true } }),
  ]);

  const safeTrip = {
    id: trip.id,
    driverId: trip.driverId ?? undefined,
    unitId: trip.unitId ?? undefined,
    rateId: trip.rateId ?? undefined,
    driver: trip.driver ?? "",
    unit: trip.unit ?? "",
    type: trip.type ?? "",
    zone: trip.zone ?? "",
    status: trip.status,
    miles: Number(trip.miles),
    revenue: toNumber(trip.revenue),
    fixedCPM: toNumber(trip.fixedCPM),
    wageCPM: toNumber(trip.wageCPM),
    addOnsCPM: toNumber(trip.addOnsCPM),
    rollingCPM: toNumber(trip.rollingCPM),
    totalCPM: toNumber(trip.totalCPM),
    totalCost: toNumber(trip.totalCost),
    profit: toNumber(trip.profit),
    marginPct: toNumber(trip.marginPct),
  };

  const safeRates = rates.map((rate) => ({
    id: rate.id,
    type: rate.type ?? "",
    zone: rate.zone ?? "",
    fixedCPM: Number(rate.fixedCPM),
    wageCPM: Number(rate.wageCPM),
    addOnsCPM: Number(rate.addOnsCPM),
    rollingCPM: Number(rate.rollingCPM),
  }));

  const rateOptions = safeRates.map((rate) => ({
    id: rate.id,
    label: [rate.type, rate.zone].filter(Boolean).join(" • ") || "Rate",
  }));

  const driverOptions = drivers.map((driver) => ({ id: driver.id, name: driver.name }));
  const unitOptions = units.map((unit) => ({ id: unit.id, code: unit.code }));

  const typeSet = new Set<string>();
  const zoneSet = new Set<string>();
  distinctTypes.forEach((entry) => entry.type && typeSet.add(entry.type));
  distinctZones.forEach((entry) => entry.zone && zoneSet.add(entry.zone));
  safeRates.forEach((rate) => {
    if (rate.type) typeSet.add(rate.type);
    if (rate.zone) zoneSet.add(rate.zone);
  });
  if (trip.type) typeSet.add(trip.type);
  if (trip.zone) zoneSet.add(trip.zone);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Edit Trip</h1>
        <Link href="/trips" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Back to trips
        </Link>
      </div>
      <EditForm
        trip={safeTrip}
        drivers={driverOptions}
        units={unitOptions}
        types={[...typeSet].sort()}
        zones={[...zoneSet].sort()}
        rates={safeRates}
        rateOptions={rateOptions}
      />
    </div>
  );
}
