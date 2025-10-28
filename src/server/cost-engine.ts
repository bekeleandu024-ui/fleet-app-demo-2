import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { addDays, startOfWeek } from "@/lib/date-utils";
import type { SuggestionSummary } from "./analyze-order";

const { Decimal } = Prisma;

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  if (value instanceof Decimal) return Number(value);
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  if (value instanceof Decimal) return Number(value);
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function toDecimal(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  return new Decimal(value);
}

async function getRate(rule: string, category?: string) {
  const normalized = category?.trim();
  if (normalized) {
    const specific = await prisma.rateSetting.findUnique({
      where: { rateKey_category: { rateKey: rule, category: normalized } },
    });
    if (specific) return toNumber(specific.value);
  }

  const fallbacks = ["GLOBAL", "*"];
  for (const fallback of fallbacks) {
    const match = await prisma.rateSetting.findUnique({
      where: { rateKey_category: { rateKey: rule, category: fallback } },
    });
    if (match) return toNumber(match.value);
  }

  return 0;
}

async function sumWeekMiles(unitCode: string | null | undefined, weekStart: Date) {
  if (!unitCode) return 0;
  const periodStart = startOfWeek(weekStart, 1);
  const periodEnd = addDays(periodStart, 7);
  const aggregate = await prisma.trip.aggregate({
    _sum: { miles: true },
    where: {
      unit: unitCode,
      weekStart: { gte: periodStart, lt: periodEnd },
    },
  });
  return toNumber(aggregate._sum.miles);
}

function countEvents(trip: { events: Array<{ type: string | null }> }) {
  const counters = {
    BC: 0,
    DH: 0,
    PICK: 0,
    DEL: 0,
  };

  for (const event of trip.events) {
    const type = event.type?.toUpperCase();
    if (!type) {
      continue;
    }
    if (type === "CROSSED_BORDER") {
      counters.BC += 1;
    } else if (type === "DROP_HOOK") {
      counters.DH += 1;
    } else if (type === "ARRIVED_PICKUP") {
      counters.PICK += 1;
    } else if (type === "ARRIVED_DELIVERY") {
      counters.DEL += 1;
    }
  }

  return counters;
}

export type TripCostBreakdown = {
  wageCPM: number;
  rollingCPM: number;
  addOnsCPM: number;
  fixedCPM: number;
  totalCPM: number;
  totalCost: number;
  revenue: number | null;
  profit: number | null;
  marginPct: number | null;
};

export type TripCostResult = {
  tripId: string;
  costBreakdown: TripCostBreakdown;
  summary: SuggestionSummary;
};

export async function recalcTripCost(tripId: string): Promise<TripCostResult> {
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

  const miles = toNumber(trip.actualMiles ?? trip.miles);
  const revenueValue = toNullableNumber(trip.revenue);

  const driverType = trip.driverRef?.type?.trim() || trip.type || "COM";
  const type = driverType.toUpperCase();
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
  const fuelCpm = (await getRate("FUEL_CPM", type)) || (await getRate("FUEL_CPM"));
  const rollingCPM = truckRm + trailerRm + fuelCpm;

  const { BC, DH, PICK, DEL } = countEvents(trip);
  const bcPer = await getRate("BC_PER");
  const dhPer = await getRate("DH_PER");
  const pickPer = await getRate("PICK_PER");
  const delPer = await getRate("DEL_PER");
  const addOnsTotal = BC * bcPer + DH * dhPer + PICK * pickPer + DEL * delPer;
  const addOnsCPM = miles > 0 ? addOnsTotal / miles : 0;

  const weeklyFixedBase =
    (await getRate("MISC_WK")) +
    (await getRate("SGA_WK")) +
    (await getRate("DTOPS_WK")) +
    (await getRate("ISSAC_WK")) +
    (await getRate("PP_WK")) +
    (await getRate("INS_WK")) +
    (await getRate("TRAILER_WK"));

  let truckWeeklyCost = 0;
  if (trip.unitRef?.weeklyFixedCost !== null && trip.unitRef?.weeklyFixedCost !== undefined) {
    truckWeeklyCost = Number(trip.unitRef.weeklyFixedCost);
  } else if (unitCode) {
    truckWeeklyCost = await getRate("TRUCK_WK", unitCode);
  }
  const weeklyFixed = weeklyFixedBase + truckWeeklyCost;

  const tripWeekStart = trip.weekStart ? startOfWeek(trip.weekStart, 1) : startOfWeek(new Date(), 1);
  const weekMiles = await sumWeekMiles(unitCode, tripWeekStart);
  const fixedCPM = weekMiles > 0 ? weeklyFixed / weekMiles : 0;

  const totalCPM = wageCPM + rollingCPM + addOnsCPM + fixedCPM;
  const totalCost = miles > 0 ? totalCPM * miles : 0;
  const profit = revenueValue !== null ? revenueValue - totalCost : null;
  const marginPct = revenueValue && revenueValue !== 0 && profit !== null ? profit / revenueValue : null;

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
      finalMarginPct: marginPct === null ? null : toDecimal(marginPct),
    },
  });

  const summary: SuggestionSummary = {
    textSummary: "Trip cost recalculated",
    why: [
      `Miles: ${miles}`,
      `Total CPM ${(totalCPM).toFixed(2)}`,
      marginPct !== null ? `Margin ${(marginPct * 100).toFixed(1)}%` : "Margin pending revenue",
    ],
    actions: [
      { label: "Apply cost", action: "APPLY" },
      { label: "Adjust inputs", action: "ADJUST" },
      { label: "Dismiss", action: "DISMISS" },
    ],
  };

  return {
    tripId: updatedTrip.id,
    costBreakdown: {
      wageCPM,
      rollingCPM,
      addOnsCPM,
      fixedCPM,
      totalCPM,
      totalCost,
      revenue: revenueValue,
      profit,
      marginPct,
    },
    summary,
  };
}

export type TripCostComputation = Awaited<ReturnType<typeof recalcTripCost>>;
