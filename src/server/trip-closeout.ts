import prisma from "@/lib/prisma";
import { recalcTripCost } from "./cost-engine";
import type { SuggestionSummary, SuggestionAction } from "./analyze-order";

export type AccessorialSuggestion = {
  label: string;
  amount: number;
  reason: string;
  actions: SuggestionAction[];
};

export type CloseoutResult = {
  tripId: string;
  plannedMiles: number | null;
  actualMiles: number | null;
  plannedMarginPct: number | null;
  finalMarginPct: number | null;
  cost: Awaited<ReturnType<typeof recalcTripCost>>;
  suggestedAccessorials: AccessorialSuggestion[];
  summary: SuggestionSummary;
};

function toNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export async function finalizeTripCloseout(tripId: string): Promise<CloseoutResult> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      order: true,
      events: true,
    },
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  const plannedMiles = toNumber(trip.plannedMiles ?? trip.miles);
  const actualMiles = toNumber(trip.actualMiles ?? trip.miles);
  const plannedMarginPct = toNumber(trip.marginPct);

  const cost = await recalcTripCost(tripId);
  const finalMarginPct = cost.costBreakdown.marginPct;

  const suggestedAccessorials: AccessorialSuggestion[] = [];
  const detentions = trip.events.filter((event) => event.type?.toUpperCase() === "DWELL");
  if (detentions.length) {
    suggestedAccessorials.push({
      label: "Detention",
      amount: detentions.length * 50,
      reason: `${detentions.length} dwell events detected`,
      actions: [
        { label: "Apply", action: "APPLY" },
        { label: "Adjust", action: "ADJUST" },
        { label: "Dismiss", action: "DISMISS" },
      ],
    });
  }
  const borderEvents = trip.events.filter((event) => event.type?.toUpperCase() === "BORDER");
  if (borderEvents.length) {
    suggestedAccessorials.push({
      label: "Border Crossing Fee",
      amount: borderEvents.length * 30,
      reason: `${borderEvents.length} border events logged`,
      actions: [
        { label: "Apply", action: "APPLY" },
        { label: "Adjust", action: "ADJUST" },
        { label: "Dismiss", action: "DISMISS" },
      ],
    });
  }

  const summary: SuggestionSummary = {
    textSummary: "Trip close-out ready",
    why: [
      plannedMiles !== null && actualMiles !== null
        ? `Miles variance ${(actualMiles - plannedMiles).toFixed(1)}`
        : "Miles variance pending",
      finalMarginPct !== null
        ? `Final margin ${(finalMarginPct * 100).toFixed(1)}%`
        : "Margin awaiting revenue",
      suggestedAccessorials.length
        ? `Suggested accessorials: ${suggestedAccessorials.map((item) => item.label).join(", ")}`
        : "No accessorial suggestions",
    ],
    actions: [
      { label: "Mark closed", action: "APPLY" },
      { label: "Adjust", action: "ADJUST" },
      { label: "Dismiss", action: "DISMISS" },
    ],
  };

  return {
    tripId: trip.id,
    plannedMiles,
    actualMiles,
    plannedMarginPct,
    finalMarginPct,
    cost,
    suggestedAccessorials,
    summary,
  };
}

export async function markTripClosed(tripId: string) {
  await prisma.trip.update({
    where: { id: tripId },
    data: {
      status: "Closed",
      updatedAt: new Date(),
    },
  });
}
