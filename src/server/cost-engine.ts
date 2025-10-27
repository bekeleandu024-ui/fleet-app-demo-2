import { addDays, startOfWeek } from "date-fns";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
}

function toDecimal(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return new Prisma.Decimal(value);
}

async function getRate(rateKey: string, category?: string) {
  const normalizedCategory = category?.trim();

  if (normalizedCategory) {
    const specific = await prisma.rateSetting.findUnique({
      where: { rateKey_category: { rateKey, category: normalizedCategory } },
    });
    if (specific) {
      return toNumber(specific.value);
    }
  }

  const fallbacks = ["GLOBAL", "*"];
  for (const fallback of fallbacks) {
    const match = await prisma.rateSetting.findUnique({
      where: { rateKey_category: { rateKey, category: fallback } },
    });
    if (match) {
      return toNumber(match.value);
    }
  }

  return 0;
}

async function truckWeekly(unitCode?: string | null) {
  if (!unitCode) {
    return 0;
  }

  return getRate("TRUCK_WK", unitCode);
}

async function sumWeekMiles(unitCode: string | null | undefined, weekStart: Date) {
  if (!unitCode) {
    return 0;
  }

  const periodStart = startOfWeek(weekStart, { weekStartsOn: 1 });
  const periodEnd = addDays(periodStart, 7);

  const aggregate = await prisma.trip.aggregate({
    _sum: { miles: true },
    where: {
      unit: unitCode,
      weekStart: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
  });

  return toNumber(aggregate._sum.miles);
}

function countEvents(trip: {
  events: Array<{ type: string | null }>;
}) {
  const counters = {
    BC: 0,
    DH: 0,
    PICK: 0,
    DEL: 0,
  };

  for (const event of trip.events) {
    const kind = event.type?.toUpperCase();
    if (!kind) continue;
    if (kind in counters) {
      counters[kind as keyof typeof counters] += 1;
    }
  }

  return counters;
}

export async function recalcTripCost(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      events: true,
      driverRef: true,
      unitRef: true,
    },
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  const miles = toNumber(trip.miles);
  const revenueValue = trip.revenue === null ? null : Number(trip.revenue);

  if (miles <= 0) {
    const marginZeroValue = revenueValue && revenueValue !== 0 ? 0 : null;
    const updatedTrip = await prisma.trip.update({
      where: { id: trip.id },
      data: {
        fixedCPM: toDecimal(0),
        wageCPM: toDecimal(0),
        addOnsCPM: toDecimal(0),
        rollingCPM: toDecimal(0),
        totalCPM: toDecimal(0),
        totalCost: toDecimal(0),
        profit: toDecimal(0),
        marginPct: marginZeroValue === null ? null : toDecimal(marginZeroValue),
      },
    });

    return {
      trip: updatedTrip,
      cost: {
        fixedCPM: 0,
        wageCPM: 0,
        addOnsCPM: 0,
        rollingCPM: 0,
        totalCPM: 0,
        totalCost: 0,
        profit: 0,
        marginPct: marginZeroValue,
      },
    };
  }

  const type = (trip.type || "COM").toUpperCase();
  const regionSource = trip.zone || trip.driverRef?.homeBase || "GLOBAL";
  const region = regionSource ? regionSource.trim().toUpperCase() : "GLOBAL";
  const unitCode = (trip.unit || trip.unitRef?.code || "").trim();

  const baseWageRegion = await getRate("BASE_WAGE", `${type}_${region}`);
  const baseWageType = baseWageRegion || (await getRate("BASE_WAGE", type));
  const baseWage = baseWageType || (await getRate("BASE_WAGE"));

  const safetyPct = await getRate("SAFETY_PCT");
  const benefitsPct = await getRate("BENEFITS_PCT");
  const perfPct = await getRate("PERF_PCT");
  const stepPct = await getRate("STEP_PCT");

  const wageCPM = baseWage * (1 + safetyPct + benefitsPct + perfPct + stepPct);

  const truckRm = await getRate("TRK_RM_CPM");
  const trailerRm = await getRate("TRL_RM_CPM");
  const fuelCpm = await getRate("FUEL_CPM", type) || (await getRate("FUEL_CPM"));
  const rollingCPM = truckRm + trailerRm + fuelCpm;

  const { BC, DH, PICK, DEL } = countEvents(trip);
  const bcPer = await getRate("BC_PER");
  const dhPer = await getRate("DH_PER");
  const pickPer = await getRate("PICK_PER");
  const delPer = await getRate("DEL_PER");
  const addOnsTotal = BC * bcPer + DH * dhPer + PICK * pickPer + DEL * delPer;
  const addOnsCPM = addOnsTotal / miles;

  const weeklyFixedBase =
    (await getRate("MISC_WK")) +
    (await getRate("SGA_WK")) +
    (await getRate("DTOPS_WK")) +
    (await getRate("ISSAC_WK")) +
    (await getRate("PP_WK")) +
    (await getRate("INS_WK")) +
    (await getRate("TRAILER_WK"));
  const truckWeeklyCost = await truckWeekly(unitCode);
  const weeklyFixed = weeklyFixedBase + truckWeeklyCost;

  const tripWeekStart = trip.weekStart
    ? startOfWeek(trip.weekStart, { weekStartsOn: 1 })
    : startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekMiles = await sumWeekMiles(unitCode, tripWeekStart);
  const fixedCPM = weekMiles > 0 ? weeklyFixed / weekMiles : 0;

  const totalCPM = fixedCPM + wageCPM + addOnsCPM + rollingCPM;
  const totalCost = totalCPM * miles;

  const profit = revenueValue !== null ? revenueValue - totalCost : null;
  const marginPct = revenueValue && revenueValue !== 0 ? profit! / revenueValue : null;

  const updatedTrip = await prisma.trip.update({
    where: { id: trip.id },
    data: {
      fixedCPM: toDecimal(fixedCPM),
      wageCPM: toDecimal(wageCPM),
      addOnsCPM: toDecimal(addOnsCPM),
      rollingCPM: toDecimal(rollingCPM),
      totalCPM: toDecimal(totalCPM),
      totalCost: toDecimal(totalCost),
      profit: profit === null ? null : toDecimal(profit),
      marginPct: marginPct === null ? null : toDecimal(marginPct),
    },
    include: {
      events: true,
      driverRef: true,
      unitRef: true,
    },
  });

  return {
    trip: updatedTrip,
    cost: {
      fixedCPM,
      wageCPM,
      addOnsCPM,
      rollingCPM,
      totalCPM,
      totalCost,
      profit: profit ?? null,
      marginPct: marginPct ?? null,
    },
  };
}
