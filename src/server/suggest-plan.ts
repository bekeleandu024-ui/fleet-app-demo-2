import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import type { SuggestionAction, SuggestionSummary } from "./analyze-order";

const { Decimal } = Prisma;

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return null;
  if (value instanceof Decimal) {
    return Number(value);
  }
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export type SuggestedRate = {
  rpm: number | null;
  cpmBreakdown: {
    wageCPM: number;
    fuelCPM: number;
    truckMaintCPM: number;
    trailerMaintCPM: number;
    addOnsCPM: number;
    fixedCPM: number;
    totalCPM: number;
  };
  marginEstimatePct: number | null;
  warningLowMargin?: boolean;
};

export type SuggestedDriver = {
  driverId: string;
  name: string;
  reason: string;
};

export type SuggestedUnit = {
  unitId: string;
  code: string;
  reason: string;
};

export type PlanSuggestionResult = {
  suggestedRate: SuggestedRate;
  suggestedDriver: SuggestedDriver | null;
  suggestedUnit: SuggestedUnit | null;
  guardrails: string[];
  summary: SuggestionSummary;
};

function buildSummary({
  rate,
  driver,
  unit,
  guardrails,
}: {
  rate: SuggestedRate;
  driver: SuggestedDriver | null;
  unit: SuggestedUnit | null;
  guardrails: string[];
}): SuggestionSummary {
  const why: string[] = [];
  if (driver) {
    why.push(`Driver ${driver.name}: ${driver.reason}`);
  }
  if (unit) {
    why.push(`Unit ${unit.code}: ${unit.reason}`);
  }
  if (rate.marginEstimatePct !== null) {
    why.push(`Estimated margin ${(rate.marginEstimatePct * 100).toFixed(1)}%`);
  }
  if (guardrails.length) {
    why.push(`Guardrails: ${guardrails.join(" | ")}`);
  }

  const actions: SuggestionAction[] = [
    { label: "Accept suggestions", action: "APPLY" },
    { label: "Adjust manually", action: "ADJUST" },
    { label: "Dismiss", action: "DISMISS" },
  ];

  return {
    textSummary: "Plan & price recommendations ready",
    why,
    actions,
  };
}

function pickBestDriver(drivers: Array<{ id: string; name: string; homeBase: string | null; hoursAvailableToday: number | null; onTimeScore: number | null }>, order: { origin: string; destination: string }) {
  if (!drivers.length) return null;
  const sorted = [...drivers].sort((a, b) => {
    const aScore = (a.hoursAvailableToday ?? 0) + (a.onTimeScore ?? 0) * 10;
    const bScore = (b.hoursAvailableToday ?? 0) + (b.onTimeScore ?? 0) * 10;
    return bScore - aScore;
  });
  const top = sorted[0];
  return {
    driverId: top.id,
    name: top.name,
    reason: `${top.homeBase ?? "Unknown base"} base, ${top.hoursAvailableToday ?? 0} hrs free, ${(top.onTimeScore ?? 0.8) * 100}% on-time`,
  } satisfies SuggestedDriver;
}

function pickBestUnit(units: Array<{ id: string; code: string; type: string | null; homeBase: string | null; isOnHold: boolean; status: string | null }>) {
  const available = units.filter((unit) => !unit.isOnHold && (unit.status ?? "Available") === "Available");
  if (!available.length) return null;
  const [top] = available;
  return {
    unitId: top.id,
    code: top.code,
    reason: `${top.type ?? "Unknown type"} from ${top.homeBase ?? "yard"}`,
  } satisfies SuggestedUnit;
}

function computeGuardrails({
  margin,
  rules,
  isCrossBorder,
}: {
  margin: number | null;
  rules: Array<{ ruleKey: string; value: string; note: string | null }>;
  isCrossBorder: boolean;
}) {
  const guardrails: string[] = [];
  for (const rule of rules) {
    if (rule.ruleKey === "MARGIN_FLOOR") {
      const floor = Number(rule.value);
      if (!Number.isNaN(floor) && margin !== null && margin * 100 < floor) {
        guardrails.push(`Projected margin ${Math.round(margin * 100)}% below floor (${floor}%)`);
      }
    }
    if (rule.ruleKey === "BORDER_DOC_REQUIRED") {
      guardrails.push(rule.note ?? rule.value);
    }
  }
  if (isCrossBorder) {
    guardrails.push("Border documents required");
  }
  return guardrails;
}

