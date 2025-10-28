import type { Order, Driver, Unit } from "@prisma/client";

import { fetchUnitLocations } from "@/src/server/integrations/telematics";
import { getRouteEstimate } from "@/src/server/integrations/routing";
import { getLaneRate } from "@/src/server/integrations/marketRates";

export interface BookingSuggestionResult {
  selectedRateId: string | null;
  selectedRateLabel: string;
  suggestedDriver: {
    id: string | null;
    name: string;
    reason: string;
  };
  suggestedUnit: {
    id: string | null;
    code: string;
    reason: string;
  };
  suggestedRate: {
    rpmMarket: number;
    rpmQuoted: number;
    totalCPM: number;
    estMarginPct: number;
  };
  etaEstimate: {
    miles: number;
    etaMinutes: number;
    trafficNote: string;
  };
  notesForDispatcher: string;
}

type OrderInput = Pick<
  Order,
  | "id"
  | "customer"
  | "origin"
  | "destination"
  | "requiredTruck"
  | "notes"
>; // extend when needed

type DriverInput = Pick<
  Driver,
  "id" | "name" | "homeBase" | "hoursAvailableToday" | "onTimeScore" | "type" | "preferredCustomers" | "blockedCustomers"
>;

type UnitInput = Pick<
  Unit,
  "id" | "code" | "type" | "homeBase" | "status" | "isOnHold" | "active"
> & {
  lastKnownLat?: number | null;
  lastKnownLon?: number | null;
};

type RateInput = {
  id: string;
  type: string | null;
  zone: string | null;
  fixedCPM: number | Prisma.Decimal | null;
  wageCPM: number | Prisma.Decimal | null;
  addOnsCPM: number | Prisma.Decimal | null;
  fuelCPM: number | Prisma.Decimal | null;
  truckMaintCPM: number | Prisma.Decimal | null;
  trailerMaintCPM: number | Prisma.Decimal | null;
  rollingCPM: number | Prisma.Decimal | null;
};

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatReason(parts: string[]) {
  return parts.filter(Boolean).join(" · ");
}

function deriveZones(order: OrderInput) {
  const originZone = /toronto|gta|ontario/i.test(order.origin) ? "GTA" : "PRIMARY";
  const destZone = /chicago|il|illinois/i.test(order.destination) ? "CHI" : /new york|nyc|ny/i.test(order.destination) ? "NYC" : "PRIMARY";
  return { originZone, destZone };
}

function computeCpm(rate: RateInput | null) {
  if (!rate) return 0;
  const fuel = toNumber(rate.fuelCPM);
  const truckMaint = toNumber(rate.truckMaintCPM);
  const trailerMaint = toNumber(rate.trailerMaintCPM);
  const rolling = fuel + truckMaint + trailerMaint;
  const fallbackRolling = rolling > 0 ? rolling : toNumber(rate.rollingCPM);
  return toNumber(rate.fixedCPM) + toNumber(rate.wageCPM) + toNumber(rate.addOnsCPM) + fallbackRolling;
}

function chooseRate(rates: RateInput[], zoneKey: string) {
  const normalized = zoneKey.toUpperCase();
  return (
    rates.find((rate) => (rate.zone ?? "").toUpperCase().includes(normalized)) ??
    rates.find((rate) => (rate.type ?? "").toUpperCase().includes(normalized)) ??
    rates[0] ?? null
  );
}

function chooseDriver(drivers: DriverInput[], order: OrderInput) {
  const blocked = drivers.filter((driver) => {
    if (!driver.blockedCustomers) return false;
    return driver.blockedCustomers.toLowerCase().includes(order.customer.toLowerCase());
  });
  if (blocked.length) {
    drivers = drivers.filter((d) => !blocked.includes(d));
  }
  const preferred = drivers.find((driver) => driver.preferredCustomers?.toLowerCase().includes(order.customer.toLowerCase()));
  if (preferred) return preferred;
  const sameRegion = drivers.find((driver) => driver.homeBase && order.origin.toLowerCase().includes(driver.homeBase.toLowerCase()));
  if (sameRegion) return sameRegion;
  return drivers[0] ?? null;
}

function chooseUnit(units: UnitInput[], telematicsDriverName: string | null) {
  if (!units.length) return null;
  if (telematicsDriverName) {
    const match = units.find((unit) => telematicsDriverName && telematicsDriverName.toLowerCase().includes(unit.code.toLowerCase()));
    if (match) return match;
  }
  return units[0];
}

type RecommendationMeta = {
  dataSources: string;
  advisory: string;
};

type RecommendationDetails = {
  driver: DriverInput | null;
  unit: UnitInput | null;
  rate: { rpm: number; miles: number | null } | null;
  reasonLines: string[];
  meta: RecommendationMeta;
};

function buildRecommendation({
  driver,
  unit,
  laneRate,
  routeEstimate,
}: {
  driver: DriverInput | null;
  unit: UnitInput | null;
  laneRate: { rpm: number; source: string } | null;
  routeEstimate: { miles: number; etaMinutes: number; trafficNote: string } | null;
}): RecommendationDetails {
  const reasonLines: string[] = [
    driver
      ? `Driver: ${driver.name} staged near ${driver.homeBase ?? "fleet base"}`
      : "No active driver found",
    unit
      ? `Unit ${unit.code}`
      : "Unit TBD",
    routeEstimate
      ? `${routeEstimate.miles.toFixed(0)} mi lane, ETA ${(routeEstimate.etaMinutes / 60).toFixed(1)} h`
      : "No route estimate",
  ];

  const dataSources = `Data sources: telematics for positioning, routing API for ETA, market index (${laneRate?.source ?? "n/a"}) for RPM.`;

  const advisory = "This is advisory. Dispatcher approval required.";

  return {
    driver,
    unit,
    rate: laneRate
      ? {
          rpm: laneRate.rpm,
          miles: routeEstimate?.miles ?? null,
        }
      : null,
    reasonLines,
    meta: {
      dataSources,
      advisory,
    },
  };
}

