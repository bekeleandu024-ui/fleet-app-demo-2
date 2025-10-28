import { Prisma, type Driver, type Trip, type Unit } from "@prisma/client";

import prisma from "@/src/lib/prisma";

export type DriverType = "COM" | "OO" | "RNR";

export interface TripInput {
  driverId: string;
  unitId: string;
  originLat: number;
  originLon: number;
  destinationLat: number;
  destinationLon: number;
  tripDistance: number;
  zone?: string;
  borderCrossings: number;
  pickups: number;
  deliveries: number;
  drops: number;
  expectedRevenue: number;
}

export interface TripCostBreakdown {
  wageCPM: number;
  rollingCPM: number;
  addOnCPM: number;
  totalVariableCPM: number;
  variableCost: number;
  fixedCost: number;
  totalCost: number;
  profit: number;
  margin: number;
}

interface RateMap {
  [key: string]: number;
}

interface WagePercentages {
  benefitsPct: number;
  perfPct: number;
  safetyPct: number;
  stepPct: number;
}

const WEEKLY_MILES_ESTIMATE = 2500;

function buildRateKey(rateKey: string, category: string): string {
  return `${rateKey}_${category}`.toUpperCase();
}

export async function getRatesFromDB(): Promise<RateMap> {
  const rateSettings = await prisma.rateSetting.findMany();

  return rateSettings.reduce<RateMap>((acc, rate) => {
    const key = buildRateKey(rate.rateKey, rate.category);
    acc[key] = Number(rate.value);
    return acc;
  }, {});
}

function getRateOrThrow(rateMap: RateMap, rateKey: string, category: string): number {
  const key = buildRateKey(rateKey, category);
  if (!(key in rateMap)) {
    throw new Error(`Missing required rate setting for ${rateKey} (${category})`);
  }

  return rateMap[key];
}

function getOptionalRate(rateMap: RateMap, rateKey: string, category: string): number | null {
  const key = buildRateKey(rateKey, category);
  return key in rateMap ? rateMap[key] : null;
}

function sumWeeklyOverheads(rateMap: RateMap): number {
  return Object.entries(rateMap).reduce((total, [key, value]) => {
    if (key.endsWith("_WK_GLOBAL")) {
      return total + value;
    }
    return total;
  }, 0);
}

export function calculateWageCPM(baseWage: number, percentages: WagePercentages): number {
  const loadFactor =
    1 +
    percentages.benefitsPct +
    percentages.perfPct +
    percentages.safetyPct +
    percentages.stepPct;
  return baseWage * loadFactor;
}

export function calculateRollingCPM(
  driverType: DriverType,
  values: {
    truckMaintenanceCPM: number;
    trailerMaintenanceCPM: number;
    fuelCPM: number;
    excludeTruckMaintenanceForOO?: boolean;
  },
): number {
  const truckMaintenance =
    values.excludeTruckMaintenanceForOO && driverType === "OO"
      ? 0
      : values.truckMaintenanceCPM;
  return truckMaintenance + values.trailerMaintenanceCPM + values.fuelCPM;
}

export function calculateAddOnCPM(
  events: { borderCrossings: number; pickups: number; deliveries: number; drops: number },
  eventRates: { borderCrossing: number; pickup: number; delivery: number; dropHook: number },
  miles: number,
): number {
  if (miles <= 0) {
    return 0;
  }

  const totalAddOnCost =
    events.borderCrossings * eventRates.borderCrossing +
    events.pickups * eventRates.pickup +
    events.deliveries * eventRates.delivery +
    events.drops * eventRates.dropHook;

  return totalAddOnCost / miles;
}

export function calculateFixedCost(
  tripDistance: number,
  weeklyMilesEstimate: number,
  truckWeeklyCost: number,
  overheadsWeekly: number,
): number {
  if (tripDistance <= 0 || weeklyMilesEstimate <= 0) {
    return 0;
  }

  const costPerTrip = (tripDistance / weeklyMilesEstimate) * (truckWeeklyCost + overheadsWeekly);
  return costPerTrip;
}

function toDriverType(value: string | null | undefined): DriverType {
  const normalized = value?.toUpperCase() as DriverType | undefined;
  if (!normalized || !["COM", "OO", "RNR"].includes(normalized)) {
    throw new Error(`Unsupported or missing driver type: ${value ?? "unknown"}`);
  }
  return normalized;
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }
  return typeof value === "number" ? value : Number(value);
}

