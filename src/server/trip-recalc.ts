import prisma from "@/lib/prisma";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

export async function recalcTripTotals(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      rateRef: true,
      order: { select: { id: true, customer: true, origin: true, destination: true } },
    },
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  const rate = trip.rateRef;
  const miles = Number(trip.miles ?? 0);
  const revenue = toNumber(trip.revenue);
  const before = {
    fixedCPM: toNumber(trip.fixedCPM),
    wageCPM: toNumber(trip.wageCPM),
    addOnsCPM: toNumber(trip.addOnsCPM),
    rollingCPM: toNumber(trip.rollingCPM),
    totalCPM: toNumber(trip.totalCPM),
    totalCost: toNumber(trip.totalCost),
    revenue,
    profit: toNumber(trip.profit),
    marginPct: toNumber(trip.marginPct),
  } as const;

  const afterFixed = before.fixedCPM ?? (rate ? Number(rate.fixedCPM) : null);
  const afterWage = before.wageCPM ?? (rate ? Number(rate.wageCPM) : null);
  const afterAddOns = before.addOnsCPM ?? (rate ? Number(rate.addOnsCPM) : null);
  const afterRolling = before.rollingCPM ?? (rate ? Number(rate.rollingCPM) : null);

  const totalCPM =
    (afterFixed ?? 0) + (afterWage ?? 0) + (afterAddOns ?? 0) + (afterRolling ?? 0);
  const totalCost = miles * totalCPM;
  const profit = revenue !== null ? revenue - totalCost : null;
  const marginPct = revenue && revenue !== 0 ? (profit ?? 0) / revenue * 100 : null;

  const after = {
    fixedCPM: afterFixed,
    wageCPM: afterWage,
    addOnsCPM: afterAddOns,
    rollingCPM: afterRolling,
    totalCPM,
    totalCost,
    revenue,
    profit,
    marginPct,
  };

  const safeTrip = {
    id: trip.id,
    orderId: trip.orderId,
    driver: trip.driver,
    unit: trip.unit,
    miles,
    revenue,
    status: trip.status,
    order: trip.order,
  };

  return {
    trip: safeTrip,
    before,
    after,
    rateApplied: rate
      ? {
          id: rate.id,
          label: [rate.type, rate.zone].filter(Boolean).join(" • ") || "Rate",
        }
      : undefined,
  };
}
