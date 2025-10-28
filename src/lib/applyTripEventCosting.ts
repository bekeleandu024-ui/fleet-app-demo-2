import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import type { TripEventType } from "@/types/trip";

const { Decimal } = Prisma;

const COST_IMPACTS: Record<TripEventType, number> = {
  TRIP_START: 0,
  ARRIVED_PICKUP: 30,
  LEFT_PICKUP: 0,
  ARRIVED_DELIVERY: 30,
  LEFT_DELIVERY: 0,
  CROSSED_BORDER: 15,
  DROP_HOOK: 15,
  TRIP_FINISHED: 0,
};

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (value instanceof Decimal) {
    return value.toNumber();
  }
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : 0;
}

function toDecimal(value: number): Prisma.Decimal {
  if (!Number.isFinite(value)) {
    return new Decimal(0);
  }
  return new Decimal(value.toFixed(6));
}

function toCurrencyDecimal(value: number): Prisma.Decimal {
  if (!Number.isFinite(value)) {
    return new Decimal(0);
  }
  return new Decimal(value.toFixed(2));
}

export async function applyTripEventCosting(tripId: string, eventType: TripEventType) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      totalCost: true,
      expectedRevenue: true,
      revenue: true,
      borderCrossings: true,
      pickups: true,
      deliveries: true,
      dropHooks: true,
    },
  });

  if (!trip) {
    throw new Error(`Trip ${tripId} not found`);
  }

  const costImpact = COST_IMPACTS[eventType] ?? 0;
  const currentTotalCost = toNumber(trip.totalCost);
  const newTotalCost = currentTotalCost + costImpact;

  const expectedRevenueValue =
    trip.expectedRevenue != null
      ? toNumber(trip.expectedRevenue)
      : trip.revenue != null
      ? toNumber(trip.revenue)
      : 0;

  const profit = expectedRevenueValue - newTotalCost;
  const margin = expectedRevenueValue > 0 ? profit / expectedRevenueValue : 0;

  const updateData: Prisma.TripUpdateInput = {
    totalCost: toCurrencyDecimal(newTotalCost),
    profit: toCurrencyDecimal(profit),
    marginPct: toDecimal(margin),
    addOnsCPM: toDecimal(0),
    totalVariableCPM: toDecimal(0),
    totalCPM: toDecimal(0),
    variableCost: toCurrencyDecimal(0),
  };

  if (eventType === "CROSSED_BORDER") {
    updateData.borderCrossings = (trip.borderCrossings ?? 0) + 1;
  } else if (eventType === "ARRIVED_PICKUP") {
    updateData.pickups = (trip.pickups ?? 0) + 1;
  } else if (eventType === "ARRIVED_DELIVERY") {
    updateData.deliveries = (trip.deliveries ?? 0) + 1;
  } else if (eventType === "DROP_HOOK") {
    updateData.dropHooks = (trip.dropHooks ?? 0) + 1;
  }

  return prisma.trip.update({
    where: { id: tripId },
    data: updateData,
  });
}
