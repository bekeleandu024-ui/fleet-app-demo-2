import prisma from "@/lib/prisma";

export type BadgeTone = "green" | "yellow" | "red";

export interface TripOperationalStatus {
  nextCommitmentLabel: string;
  delayRiskBadge: { text: string; tone: BadgeTone };
  marginBadge: { text: string; tone: BadgeTone };
  operationalAlerts: string[];
}

const COMPLETION_EVENT_TYPES = new Set([
  "PICKUP_ARRIVE",
  "DELIVERY_ARRIVE",
  "DROP_HOOK",
  "BORDER_CROSS",
]);

const MOVEMENT_EVENT_TYPES = new Set([
  "PICKUP_ARRIVE",
  "PICKUP_DEPART",
  "DELIVERY_ARRIVE",
  "DELIVERY_DEPART",
  "BORDER_CROSS",
  "DROP_HOOK",
]);

function stopTypeLabel(stopType: string | null | undefined) {
  switch (stopType) {
    case "PICKUP":
      return "Pickup";
    case "DELIVERY":
      return "Delivery";
    case "DROP_HOOK":
      return "Drop & Hook";
    case "BORDER":
      return "Border";
    default:
      return stopType ?? "Stop";
  }
}

function formatStopLabel(stop: {
  seq: number;
  stopType: string;
  city: string | null;
  state: string | null;
  name: string | null;
  scheduledAt: Date | null;
}) {
  const labelParts: string[] = [];
  labelParts.push(`Stop ${stop.seq}`);
  labelParts.push(stopTypeLabel(stop.stopType));
  const location = [stop.name, stop.city, stop.state]
    .filter((value) => value && value.trim().length > 0)
    .join(" · ");
  if (location) {
    labelParts.push(location);
  }
  if (stop.scheduledAt) {
    const scheduled = new Date(stop.scheduledAt);
    labelParts.push(
      scheduled.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    );
  }
  return labelParts.join(" — ");
}

function computeMarginBadge(marginPct: number | null) {
  if (marginPct == null) {
    return { text: "No margin data", tone: "yellow" as BadgeTone };
  }
  if (marginPct < 0.05) {
    return { text: "Margin risk", tone: "red" as BadgeTone };
  }
  if (marginPct < 0.1) {
    return { text: "Tight margin", tone: "yellow" as BadgeTone };
  }
  return { text: "Strong margin", tone: "green" as BadgeTone };
}

export async function getTripOperationalStatus(tripId: string): Promise<TripOperationalStatus | null> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      stops: { orderBy: { seq: "asc" } },
      events: { orderBy: { at: "asc" } },
    },
  });

  if (!trip) {
    return null;
  }

  const now = new Date();
  const marginPct = trip.marginPct ? Number(trip.marginPct) : null;
  const marginBadge = computeMarginBadge(marginPct);

  const stops = trip.stops;
  const events = trip.events;

  const completedStopIds = new Set(
    events
      .filter((event) => event.stopId && COMPLETION_EVENT_TYPES.has(event.type))
      .map((event) => event.stopId as string)
  );

  const nextStop = stops.find((stop) => !completedStopIds.has(stop.id)) ?? null;

  const nextCommitmentLabel = nextStop
    ? formatStopLabel({
        seq: nextStop.seq,
        stopType: nextStop.stopType,
        city: nextStop.city ?? null,
        state: nextStop.state ?? null,
        name: nextStop.name ?? null,
        scheduledAt: nextStop.scheduledAt ?? null,
      })
    : "All stops completed";

  const firstPickup = stops.find((stop) => stop.stopType === "PICKUP") ?? null;
  const firstPickupArrival = firstPickup
    ? events.find((event) => event.stopId === firstPickup.id && event.type === "PICKUP_ARRIVE") ?? null
    : null;

  let delayRiskBadge: TripOperationalStatus["delayRiskBadge"] = {
    text: "On schedule",
    tone: "green",
  };

  if (firstPickup && firstPickup.scheduledAt) {
    const scheduledAt = new Date(firstPickup.scheduledAt);
    const deadline = new Date(scheduledAt.getTime() + 30 * 60 * 1000);
    if (firstPickupArrival) {
      const arrivalTime = new Date(firstPickupArrival.at);
      if (arrivalTime > deadline) {
        delayRiskBadge = { text: "Pickup late", tone: "red" };
      } else if (arrivalTime > scheduledAt) {
        delayRiskBadge = { text: "Pickup slightly late", tone: "yellow" };
      } else {
        delayRiskBadge = { text: "Pickup confirmed", tone: "green" };
      }
    } else {
      if (now > deadline) {
        delayRiskBadge = { text: "Pickup overdue", tone: "red" };
      } else if (now > scheduledAt) {
        delayRiskBadge = { text: "Pickup window closing", tone: "yellow" };
      } else if (scheduledAt.getTime() - now.getTime() < 30 * 60 * 1000) {
        delayRiskBadge = { text: "Pickup approaching", tone: "yellow" };
      } else {
        delayRiskBadge = { text: "On schedule", tone: "green" };
      }
    }
  }

  const operationalAlerts: string[] = [];

  const tripStart = events.find((event) => event.type === "TRIP_START") ?? null;
  const lastMovement = [...events]
    .reverse()
    .find((event) => MOVEMENT_EVENT_TYPES.has(event.type)) ?? null;

  if (tripStart) {
    const referenceEvent = lastMovement ?? tripStart;
    const referenceTime = new Date(referenceEvent.at);
    const diffMs = now.getTime() - referenceTime.getTime();
    if (diffMs > 4 * 60 * 60 * 1000) {
      operationalAlerts.push("No recent activity");
    }
  }

  if (nextStop && nextStop.stopType === "BORDER") {
    const borderLogged = events.some(
      (event) => event.stopId === nextStop.id && event.type === "BORDER_CROSS"
    );
    if (!borderLogged) {
      if (!nextStop.scheduledAt) {
        operationalAlerts.push("Border docs check");
      } else {
        const scheduledAt = new Date(nextStop.scheduledAt);
        if (scheduledAt.getTime() - now.getTime() <= 3 * 60 * 60 * 1000) {
          operationalAlerts.push("Border docs check");
        }
      }
    }
  }

  return {
    nextCommitmentLabel,
    delayRiskBadge,
    marginBadge,
    operationalAlerts,
  };
}