function buildNotes({
  order,
  driver,
  unit,
  laneRate,
  routeEstimate,
  marginPct,
}: {
  order: OrderInput;
  driver: DriverInput | null;
  unit: UnitInput | null;
  laneRate: { rpm: number; source: string };
  routeEstimate: { miles: number; etaMinutes: number; trafficNote: string };
  marginPct: number;
}) {
  const marginAlert =
    marginPct < 0.1
      ? `⚠ Margin ${(marginPct * 100).toFixed(1)}%. Below guardrail (10%). Consider surcharge or decline.`
      : null;

  const recommendation = buildRecommendation({ driver, unit, laneRate, routeEstimate });

  const lines = [
    ...recommendation.reasonLines,
    `Market RPM ${laneRate.rpm.toFixed(2)}`,
    recommendation.meta.dataSources,
    recommendation.meta.advisory,
  ];

  if (marginAlert) {
    lines.unshift(marginAlert);
  }

  // TODO: use LLM with retrieval from driver history, SLA docs, and SOP library to tailor reasoning text.
  return lines.join("\n");
}

export async function generateBookingSuggestion(
  order: OrderInput,
  drivers: DriverInput[],
  units: UnitInput[],
  rates: RateInput[],
): Promise<BookingSuggestionResult> {
  const { originZone, destZone } = deriveZones(order);

  const [telemetry, routeEstimate, laneRate] = await Promise.all([
    fetchUnitLocations(),
    getRouteEstimate(order.origin, order.destination),
    getLaneRate(originZone, destZone),
  ]);

  const telemetryByUnit = new Map(telemetry.map((item) => [item.unitCode.toUpperCase(), item]));

  const driver = chooseDriver(drivers, order);
  const telemetryForDriver = telemetry.find(
    (entry) => driver && entry.driverName?.toLowerCase() === driver.name.toLowerCase(),
  );
  const unit = telemetryForDriver
    ? units.find((candidate) => candidate.code.toUpperCase() === telemetryForDriver.unitCode.toUpperCase()) || chooseUnit(units, telemetryForDriver.driverName)
    : chooseUnit(units, null);

  const rate = chooseRate(rates, `${originZone}>${destZone}`);
  const totalCPM = computeCpm(rate);
  const rpmMarket = laneRate.rpm;
  const rpmQuoted = Number((Math.max(rpmMarket + 0.15, totalCPM + 0.45)).toFixed(2));
  const estRevenue = rpmQuoted * routeEstimate.miles;
  const estCost = totalCPM * routeEstimate.miles;
  const estMarginPct = estRevenue > 0 ? (estRevenue - estCost) / estRevenue : 0;

  const driverReasonParts: string[] = [];
  if (driver) {
    if (driver.homeBase) driverReasonParts.push(`Home base ${driver.homeBase}`);
    if (driver.hoursAvailableToday != null) {
      driverReasonParts.push(`${driver.hoursAvailableToday.toFixed(1)}h HOS remaining (internal)`);
    }
    if (driver.onTimeScore != null) {
      driverReasonParts.push(`On-time ${Math.round(driver.onTimeScore)}%`);
    }
  }
  const driverReason = driverReasonParts.length
    ? `${driver?.name ?? "Unassigned"}: ${formatReason(driverReasonParts)}`
    : "No active driver context. Manual confirmation required.";

  const unitTelemetry = unit ? telemetryByUnit.get(unit.code.toUpperCase()) : null;
  const unitReasonParts: string[] = [];
  if (unit) {
    unitReasonParts.push(`Class ${unit.type ?? "tractor"}`);
    if (unitTelemetry) {
      unitReasonParts.push(`Last ping ${new Date(unitTelemetry.lastSeenAtISO).toLocaleTimeString()} (${unitTelemetry.status})`);
    } else if (unit.lastKnownLat && unit.lastKnownLon) {
      unitReasonParts.push(`Last known ${unit.lastKnownLat.toFixed(2)},${unit.lastKnownLon.toFixed(2)}`);
    }
  }
  const unitReason = unitReasonParts.length
    ? `${unit?.code ?? "Unassigned"}: ${formatReason(unitReasonParts)}`
    : "Assign equipment manually. No telemetry match yet.";

  const notesForDispatcher = buildNotes({ order, driver, unit, laneRate, routeEstimate, marginPct: estMarginPct });

  return {
    selectedRateId: rate?.id ?? null,
    selectedRateLabel: rate?.zone || rate?.type || "Standard",
    suggestedDriver: {
      id: driver?.id ?? null,
      name: driver?.name ?? "Unassigned",
      reason: driverReason,
    },
    suggestedUnit: {
      id: unit?.id ?? null,
      code: unit?.code ?? "TBD",
      reason: unitReason,
    },
    suggestedRate: {
      rpmMarket,
      rpmQuoted,
      totalCPM: Number(totalCPM.toFixed(2)),
      estMarginPct,
    },
    etaEstimate: {
      miles: routeEstimate.miles,
      etaMinutes: routeEstimate.etaMinutes,
      trafficNote: routeEstimate.trafficNote,
    },
    notesForDispatcher,
  };
}
