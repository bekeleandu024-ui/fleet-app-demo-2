import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

const { Decimal } = Prisma;

type TripEventCounter = {
  borderCrossings: number;
  pickups: number;
  deliveries: number;
  dropHooks: number;
};

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

function countTripEvents(events: Array<{ eventType: string }>): TripEventCounter {
  const counters: TripEventCounter = {
    borderCrossings: 0,
    pickups: 0,
    deliveries: 0,
    dropHooks: 0,
  };

  for (const event of events) {
    switch (event.eventType) {
      case "CROSSED_BORDER":
        counters.borderCrossings += 1;
        break;
      case "ARRIVED_PICKUP":
        counters.pickups += 1;
        break;
      case "ARRIVED_DELIVERY":
        counters.deliveries += 1;
        break;
      case "DROP_HOOK":
        counters.dropHooks += 1;
        break;
      default:
        break;
    }
  }

  return counters;
}

function selectRateValue(
  settings: Array<{ rateKey: string; value: Prisma.Decimal }>,
  ...keys: string[]
): number {
  for (const key of keys) {
    const match = settings.find((setting) => setting.rateKey === key);
    if (match) {
      return Number(match.value ?? 0);
    }
  }
  return 0;
}

export async function recalcAddOnsForTrip(tripId: string) {
  const [trip, events, rateSettings] = await Promise.all([
    prisma.trip.findUnique({ where: { id: tripId } }),
    prisma.tripEvent.findMany({
      where: { tripId },
      select: { eventType: true },
    }),
    prisma.rateSetting.findMany({
      where: {
        rateKey: {
          in: [
            "BC_PER_GLOBAL",
            "PICK_PER_GLOBAL",
            "DEL_PER_GLOBAL",
            "DH_PER_GLOBAL",
            "BC_PER",
            "PICK_PER",
            "DEL_PER",
            "DH_PER",
          ],
        },
        category: { in: ["GLOBAL", "DEFAULT"] },
      },
    }),
  ]);

  if (!trip) {
    throw new Error(`Trip ${tripId} not found`);
  }

  const counters = countTripEvents(events);

  const bcRate = selectRateValue(rateSettings, "BC_PER_GLOBAL", "BC_PER");
  const pickupRate = selectRateValue(rateSettings, "PICK_PER_GLOBAL", "PICK_PER");
  const deliveryRate = selectRateValue(rateSettings, "DEL_PER_GLOBAL", "DEL_PER");
  const dropHookRate = selectRateValue(rateSettings, "DH_PER_GLOBAL", "DH_PER");

  const distanceMiles = trip.miles ? Number(trip.miles) : 0;
  const wageCPM = trip.wageCPM ? Number(trip.wageCPM) : 0;
  const rollingCPM = trip.rollingCPM ? Number(trip.rollingCPM) : 0;
  const fixedCost = trip.fixedCost ? Number(trip.fixedCost) : 0;
  const fixedCPM = trip.fixedCPM ? Number(trip.fixedCPM) : 0;
  const expectedRevenue =
    trip.expectedRevenue != null
      ? Number(trip.expectedRevenue)
      : trip.revenue != null
      ? Number(trip.revenue)
      : 0;

  const addOnTotal =
    counters.borderCrossings * bcRate +
    counters.pickups * pickupRate +
    counters.deliveries * deliveryRate +
    counters.dropHooks * dropHookRate;

  const addOnCPM = distanceMiles > 0 ? addOnTotal / distanceMiles : 0;
  const totalVariableCPM = wageCPM + rollingCPM + addOnCPM;
  const variableCost = totalVariableCPM * distanceMiles;
  const totalCost = variableCost + fixedCost;
  const profit = expectedRevenue - totalCost;
  const margin = expectedRevenue > 0 ? profit / expectedRevenue : 0;
  const totalCPM = fixedCPM + totalVariableCPM;

  const updatedTrip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      borderCrossings: counters.borderCrossings,
      pickups: counters.pickups,
      deliveries: counters.deliveries,
      dropHooks: counters.dropHooks,
      addOnsCPM: toDecimal(addOnCPM),
      totalVariableCPM: toDecimal(totalVariableCPM),
      totalCPM: toDecimal(totalCPM),
      variableCost: toCurrencyDecimal(variableCost),
      totalCost: toCurrencyDecimal(totalCost),
      profit: toCurrencyDecimal(profit),
      marginPct: toDecimal(margin),
    },
  });

  return updatedTrip;
}
