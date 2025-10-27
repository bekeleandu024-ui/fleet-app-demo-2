export interface BookingOrderInput {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  requiredTruck?: string | null;
  notes?: string | null;
}

export interface BookingDriverInput {
  id: string;
  name: string;
  homeBase?: string | null;
  type?: string | null;
  hoursAvailableToday?: number | null;
  onTimeScore?: number | null;
  preferredCustomers?: string | null;
  blockedCustomers?: string | null;
}

export interface BookingUnitInput {
  id: string;
  code: string;
  type?: string | null;
  homeBase?: string | null;
  restrictions?: string | null;
}

export interface BookingRateInput {
  id: string;
  type?: string | null;
  zone?: string | null;
  rpm?: number | null;
  fuelSurcharge?: number | null;
  fixedCPM?: number | null;
  wageCPM?: number | null;
  addOnsCPM?: number | null;
  rollingCPM?: number | null;
}

export interface DriverEvaluation {
  driverId: string;
  score: number;
  rationale: string[];
}

export interface UnitEvaluation {
  unitId: string;
  score: number;
  rationale: string[];
}

export interface RateSelection {
  rate: BookingRateInput | null;
  score: number;
  rationale: string[];
  inferredType: string | null;
  inferredZone: string | null;
}

export interface RateBreakdown {
  miles: number;
  rpm: number;
  fuelSurcharge: number;
  addOns: number;
  totalCpm: number;
  total: number;
}

export interface BookingSuggestion {
  suggestedDriverId: string | null;
  suggestedDriverName: string | null;
  suggestedUnitId: string | null;
  suggestedUnitCode: string | null;
  suggestedRateId: string | null;
  tripType: string | null;
  tripZone: string | null;
  rate: RateBreakdown;
  reasoning: {
    summary: string;
    driver: string;
    unit: string;
    rate: string;
    highlights: string[];
  };
  diagnostics: {
    driverScores: DriverEvaluation[];
    unitScores: UnitEvaluation[];
    rateRationale: string[];
  };
}

const KNOWN_LANES: Record<string, number> = {
  "toronto>detroit": 230,
  "toronto>chicago": 520,
  "detroit>toronto": 230,
  "windsor>ohio": 180,
  "montreal>new york": 370,
  "chicago>atlanta": 715,
  "laredo>toronto": 1550,
  "laredo>detroit": 1520,
  "windsor>chicago": 330,
  "hamilton>detroit": 250,
};

function normalizeToken(value?: string | null) {
  return value ? value.trim().toLowerCase() : "";
}

function regionFromLocation(value?: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  const regionMatch = normalized.match(/,\s*([a-z]{2})/i);
  if (regionMatch) {
    return regionMatch[1].toUpperCase();
  }
  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (word.length === 2 && /[a-z]/i.test(word)) {
      return word.toUpperCase();
    }
  }
  return null;
}

function estimateMiles(origin: string, destination: string) {
  const key = `${normalizeToken(origin)}>${normalizeToken(destination)}`;
  if (key in KNOWN_LANES) {
    return KNOWN_LANES[key];
  }
  const reverseKey = `${normalizeToken(destination)}>${normalizeToken(origin)}`;
  if (reverseKey in KNOWN_LANES) {
    return KNOWN_LANES[reverseKey];
  }
  const baseline = 250;
  const variability = Math.min(900, Math.abs(origin.length - destination.length) * 18 + origin.split(",").length * 40);
  const hasBorder = /ontario|toronto|windsor|montreal/i.test(origin + destination) &&
    /(detroit|michigan|new york|ohio)/i.test(destination + origin);
  const miles = baseline + variability + (hasBorder ? 120 : 0);
  return Math.max(180, Math.round(miles / 5) * 5);
}

function contains(value: string | null | undefined, search: string) {
  return value ? value.toLowerCase().includes(search.toLowerCase()) : false;
}