export async function calculateTripCost(input: TripInput): Promise<TripCostBreakdown> {
  const [driver, unit, rateMap] = await Promise.all([
    prisma.driver.findUnique({ where: { id: input.driverId } }),
    prisma.unit.findUnique({ where: { id: input.unitId } }),
    getRatesFromDB(),
  ]);

  if (!driver) {
    throw new Error("Driver not found");
  }

  if (!unit) {
    throw new Error("Unit not found");
  }

  const driverType = toDriverType(driver.type ?? undefined);
  const miles = input.tripDistance;
  const hasDistance = miles > 0;

  let zoneKey: string;
  if (driverType === "OO") {
    const zone = input.zone ?? undefined;
    if (!zone) {
      throw new Error("Owner-operator trips require a zone");
    }
    zoneKey = zone.toUpperCase();
  } else {
    zoneKey = driverType;
  }

  const baseWage = getRateOrThrow(rateMap, "BASE_WAGE", zoneKey);

  const wagePercentages: WagePercentages = {
    benefitsPct: getRateOrThrow(rateMap, "BENEFITS_PCT", "GLOBAL"),
    perfPct: getRateOrThrow(rateMap, "PERF_PCT", "GLOBAL"),
    safetyPct: getRateOrThrow(rateMap, "SAFETY_PCT", "GLOBAL"),
    stepPct: getRateOrThrow(rateMap, "STEP_PCT", "GLOBAL"),
  };

  const truckMaintenanceCPM = getRateOrThrow(rateMap, "TRK_RM_CPM", "GLOBAL");
  const trailerMaintenanceCPM = getRateOrThrow(rateMap, "TRL_RM_CPM", "GLOBAL");

  let fuelCPMCategory: string;
  if (driverType === "OO") {
    fuelCPMCategory = "OO";
  } else if (driverType === "RNR") {
    fuelCPMCategory = getOptionalRate(rateMap, "FUEL_CPM", "RNR") != null ? "RNR" : "COM";
  } else {
    fuelCPMCategory = "COM";
  }

  const fuelCPM = getRateOrThrow(rateMap, "FUEL_CPM", fuelCPMCategory);

  const addOnCPM = hasDistance
    ? calculateAddOnCPM(
        {
          borderCrossings: input.borderCrossings,
          pickups: input.pickups,
          deliveries: input.deliveries,
          drops: input.drops,
        },
        {
          borderCrossing: getRateOrThrow(rateMap, "BC_PER", "GLOBAL"),
          pickup: getRateOrThrow(rateMap, "PICK_PER", "GLOBAL"),
          delivery: getRateOrThrow(rateMap, "DEL_PER", "GLOBAL"),
          dropHook: getRateOrThrow(rateMap, "DH_PER", "GLOBAL"),
        },
        miles,
      )
    : 0;

  const wageCPM = hasDistance ? calculateWageCPM(baseWage, wagePercentages) : 0;

  const rollingCPM = hasDistance
    ? calculateRollingCPM(driverType, {
        truckMaintenanceCPM,
        trailerMaintenanceCPM,
        fuelCPM,
      })
    : 0;

  const totalVariableCPM = hasDistance ? wageCPM + rollingCPM + addOnCPM : 0;
  const variableCost = hasDistance ? totalVariableCPM * miles : 0;

  const truckWeeklyCostRaw = decimalToNumber(unit.weeklyFixedCost);
  const truckWeeklyCost = truckWeeklyCostRaw ?? 0;
  const overheadsWeekly = sumWeeklyOverheads(rateMap);

  const fixedCost = calculateFixedCost(miles, WEEKLY_MILES_ESTIMATE, truckWeeklyCost, overheadsWeekly);
  const totalCost = variableCost + fixedCost;

  const expectedRevenue = input.expectedRevenue;
  const profit = expectedRevenue - totalCost;
  const margin = expectedRevenue > 0 ? profit / expectedRevenue : 0;

  return {
    wageCPM,
    rollingCPM,
    addOnCPM,
    totalVariableCPM,
    variableCost,
    fixedCost,
    totalCost,
    profit,
    margin,
  };
}

function ensureDriverAndUnit(driverId: string, unitId: string): Promise<[Driver, Unit]> {
  return Promise.all([
    prisma.driver.findUniqueOrThrow({ where: { id: driverId } }),
    prisma.unit.findUniqueOrThrow({ where: { id: unitId } }),
  ]);
}

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function serializeTrip(trip: Trip): Record<string, unknown> {
  const replacer = (_key: string, value: unknown) => {
    if (value instanceof Prisma.Decimal) {
      return value.toNumber();
    }
    return value;
  };

  return JSON.parse(JSON.stringify(trip, replacer)) as Record<string, unknown>;
}

export async function saveTripToDB(
  input: TripInput,
  breakdown: TripCostBreakdown,
): Promise<Record<string, unknown>> {
  const [driver, unit] = await ensureDriverAndUnit(input.driverId, input.unitId);
  const driverType = driver.type ?? null;

  const createdTrip = await prisma.trip.create({
    data: {
      driverId: input.driverId,
      unitId: input.unitId,
      driver: driver.name,
      unit: unit.code,
      type: driverType,
      zone: input.zone ?? null,
      borderCrossings: input.borderCrossings,
      pickups: input.pickups,
      deliveries: input.deliveries,
      dropHooks: input.drops,
      miles: toDecimal(input.tripDistance),
      expectedRevenue: toDecimal(input.expectedRevenue),
      revenue: toDecimal(input.expectedRevenue),
      wageCPM: toDecimal(breakdown.wageCPM),
      rollingCPM: toDecimal(breakdown.rollingCPM),
      addOnsCPM: toDecimal(breakdown.addOnCPM),
      totalVariableCPM: toDecimal(breakdown.totalVariableCPM),
      totalCPM: toDecimal(breakdown.totalVariableCPM),
      variableCost: toDecimal(breakdown.variableCost),
      fixedCost: toDecimal(breakdown.fixedCost),
      totalCost: toDecimal(breakdown.totalCost),
      profit: toDecimal(breakdown.profit),
      marginPct: toDecimal(breakdown.margin),
      originLat: input.originLat,
      originLon: input.originLon,
      destLat: input.destinationLat,
      destLon: input.destinationLon,
      status: "Booked",
    },
  });

  return serializeTrip(createdTrip);
}
