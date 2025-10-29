import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { differenceInMinutes } from "@/lib/date-utils";
import type { TripEventType } from "@/types/trip";

const { Decimal } = Prisma;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function toDecimal(value: number): Prisma.Decimal {
  if (!Number.isFinite(value)) {
    return new Decimal(0);
  }
  return new Decimal(value.toFixed(6));
}

function toDate(value: Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const time = value.getTime();
  return Number.isNaN(time) ? null : value;
}

type RefreshOptions = {
  tripId: string;
  eventType: TripEventType;
  at: Date;
};

export async function refreshTripOperationalStatus({ tripId, eventType, at }: RefreshOptions) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      stops: { orderBy: { seq: "asc" } },
    },
  });

  if (!trip) {
    return;
  }

  const upcomingStop = trip.stops.find((stop) => {
    const scheduledAt = toDate(stop.scheduledAt ?? undefined);
    return scheduledAt != null && scheduledAt.getTime() > at.getTime();
  });

  const firstStop = trip.stops[0];
  const lastStop = trip.stops.at(-1);

  let etaTarget: Date | null = null;
  let delayRisk = trip.delayRiskPct instanceof Decimal ? trip.delayRiskPct.toNumber() : 0.15;

  if (eventType === "TRIP_START") {
    etaTarget = upcomingStop?.scheduledAt ?? lastStop?.scheduledAt ?? null;
    delayRisk = 0.12;
  } else if (eventType === "CROSSED_BORDER") {
    etaTarget = upcomingStop?.scheduledAt ?? lastStop?.scheduledAt ?? null;
    delayRisk = Math.min(0.35, delayRisk + 0.05);
  } else if (eventType === "ARRIVED_DELIVERY" || eventType === "LEFT_DELIVERY") {
    etaTarget = lastStop?.scheduledAt ?? at;
    delayRisk = eventType === "LEFT_DELIVERY" ? 0.05 : 0.08;
  } else if (eventType === "TRIP_FINISHED") {
    etaTarget = at;
    delayRisk = 0;
  } else {
    etaTarget = upcomingStop?.scheduledAt ?? at;
    delayRisk = Math.max(0.05, delayRisk - 0.03);
  }

  if (upcomingStop?.scheduledAt) {
    const minutesRemaining = differenceInMinutes(new Date(upcomingStop.scheduledAt), at);
    if (minutesRemaining <= 0) {
      delayRisk = Math.max(delayRisk, 0.6);
    } else if (minutesRemaining < 60) {
      delayRisk = Math.max(delayRisk, 0.35);
    } else if (minutesRemaining < 120) {
      delayRisk = Math.max(delayRisk, 0.22);
    } else {
      delayRisk = Math.min(delayRisk, 0.15);
    }
  }

  let statusUpdate: string | null = null;
  if (eventType === "TRIP_START") {
    statusUpdate = "In Progress";
  } else if (eventType === "LEFT_DELIVERY" || eventType === "TRIP_FINISHED") {
    statusUpdate = "Completed";
  }

  const updateData: Prisma.TripUpdateInput = {
    lastCheckInAt: at,
    delayRiskPct: toDecimal(clamp01(delayRisk)),
    etaPrediction: etaTarget ?? at,
  };

  if (statusUpdate) {
    updateData.status = statusUpdate;
  }

  if (eventType === "TRIP_START") {
    updateData.tripStart = trip.tripStart ?? at;
    if (firstStop?.scheduledAt) {
      updateData.nextCommitmentAt = firstStop.scheduledAt;
    }
  }

  if (eventType === "LEFT_DELIVERY" || eventType === "TRIP_FINISHED") {
    updateData.tripEnd = at;
    updateData.nextCommitmentAt = null;
  } else if (upcomingStop?.scheduledAt) {
    updateData.nextCommitmentAt = upcomingStop.scheduledAt;
  }

  await prisma.trip.update({
    where: { id: tripId },
    data: updateData,
  });
}