export function evaluateDriverFit(driver: BookingDriverInput, order: BookingOrderInput): DriverEvaluation {
  let score = 25;
  const rationale: string[] = [];

  if (driver.blockedCustomers && contains(driver.blockedCustomers, order.customer)) {
    rationale.push(`Blocked for customer ${order.customer}`);
    return { driverId: driver.id, score: -100, rationale };
  }

  if (driver.preferredCustomers && contains(driver.preferredCustomers, order.customer)) {
    score += 25;
    rationale.push(`Preferred customer ${order.customer}`);
  }

  const driverRegion = regionFromLocation(driver.homeBase);
  const originRegion = regionFromLocation(order.origin);
  const destinationRegion = regionFromLocation(order.destination);
  if (driver.homeBase && contains(order.origin, driver.homeBase)) {
    score += 35;
    rationale.push(`Home base near origin (${driver.homeBase})`);
  } else if (driverRegion && originRegion && driverRegion === originRegion) {
    score += 28;
    rationale.push(`Same origin region (${originRegion})`);
  } else if (driverRegion && destinationRegion && driverRegion === destinationRegion) {
    score += 18;
    rationale.push(`Positioned for destination (${driverRegion})`);
  }

  if (driver.hoursAvailableToday != null) {
    const hoursScore = Math.min(30, driver.hoursAvailableToday * 3);
    score += hoursScore;
    rationale.push(`Hours available today: ${driver.hoursAvailableToday.toFixed(1)}h`);
  }

  if (driver.onTimeScore != null) {
    const reliabilityScore = Math.min(20, driver.onTimeScore / 5);
    score += reliabilityScore;
    rationale.push(`On-time score ${Math.round(driver.onTimeScore)}%`);
  }

  if (order.requiredTruck && driver.type) {
    if (contains(driver.type, order.requiredTruck)) {
      score += 12;
      rationale.push(`Matches required equipment (${driver.type})`);
    } else {
      score -= 15;
      rationale.push(`Equipment mismatch (${driver.type} vs ${order.requiredTruck})`);
    }
  }

  return {
    driverId: driver.id,
    score,
    rationale,
  };
}

export function evaluateUnitFit(unit: BookingUnitInput, order: BookingOrderInput): UnitEvaluation {
  let score = 20;
  const rationale: string[] = [];

  if (unit.restrictions && (contains(unit.restrictions, order.customer) || contains(unit.restrictions, order.destination))) {
    rationale.push("Unit restriction conflict");
    return { unitId: unit.id, score: -100, rationale };
  }

  const unitRegion = regionFromLocation(unit.homeBase);
  const originRegion = regionFromLocation(order.origin);
  if (unit.homeBase && contains(order.origin, unit.homeBase)) {
    score += 28;
    rationale.push(`Unit based at origin (${unit.homeBase})`);
  } else if (unitRegion && originRegion && unitRegion === originRegion) {
    score += 20;
    rationale.push(`Unit region aligns (${unitRegion})`);
  }

  if (order.requiredTruck && unit.type) {
    if (contains(unit.type, order.requiredTruck)) {
      score += 18;
      rationale.push(`Equipment type ${unit.type} fits requirement`);
    } else {
      score -= 12;
      rationale.push(`Equipment mismatch (${unit.type} vs ${order.requiredTruck})`);
    }
  }

  return {
    unitId: unit.id,
    score,
    rationale,
  };
}

function inferZone(order: BookingOrderInput) {
  const originRegion = regionFromLocation(order.origin);
  const destinationRegion = regionFromLocation(order.destination);
  if (originRegion && destinationRegion) {
    if (originRegion === "ON" && destinationRegion === "MI") {
      return "ON-MI";
    }
    if (originRegion === "ON" && destinationRegion === "NY") {
      return "ON-NY";
    }
    if (originRegion === destinationRegion) {
      return `${originRegion}-INTRA`;
    }
    return `${originRegion}-${destinationRegion}`;
  }
  if (/toronto|ontario/i.test(order.origin) && /detroit|michigan/i.test(order.destination)) {
    return "ON-MI";
  }
  if (/laredo/i.test(order.origin) || /laredo/i.test(order.destination)) {
    return "NAFTA-SOUTH";
  }
  return "GENERAL";
}

export function pickBestRate(order: BookingOrderInput, rates: BookingRateInput[]): RateSelection {
  const zone = inferZone(order);
  let best: BookingRateInput | null = null;
  let bestScore = -Infinity;
  let bestRationale: string[] = [];
  let inferredType: string | null = null;

  for (const rate of rates) {
    let score = 0;
    const rationale: string[] = [];

    if (rate.zone) {
      if (rate.zone === zone) {
        score += 45;
        rationale.push(`Exact zone match (${rate.zone})`);
      } else if (zone.includes(rate.zone) || rate.zone.includes(zone)) {
        score += 25;
        rationale.push(`Close zone match (${rate.zone})`);
      }
    }

    if (rate.type && order.requiredTruck) {
      if (contains(rate.type, order.requiredTruck)) {
        score += 18;
        rationale.push(`Rate type ${rate.type} matches equipment`);
      }
    }

    const rpm = rate.rpm ?? (rate.fixedCPM ?? 0) + (rate.wageCPM ?? 0) + (rate.rollingCPM ?? 0);
    if (rpm) {
      score += rpm * 12;
      rationale.push(`RPM strength at ${rpm.toFixed(2)}`);
    }

    if (score > bestScore) {
      best = rate;
      bestScore = score;
      bestRationale = rationale;
      inferredType = rate.type ?? (order.requiredTruck ? `${order.requiredTruck} Linehaul` : "Linehaul");
    }
  }

  if (!best) {
    const fallback = rates[0] ?? null;
    best = fallback;
    bestScore = fallback ? 10 : 0;
    bestRationale = fallback ? ["Fallback to first available rate"] : ["No rate templates configured"];
    inferredType = fallback?.type ?? "Linehaul";
  }

  const inferredZone = best?.zone ?? zone;

  return {
    rate: best,
    score: bestScore,
    rationale: bestRationale,
    inferredType,
    inferredZone,
  };
}

