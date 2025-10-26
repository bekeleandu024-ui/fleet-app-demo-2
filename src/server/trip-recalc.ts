import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export type TripTotalsSnapshot = {
  fixedCPM: number | null;
  wageCPM: number | null;
  addOnsCPM: number | null;
  rollingCPM: number | null;
  totalCPM: number | null;
  totalCost: number | null;
  profit: number | null;
  marginPct: number | null;
  revenue: number | null;
};

export type TripRecalcResult = {
  trip: {
    id: string;
    driver: string;
    unit: string;
    miles: number;
    status: string;
  };
  before: TripTotalsSnapshot;
  after: TripTotalsSnapshot;
  rateApplied?: {
    id: string;
    label: string;
  };
};

const toNumber = (value: Prisma.Decimal | null | undefined) =>
  value !== null && value !== undefined ? Number(value) : null;

const toDecimal = (value: number | null | undefined) =>
  value === null || value === undefined ? null : new Prisma.Decimal(value);

export async function recalcTripTotals(tripId: string): Promise<TripRecalcResult> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { rateRef: true },
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  const before: TripTotalsSnapshot = {
    fixedCPM: toNumber(trip.fixedCPM),
    wageCPM: toNumber(trip.wageCPM),
    addOnsCPM: toNumber(trip.addOnsCPM),
    rollingCPM: toNumber(trip.rollingCPM),
    totalCPM: toNumber(trip.totalCPM),
    totalCost: toNumber(trip.totalCost),
    profit: toNumber(trip.profit),
    marginPct: toNumber(trip.marginPct),
    revenue: toNumber(trip.revenue),
  };

  let fixed = before.fixedCPM;
  let wage = before.wageCPM;
  let addOns = before.addOnsCPM;
  let rolling = before.rollingCPM;
  let rateApplied: TripRecalcResult["rateApplied"] | undefined;

  if (trip.rateRef) {
    const needsRate = [fixed, wage, addOns, rolling].some((value) => value === null);
    if (needsRate) {
      fixed = Number(trip.rateRef.fixedCPM);
      wage = Number(trip.rateRef.wageCPM);
      addOns = Number(trip.rateRef.addOnsCPM);
      rolling = Number(trip.rateRef.rollingCPM);
      rateApplied = {
        id: trip.rateRef.id,
        label: [trip.rateRef.type, trip.rateRef.zone].filter(Boolean).join(" • ") || "General",
      };
    }
  }

  const miles = Number(trip.miles);
  const revenue = before.revenue;
  const hasCpm = [fixed, wage, addOns, rolling].some((value) => value !== null);
  const totalCPM = hasCpm
    ? (fixed ?? 0) + (wage ?? 0) + (addOns ?? 0) + (rolling ?? 0)
    : null;
  const totalCost = totalCPM !== null ? miles * totalCPM : null;
  const profit = revenue !== null && totalCost !== null ? revenue - totalCost : null;
  const marginPct = revenue !== null && revenue !== 0 && profit !== null ? (profit / revenue) * 100 : null;

  const after: TripTotalsSnapshot = {
    fixedCPM: fixed,
    wageCPM: wage,
    addOnsCPM: addOns,
    rollingCPM: rolling,
    totalCPM,
    totalCost,
    profit,
    marginPct,
    revenue,
  };

  await prisma.trip.update({
    where: { id: trip.id },
    data: {
      fixedCPM: toDecimal(fixed),
      wageCPM: toDecimal(wage),
      addOnsCPM: toDecimal(addOns),
      rollingCPM: toDecimal(rolling),
      totalCPM: toDecimal(totalCPM),
      totalCost: toDecimal(totalCost),
      profit: toDecimal(profit),
      marginPct: toDecimal(marginPct),
    },
  });

  return {
    trip: {
      id: trip.id,
      driver: trip.driver,
      unit: trip.unit,
      miles,
      status: trip.status,
    },
    before,
    after,
    rateApplied,
  };
}