function detectCrossBorder(origin: string, destination: string) {
  const canadianKeywords = [/ontario/i, /toronto/i, /canada/i, /qc/i];
  const usKeywords = [/michigan/i, /usa/i, /detroit/i, /ny/i, /ohio/i];
  const isCanadian = canadianKeywords.some((regex) => regex.test(origin) || regex.test(destination));
  const isUS = usKeywords.some((regex) => regex.test(origin) || regex.test(destination));
  return isCanadian && isUS;
}

export async function suggestPlanAndPrice(orderId: string): Promise<PlanSuggestionResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  const [drivers, units, rates, rules] = await Promise.all([
    prisma.driver.findMany({ where: { active: true } }),
    prisma.unit.findMany({ where: { active: true } }),
    prisma.rate.findMany({ where: { OR: [{ type: order.requiredTruck || undefined }, { zone: order.origin }] } }),
    prisma.rule.findMany({
      where: {
        scope: {
          in: [
            "GLOBAL",
            order.customer ? `CUSTOMER:${order.customer.toUpperCase()}` : "GLOBAL",
            `LANE:${order.origin.toUpperCase()}->${order.destination.toUpperCase()}`,
          ],
        },
        ruleKey: { in: ["MARGIN_FLOOR", "BORDER_DOC_REQUIRED"] },
      },
    }),
  ]);

  const bestDriver = pickBestDriver(drivers, order);
  const bestUnit = pickBestUnit(units);

  const candidateRate = rates[0];
  const defaultMiles = 250;
  const wageCPM = candidateRate ? toNumber(candidateRate.wageCPM) ?? 0 : 0.85;
  const fuelCPM = candidateRate ? toNumber(candidateRate.fuelCPM) ?? 0 : 0.65;
  const truckMaintCPM = candidateRate ? toNumber(candidateRate.truckMaintCPM) ?? 0 : 0.18;
  const trailerMaintCPM = candidateRate ? toNumber(candidateRate.trailerMaintCPM) ?? 0 : 0.1;
  const addOnsCPM = candidateRate ? toNumber(candidateRate.addOnsCPM) ?? 0 : 0.1;
  const fixedCPM = candidateRate ? toNumber(candidateRate.fixedCPM) ?? 0 : 0.4;

  const rollingCPM = fuelCPM + truckMaintCPM + trailerMaintCPM;
  const totalCPM = wageCPM + rollingCPM + addOnsCPM + fixedCPM;
  const rpm = totalCPM > 0 ? Number((totalCPM + 0.45).toFixed(2)) : 2.5;
  const revenue = rpm !== null ? rpm * defaultMiles : null;
  const cost = totalCPM * defaultMiles;
  const margin = revenue && revenue !== 0 ? (revenue - cost) / revenue : null;

  const guardrails = computeGuardrails({
    margin,
    rules,
    isCrossBorder: detectCrossBorder(order.origin, order.destination),
  });

  const suggestedRate: SuggestedRate = {
    rpm,
    cpmBreakdown: {
      wageCPM,
      fuelCPM,
      truckMaintCPM,
      trailerMaintCPM,
      addOnsCPM,
      fixedCPM,
      totalCPM,
    },
    marginEstimatePct: margin,
    warningLowMargin: guardrails.some((item) => item.toLowerCase().includes("margin")),
  };

  const summary = buildSummary({ rate: suggestedRate, driver: bestDriver, unit: bestUnit, guardrails });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      lastSuggestedDriverId: bestDriver?.driverId ?? null,
      lastSuggestedUnitId: bestUnit?.unitId ?? null,
      lastSuggestedRateId: candidateRate?.id ?? null,
      lastSuggestedPlan: JSON.stringify({
        rate: suggestedRate,
        guardrails,
      }),
      lastSuggestionReason: summary.textSummary,
      lastSuggestedBy: "system",
      lastSuggestionAt: new Date(),
    },
  });

  return {
    suggestedRate,
    suggestedDriver: bestDriver,
    suggestedUnit: bestUnit,
    guardrails,
    summary,
  };
}

export type PlanSuggestion = Awaited<ReturnType<typeof suggestPlanAndPrice>>;
