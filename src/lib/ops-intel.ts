import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { fetchSpotRate } from "@/lib/marketRates";
import { getRouteEstimate } from "@/src/server/integrations/routing";

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
  miles: number | null;
  etaHours: number | null;
  trafficDelayMin: number | null;
  borderDelayMin: number | null;
  crossesBorder: boolean;
};

export type MarketRate = {
  quotedRPM: number | null;
  marketRPM: number | null;
  source: string | null;
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
  try {
    const route = await getRouteEstimate(origin, destination);
    return {
      miles: route.miles,
      etaHours: route.etaMinutes / 60,
      trafficDelayMin: route.trafficDelayMinutes,
      borderDelayMin: route.crossesBorder ? null : 0,
      crossesBorder: route.crossesBorder,
    };
  } catch (error) {
    console.error("Failed to compute routing estimate", error);

    const miles = existingMiles && existingMiles > 0 ? existingMiles : null;

    return {
      miles,
      etaHours: null,
      trafficDelayMin: null,
      borderDelayMin: null,
      crossesBorder: false,
    };
  }
}

export async function getMarketRate(
  origin: string,
  destination: string,
  trip?: TripForOrder | null,
): Promise<MarketRate> {
  const quotedRPM = trip?.revenue && trip?.miles && trip.miles > 0 ? trip.revenue / trip.miles : null;

  try {
    const spot = await fetchSpotRate(origin, destination);
    return {
      quotedRPM,
      marketRPM: spot.rpm,
      source: spot.source,
    };
  } catch (error) {
    console.error("Failed to fetch market rate", error);
    return {
      quotedRPM,
      marketRPM: trip?.marketRPM ?? null,
      source: trip?.marketRPM ? "Internal historical rate" : null,
    };
  }
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
  const milesLine =
    routingEstimate.miles !== null
      ? `${Math.round(routingEstimate.miles)} mi lane`
      : "Lane distance unavailable";
  const etaLine =
    routingEstimate.etaHours !== null ? `ETA ${routingEstimate.etaHours.toFixed(1)} h` : "ETA unavailable";
  lines.push(`${milesLine}${routingEstimate.etaHours !== null ? `, ${etaLine}` : ""}`.trim());

  if (marketRate.marketRPM !== null) {
    lines.push(`Market RPM ${marketRate.marketRPM.toFixed(2)}`);
  }

  return lines;
}
