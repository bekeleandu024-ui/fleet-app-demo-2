import type { Trip, TripEvent } from "@prisma/client";
import { Prisma } from "@prisma/client";

import type { LoggedTripEvent, TripCostingSnapshot } from "@/types/trip";

const { Decimal } = Prisma;

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (value instanceof Decimal) {
    return value.toNumber();
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function buildTripCostingSnapshot(trip: Trip): TripCostingSnapshot {
  const revenue = trip.revenue != null ? toNumber(trip.revenue) : 0;
  const expectedRevenue =
    trip.expectedRevenue != null ? toNumber(trip.expectedRevenue) : revenue;

  return {
    id: trip.id,
    driver: trip.driver ?? null,
    unit: trip.unit ?? null,
    status: trip.status ?? null,
    miles: toNumber(trip.miles),
    revenue,
    expectedRevenue,
    fixedCPM: toNumber(trip.fixedCPM),
    wageCPM: toNumber(trip.wageCPM),
    rollingCPM: toNumber(trip.rollingCPM),
    addOnsCPM: toNumber(trip.addOnsCPM),
    totalVariableCPM: toNumber(trip.totalVariableCPM),
    totalCPM: toNumber(trip.totalCPM),
    variableCost: toNumber(trip.variableCost),
    fixedCost: toNumber(trip.fixedCost),
    totalCost: toNumber(trip.totalCost),
    profit: toNumber(trip.profit),
    marginPct: toNumber(trip.marginPct),
    borderCrossings: trip.borderCrossings ?? 0,
    pickups: trip.pickups ?? 0,
    deliveries: trip.deliveries ?? 0,
    dropHooks: trip.dropHooks ?? 0,
  };
}

export function serializeTripEventForClient(event: TripEvent): LoggedTripEvent {
  return {
    id: event.id,
    tripId: event.tripId,
    eventType: event.eventType,
    stopId: event.stopId ?? null,
    stopLabel: event.stopLabel ?? null,
    notes: event.notes ?? null,
    odometerMiles:
      typeof event.odometerMiles === "number" && Number.isFinite(event.odometerMiles)
        ? event.odometerMiles
        : null,
    lat:
      typeof event.lat === "number" && Number.isFinite(event.lat)
        ? event.lat
        : null,
    lon:
      typeof event.lon === "number" && Number.isFinite(event.lon)
        ? event.lon
        : null,
    at: event.at.toISOString(),
  };
}
