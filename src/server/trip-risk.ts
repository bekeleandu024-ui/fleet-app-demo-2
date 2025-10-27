import prisma from "@/lib/prisma";
import { differenceInMinutes, formatDateTime } from "@/lib/date-utils";
import type { SuggestionSummary } from "./analyze-order";

export type TripRiskResult = {
  delayRiskPct: number;
  eta: string | null;
  alerts: string[];
  summary: SuggestionSummary;
};

export async function evaluateTripRisk(tripId: string): Promise<TripRiskResult> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      events: { orderBy: { at: "asc" } },
    },
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  const events = trip.events;
  const lastEvent = events.at(-1);
  const eta = trip.etaPrediction ? formatDateTime(trip.etaPrediction) : null;
  const delayRisk = trip.delayRiskPct ? Number(trip.delayRiskPct) : 0;

  const alerts: string[] = [];
  if (delayRisk >= 0.3) {
    alerts.push(`Delay risk ${(delayRisk * 100).toFixed(0)}%`);
  }
  if (!trip.lastCheckInAt) {
    alerts.push("No check-in recorded");
  }
  if (trip.nextCommitmentAt) {
    const minutesRemaining = differenceInMinutes(trip.nextCommitmentAt, new Date());
    if (minutesRemaining < 60) {
      alerts.push(`Next commitment inside ${minutesRemaining} minutes`);
    }
  }

  const summary: SuggestionSummary = {
    textSummary: "Trip risk evaluated",
    why: [
      `Last event: ${lastEvent ? `${lastEvent.type} at ${formatDateTime(lastEvent.at)}` : "No events"}`,
      alerts.length ? alerts.join(" | ") : "No active alerts",
    ],
    actions: [
      { label: "Notify customer", action: "APPLY" },
      { label: "Adjust ETA", action: "ADJUST" },
      { label: "Dismiss", action: "DISMISS" },
    ],
  };

  return {
    delayRiskPct: delayRisk,
    eta,
    alerts,
    summary,
  };
}

export type DelayNotificationDraft = {
  subject: string;
  body: string;
  recommendedETA: string;
  summary: SuggestionSummary;
};

export async function draftDelayNotification(tripId: string): Promise<DelayNotificationDraft> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      order: true,
    },
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  const customer = trip.order?.customer ?? "Customer";
  const eta = trip.etaPrediction ? formatDateTime(trip.etaPrediction) : "TBD";
  const delayRisk = trip.delayRiskPct ? Number(trip.delayRiskPct) : 0.2;
  const subject = `Proactive update – revised ETA for ${trip.order?.origin ?? "pickup"}`;
  const body = [
    `Hi ${customer},`,
    "",
    "We're monitoring today's load and wanted to give you an early heads up.",
    `Current projected arrival: ${eta}.`,
    "We're building in extra dwell time at the shipper to avoid surprises.",
    "",
    "Let us know if you need to notify consignees or adjust appointments.",
    "",
    "Thanks,",
    "Dispatch",
  ].join("\n");

  const summary: SuggestionSummary = {
    textSummary: "Drafted delay notification",
    why: [`Delay risk ${(delayRisk * 100).toFixed(0)}%`, `ETA ${eta}`],
    actions: [
      { label: "Copy", action: "APPLY" },
      { label: "Adjust", action: "ADJUST" },
      { label: "Dismiss", action: "DISMISS" },
    ],
  };

  return {
    subject,
    body,
    recommendedETA: eta,
    summary,
  };
}