function buildRateBreakdown(order: BookingOrderInput, rate: BookingRateInput | null) {
  const miles = estimateMiles(order.origin, order.destination);
  const rpm = rate?.rpm ?? (rate ? (rate.fixedCPM ?? 0) + (rate.wageCPM ?? 0) + (rate.rollingCPM ?? 0) + (rate.addOnsCPM ?? 0) : 3.05);
  const fuel = rate?.fuelSurcharge ?? 0.45;
  const addOns = rate?.addOnsCPM ?? 0.12;
  const totalCpm = rpm + fuel + addOns;
  const total = totalCpm * miles;

  return {
    miles,
    rpm: Number(rpm.toFixed(2)),
    fuelSurcharge: Number(fuel.toFixed(2)),
    addOns: Number(addOns.toFixed(2)),
    totalCpm: Number(totalCpm.toFixed(2)),
    total: Number(total.toFixed(2)),
  } satisfies RateBreakdown;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateBookingSuggestion(
  order: BookingOrderInput,
  drivers: BookingDriverInput[],
  units: BookingUnitInput[],
  rates: BookingRateInput[]
): Promise<BookingSuggestion> {
  await delay(500 + Math.random() * 400);

  const driverScores = drivers.map((driver) => evaluateDriverFit(driver, order)).sort((a, b) => b.score - a.score);
  const unitScores = units.map((unit) => evaluateUnitFit(unit, order)).sort((a, b) => b.score - a.score);
  const rateSelection = pickBestRate(order, rates);
  const rateBreakdown = buildRateBreakdown(order, rateSelection.rate);

  const bestDriver = driverScores[0] ? drivers.find((driver) => driver.id === driverScores[0].driverId) ?? null : null;
  const bestUnit = unitScores[0] ? units.find((unit) => unit.id === unitScores[0].unitId) ?? null : null;
  const topDriverRationale = driverScores[0]?.rationale ?? [];
  const topUnitRationale = unitScores[0]?.rationale ?? [];

  const summaryParts: string[] = [];
  if (bestDriver) {
    summaryParts.push(`${bestDriver.name} positioned ${bestDriver.homeBase ? `near ${bestDriver.homeBase}` : "for lane"}`);
  }
  if (bestUnit) {
    summaryParts.push(`Unit ${bestUnit.code} ready`);
  }
  summaryParts.push(`Rate targeting ${rateSelection.inferredZone ?? "General"} at $${rateBreakdown.totalCpm.toFixed(2)}/mi`);

  return {
    suggestedDriverId: bestDriver?.id ?? null,
    suggestedDriverName: bestDriver?.name ?? null,
    suggestedUnitId: bestUnit?.id ?? null,
    suggestedUnitCode: bestUnit?.code ?? null,
    suggestedRateId: rateSelection.rate?.id ?? null,
    tripType: rateSelection.inferredType,
    tripZone: rateSelection.inferredZone,
    rate: rateBreakdown,
    reasoning: {
      summary: summaryParts.join(" • "),
      driver: bestDriver
        ? [bestDriver.name, ...topDriverRationale].join(" — ")
        : "No active driver available",
      unit: bestUnit
        ? [bestUnit.code, ...topUnitRationale].join(" — ")
        : "No suitable unit available",
      rate: [rateSelection.inferredZone ?? "General", ...rateSelection.rationale].join(" — "),
      highlights: [
        bestDriver && topDriverRationale[0] ? topDriverRationale[0] : bestDriver ? `${bestDriver.name} available` : "",
        bestUnit && topUnitRationale[0] ? topUnitRationale[0] : bestUnit ? `${bestUnit.code} ready` : "",
        rateSelection.rationale[0] ?? "Balanced pricing",
      ].filter(Boolean),
    },
    diagnostics: {
      driverScores,
      unitScores,
      rateRationale: rateSelection.rationale,
    },
  };
}
