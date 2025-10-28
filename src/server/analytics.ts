import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { addDays, startOfWeek, subDays } from "@/lib/date-utils";
import type { SuggestionSummary } from "./analyze-order";

export type Insight = {
  title: string;
  detail: string;
  summary: SuggestionSummary;
};

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
}

export async function getWeeklyInsights(): Promise<Insight[]> {
  const weekStart = startOfWeek(new Date(), 1);
  const lastWeekStart = startOfWeek(subDays(weekStart, 7), 1);

  const [currentMargins, lastMargins, borderTrips] = await Promise.all([
    prisma.trip.aggregate({
      _avg: { marginPct: true },
      where: { weekStart: { gte: weekStart } },
    }),
    prisma.trip.aggregate({
      _avg: { marginPct: true },
      where: {
        weekStart: {
          gte: lastWeekStart,
          lt: weekStart,
        },
      },
    }),
    prisma.trip.count({ where: { events: { some: { type: { contains: "BORDER" } } } } }),
  ]);

  const avgMargin = toNumber(currentMargins._avg.marginPct);
  const prevMargin = toNumber(lastMargins._avg.marginPct);
  const deltaMargin = avgMargin - prevMargin;

  const insights: Insight[] = [];
  insights.push({
    title: "Margin trend",
    detail: `Average margin ${(avgMargin * 100).toFixed(1)}% (${deltaMargin >= 0 ? "+" : ""}${(deltaMargin * 100).toFixed(1)} pts vs last week)`,
    summary: {
      textSummary: "Weekly margin trend computed",
      why: [`This week ${(avgMargin * 100).toFixed(1)}%`, `Last week ${(prevMargin * 100).toFixed(1)}%`],
      actions: [
        { label: "Review low lanes", action: "APPLY" },
        { label: "Adjust targets", action: "ADJUST" },
        { label: "Dismiss", action: "DISMISS" },
      ],
    },
  });

  insights.push({
    title: "Border activity",
    detail: `${borderTrips} trips with border events logged`,
    summary: {
      textSummary: "Border trips monitored",
      why: [`${borderTrips} border events this week`],
      actions: [
        { label: "Check docs", action: "APPLY" },
        { label: "Adjust", action: "ADJUST" },
        { label: "Dismiss", action: "DISMISS" },
      ],
    },
  });

  return insights;
}

export async function getAnalyticsKpis() {
  const today = new Date();
  const startDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [waitingOrders, atRiskTrips, marginWeek, onTimeEvents] = await Promise.all([
    prisma.order.count({ where: { status: { in: ["PendingInfo", "Qualified"] } } }),
    prisma.trip.count({ where: { delayRiskPct: { gt: new Prisma.Decimal(0.3) } } }),
    prisma.trip.aggregate({
      _avg: { marginPct: true },
      where: { createdAt: { gte: startOfWeek(today, 1) } },
    }),
    prisma.event.count({
      where: {
        type: { in: ["ARRIVED_PICKUP", "ARRIVED_DELIVERY"] },
        at: { gte: startDay },
      },
    }),
  ]);

  return {
    waitingOrders,
    atRiskTrips,
    avgMargin: toNumber(marginWeek._avg.marginPct),
    onTimeEvents,
  };
}
