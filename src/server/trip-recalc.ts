import prisma from "@/lib/prisma";

type Snapshot = {
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

function toNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

function computeTotals(
  miles: number,
  revenue: number | null,
  fixedCPM: number | null,
  wageCPM: number | null,
  addOnsCPM: number | null,
  rollingCPM: number | null
) {
  const parts = [fixedCPM, wageCPM, addOnsCPM, rollingCPM];
  const hasAny = parts.some((value) => value !== null);
  if (!hasAny) {
    return { totalCPM: null, totalCost: null, profit: revenue !== null ? revenue : null, marginPct: null };
  }

  const totalCPM = parts.reduce((sum, value) => sum + (value ?? 0), 0);
  const totalCost = totalCPM * miles;
  const profit = revenue !== null ? revenue - totalCost : null;
  const marginPct = revenue && revenue !== 0 && profit !== null ? profit / revenue : null;
  return { totalCPM, totalCost, profit, marginPct };
}

export async function recalcTripTotals(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      rateRef: true,
    },
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  const miles = Number(trip.miles ?? 0);
  const revenue = toNumber(trip.revenue);

  const before: Snapshot = {
    fixedCPM: toNumber(trip.fixedCPM),
    wageCPM: toNumber(trip.wageCPM),
    addOnsCPM: toNumber(trip.addOnsCPM),
    rollingCPM: toNumber(trip.rollingCPM),
    totalCPM: toNumber(trip.totalCPM),
    totalCost: toNumber(trip.totalCost),
    profit: toNumber(trip.profit),
    marginPct: toNumber(trip.marginPct),
    revenue,
  };

  const rateFromTrip = trip.rateRef;
  const fallbackRate =
    rateFromTrip ??
    (trip.type || trip.zone
      ? await prisma.rate.findFirst({
          where: {
            ...(trip.type ? { type: trip.type } : {}),
            ...(trip.zone ? { zone: trip.zone } : {}),
          },
        })
      : null);

  let fixedCPM = before.fixedCPM;
  let wageCPM = before.wageCPM;
  let addOnsCPM = before.addOnsCPM;
  let rollingCPM = before.rollingCPM;

  let rateApplied = false;

  if (!fixedCPM && fallbackRate) {
    fixedCPM = Number(fallbackRate.fixedCPM);
    rateApplied = true;
  }
  if (!wageCPM && fallbackRate) {
    wageCPM = Number(fallbackRate.wageCPM);
    rateApplied = true;
  }
  if (!addOnsCPM && fallbackRate) {
    addOnsCPM = Number(fallbackRate.addOnsCPM);
    rateApplied = true;
  }
  if (!rollingCPM && fallbackRate) {
    rollingCPM = Number(fallbackRate.rollingCPM);
    rateApplied = true;
  }

  const totals = computeTotals(miles, revenue, fixedCPM, wageCPM, addOnsCPM, rollingCPM);

  const after: Snapshot = {
    fixedCPM,
    wageCPM,
    addOnsCPM,
    rollingCPM,
    totalCPM: totals.totalCPM,
    totalCost: totals.totalCost,
    profit: totals.profit,
    marginPct: totals.marginPct,
    revenue,
  };

  return {
    trip: {
      id: trip.id,
      orderId: trip.orderId,
      driver: trip.driver,
      unit: trip.unit,
      type: trip.type,
      zone: trip.zone,
      miles,
      revenue,
      status: trip.status,
    },
    before,
    after,
    rateApplied,
  };
}

export type TripRecalcResult = Awaited<ReturnType<typeof recalcTripTotals>>;
