import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

export type TripForOrder = {
  id: string;
  driver: string;
  unit: string;
  miles: number | null;
  revenue: number | null;
  fixedCPM: number | null;
  wageCPM: number | null;
  rollingCPM: number | null;
  addOnsCPM: number | null;
  tripStart: Date | null;
  tripEnd: Date | null;
};

export type DriverStatus = {
  name: string;
  homeBase: string;
  lastKnownLocation?: {
    lat?: number;
    lon?: number;
    city?: string;
    state?: string;
  };
  availableHours?: number | null;
};

export type UnitStatus = {
  unitId: string;
  classSpec: string;
  lastKnownLocation?: {
    lat?: number;
    lon?: number;
    city?: string;
    state?: string;
  };
};

export type RoutingEstimate = {
  miles: number;
  etaHours: number;
  trafficDelayMin: number;
  borderDelayMin: number;
};

export type MarketRate = {
  quotedRPM: number | null;
  marketRPM: number;
  source: string;
};

export type MarginProjection = {
  projectedMarginPct: number | null;
  totalCPM: number;
};

function decimalToNumber(value?: Prisma.Decimal | number | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  return Number(value);
}

export async function getTripForOrder(orderId: string): Promise<TripForOrder | null> {
  const trip = await prisma.trip.findFirst({
    where: { orderId },
    orderBy: [
      { tripStart: "desc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      driver: true,
      unit: true,
      miles: true,
      revenue: true,
      fixedCPM: true,
      wageCPM: true,
      rollingCPM: true,
      addOnsCPM: true,
      tripStart: true,
      tripEnd: true,
    },
  });

  if (!trip) {
    return null;
  }

  return {
    id: trip.id,
    driver: trip.driver,
    unit: trip.unit,
    miles: decimalToNumber(trip.miles),
    revenue: decimalToNumber(trip.revenue),
    fixedCPM: decimalToNumber(trip.fixedCPM),
    wageCPM: decimalToNumber(trip.wageCPM),
    rollingCPM: decimalToNumber(trip.rollingCPM),
    addOnsCPM: decimalToNumber(trip.addOnsCPM),
    tripStart: trip.tripStart,
    tripEnd: trip.tripEnd,
  };
}

export async function getDriverStatus(driverName: string): Promise<DriverStatus> {
  const driverRecord = await prisma.driver
    .findUnique({
      where: { name: driverName },
      select: {
        name: true,
        homeBase: true,
        hoursAvailableToday: true,
      },
    })
    .catch(() => null);

  const latestEvent = await prisma.tripEvent.findFirst({
    where: {
      trip: { driver: driverName },
    },
    orderBy: { at: "desc" },
    select: {
      lat: true,
      lon: true,
      stopLabel: true,
      stop: {
        select: {
          city: true,
          state: true,
        },
      },
    },
  });

  return {
    name: driverName,
    homeBase: driverRecord?.homeBase ?? "UNKNOWN",
    lastKnownLocation: latestEvent
      ? {
          lat: latestEvent.lat ?? undefined,
          lon: latestEvent.lon ?? undefined,
          city: latestEvent.stop?.city ?? latestEvent.stopLabel ?? undefined,
          state: latestEvent.stop?.state ?? undefined,
        }
      : undefined,
    availableHours: driverRecord?.hoursAvailableToday ?? 9.2, // TODO: hook up HOS/ELD remaining hours
  };
}

export async function getUnitStatus(unitId: string): Promise<UnitStatus> {
  const unitRecord = await prisma.unit
    .findFirst({
      where: {
        OR: [{ code: unitId }, { id: unitId }],
      },
      select: {
        code: true,
        type: true,
        lastKnownLat: true,
        lastKnownLon: true,
        homeBase: true,
      },
    })
    .catch(() => null);

  return {
    unitId,
    classSpec: unitRecord?.type ?? "Class COM", // TODO: map to real equipment class specs
    lastKnownLocation:
      unitRecord?.lastKnownLat && unitRecord?.lastKnownLon
        ? {
            lat: unitRecord.lastKnownLat,
            lon: unitRecord.lastKnownLon,
            city: unitRecord.homeBase ?? undefined,
          }
        : undefined, // TODO: integrate real telematics ping
  };
}

export async function getRoutingEstimate(
  origin: string,
  destination: string,
  existingMiles?: number | null,
): Promise<RoutingEstimate> {
  const miles = existingMiles && existingMiles > 0 ? existingMiles : 350; // TODO: replace with live routing distance
  const etaHours = miles / 60;

  return {
    miles,
    etaHours,
    trafficDelayMin: 22, // TODO: plug in live traffic delta
    borderDelayMin: origin.includes("ON") || destination.includes("ON") ? 14 : 0, // TODO: replace with border wait API
  };
}

async function fetchSpotRate(origin: string, destination: string): Promise<{ rpm: number; source: string }> {
  // TODO: replace with integration to DAT / Truckstop spot rate services
  return {
    rpm: 2.85,
    source: "MockSpotRate",
  };
}

export async function getMarketRate(
  origin: string,
  destination: string,
  trip?: TripForOrder | null,
): Promise<MarketRate> {
  const spot = await fetchSpotRate(origin, destination);

  const quotedRPM = trip?.revenue && trip?.miles && trip.miles > 0 ? trip.revenue / trip.miles : null;

  return {
    quotedRPM,
    marketRPM: spot.rpm,
    source: spot.source,
  };
}

export function computeMargin(trip?: TripForOrder | null): MarginProjection {
  if (!trip) {
    return {
      projectedMarginPct: null,
      totalCPM: 0,
    };
  }

  const fixed = trip.fixedCPM ?? 0;
  const wage = trip.wageCPM ?? 0;
  const rolling = trip.rollingCPM ?? 0;
  const addOns = trip.addOnsCPM ?? 0;

  const totalCPM = fixed + wage + rolling + addOns;
  const quotedRPM = trip.revenue && trip.miles && trip.miles > 0 ? trip.revenue / trip.miles : null;

  const projectedMarginPct = quotedRPM ? ((quotedRPM - totalCPM) / quotedRPM) * 100 : null;

  return {
    projectedMarginPct,
    totalCPM,
  };
}

export function buildWhyThisAssignment(
  driverStatus: DriverStatus,
  unitStatus: UnitStatus,
  routingEstimate: RoutingEstimate,
  marketRate: MarketRate,
): string[] {
  const lines: string[] = [];

  lines.push(`Driver: ${driverStatus.name} staged near ${driverStatus.homeBase}`);
  lines.push(
    `Unit ${unitStatus.unitId} ${unitStatus.classSpec}` +
      (unitStatus.lastKnownLocation?.city ? ` near ${unitStatus.lastKnownLocation.city}` : ""),
  );
  lines.push(`${Math.round(routingEstimate.miles)} mi lane, ETA ${routingEstimate.etaHours.toFixed(1)} h`);
  lines.push(`Market RPM ${marketRate.marketRPM.toFixed(2)}`);

  return lines;
}
