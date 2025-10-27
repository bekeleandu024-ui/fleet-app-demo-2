import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

const { Decimal } = Prisma;

function toDecimal(value: number) {
  if (!Number.isFinite(value)) {
    return new Decimal(0);
  }
  return new Decimal(value.toFixed(6));
}

export async function recalcTripCosting(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      events: true,
    },
  });

  if (!trip) {
    return null;
  }

  const miles = Number(trip.miles ?? 0);
  const fixedCPM = Number(trip.fixedCPM ?? 0);
  const wageCPM = Number(trip.wageCPM ?? 0);
  const rollingCPM = Number(trip.rollingCPM ?? 0);
  const revenue = Number(trip.revenue ?? 0);

  let borderCrossCount = 0;
  let dropHookCount = 0;
  let pickupCount = 0;
  let deliveryCount = 0;

  for (const event of trip.events) {
    const type = event.type?.toUpperCase() ?? "";
    if (type === "BORDER_CROSS") {
      borderCrossCount += 1;
    } else if (type === "DROP_HOOK") {
      dropHookCount += 1;
    } else if (type.startsWith("PICKUP_")) {
      pickupCount += 1;
    } else if (type.startsWith("DELIVERY_")) {
      deliveryCount += 1;
    }
  }

  const rateKeys = ["BC_PER", "DH_PER", "PICK_PER", "DEL_PER"];
  const rateSettings = await prisma.rateSetting.findMany({
    where: {
      rateKey: { in: rateKeys },
      category: "GLOBAL",
    },
  });

  const rates: Record<string, number> = {
    BC_PER: 0,
    DH_PER: 0,
    PICK_PER: 0,
    DEL_PER: 0,
  };

  for (const setting of rateSettings) {
    rates[setting.rateKey] = Number(setting.value ?? 0);
  }

  const BC_PER = rates.BC_PER;
  const DH_PER = rates.DH_PER;
  const PICK_PER = rates.PICK_PER;
  const DEL_PER = rates.DEL_PER;

  const addOnDollars =
    borderCrossCount * BC_PER +
    dropHookCount * DH_PER +
    pickupCount * PICK_PER +
    deliveryCount * DEL_PER;

  const addOnsCPM = miles > 0 ? addOnDollars / miles : 0;
  const totalCPM = fixedCPM + wageCPM + rollingCPM + addOnsCPM;
  const totalCost = miles > 0 ? totalCPM * miles : 0;
  const profit = revenue - totalCost;
  const marginPct = revenue > 0 ? profit / revenue : 0;

  const updatedTrip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      addOnsCPM: toDecimal(addOnsCPM),
      totalCPM: toDecimal(totalCPM),
      totalCost: toDecimal(totalCost),
      profit: toDecimal(profit),
      marginPct: toDecimal(marginPct),
    },
    include: {
      events: true,
      order: true,
    },
  });

  return updatedTrip;
}
