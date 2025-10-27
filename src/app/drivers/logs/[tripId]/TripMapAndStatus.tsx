import type { Prisma } from "@prisma/client";

import TripMapSectionClient from "./TripMapSectionClient";
import type { StopDTO } from "./TripMapClient";
import { formatDateTimeLabel } from "@/lib/formatters";

type TripWithRelations = Prisma.TripGetPayload<{
  include: {
    order: true;
    stops: true;
    events: { include: { stop: true } };
  };
}>;

interface TripMapAndStatusProps {
  trip: TripWithRelations;
  nextCommitmentLabel?: string;
}

export default function TripMapAndStatus({ trip, nextCommitmentLabel }: TripMapAndStatusProps) {
  const stops = buildStopTimeline(trip);
  const etaToDeliveryText = deriveEtaToDelivery(trip);
  const delayRiskPct = Math.min(100, Math.max(0, Number(trip.delayRiskPct ?? 0) * 100));
  const nextCommitmentText = deriveNextCommitmentText(trip, nextCommitmentLabel);

  return (
    <TripMapSectionClient
      stops={stops}
      etaToDeliveryText={etaToDeliveryText}
      delayRiskPct={delayRiskPct}
      nextCommitmentText={nextCommitmentText}
    />
  );
}

function buildStopTimeline(trip: TripWithRelations): StopDTO[] {
  const orderedEvents = [...trip.events].sort((a, b) => a.at.getTime() - b.at.getTime());

  const eventStops: StopDTO[] = orderedEvents
    .map((event, index) => {
      const kind = mapEventKind(event.type, event.stop?.stopType ?? null);
      if (!kind) {
        return null;
      }

      const coordinates = resolveEventCoordinates(event, trip, index, orderedEvents.length);
      if (!coordinates) {
        return null;
      }

      return {
        id: event.id,
        label: buildEventLabel(event),
        lat: coordinates.lat,
        lon: coordinates.lon,
        ts: event.at.toISOString(),
        kind,
      } satisfies StopDTO;
    })
    .filter((stop): stop is StopDTO => Boolean(stop));

  const plannedStops = buildPlannedStops(trip);

  if (eventStops.length === 0) {
    return plannedStops;
  }

  const hasStart = eventStops.some((stop) => stop.kind === "start");
  const hasFinish = eventStops.some((stop) => stop.kind === "finish");

  if (!hasStart) {
    const fallbackStart = plannedStops.find((stop) => stop.kind === "start");
    if (fallbackStart && !eventStops.some((stop) => stop.id === fallbackStart.id)) {
      eventStops.unshift(fallbackStart);
    }
  }

  if (!hasFinish) {
    const fallbackFinish = plannedStops.find((stop) => stop.kind === "finish");
    if (fallbackFinish && !eventStops.some((stop) => stop.id === fallbackFinish.id)) {
      eventStops.push(fallbackFinish);
    }
  }

  if (eventStops.length === 1) {
    const extra = plannedStops.find((stop) => stop.id !== eventStops[0].id);
    if (extra) {
      eventStops.push(extra);
    }
  }

  return eventStops;
}

function mapEventKind(type: string, stopType: string | null): StopDTO["kind"] | null {
  switch (type) {
    case "TRIP_START":
      return "start";
    case "TRIP_END":
      return "finish";
    case "PICKUP_ARRIVE":
    case "PICKUP_DEPART":
      return "pickup";
    case "DELIVERY_ARRIVE":
    case "DELIVERY_DEPART":
      return "delivery";
    case "BORDER_CROSS":
      return "border";
    default:
      if (stopType === "BORDER") {
        return "border";
      }
      if (stopType === "PICKUP") {
        return "pickup";
      }
      if (stopType === "DELIVERY") {
        return "delivery";
      }
      return "other";
  }
}

function buildEventLabel(event: TripWithRelations["events"][number]): string {
  const verb = prettyEventType(event.type);
  const locationParts = [
    event.stop?.name,
    event.stop?.city,
    event.stop?.state,
  ].filter((part): part is string => Boolean(part && part.trim().length > 0));

  if (locationParts.length === 0) {
    return verb;
  }

  return `${verb} – ${locationParts.join(", ")}`;
}

function resolveEventCoordinates(
  event: TripWithRelations["events"][number],
  trip: TripWithRelations,
  index: number,
  total: number,
) {
  if (typeof event.lat === "number" && typeof event.lon === "number") {
    return { lat: event.lat, lon: event.lon };
  }
  if (event.stop && typeof event.stop.lat === "number" && typeof event.stop.lon === "number") {
    return { lat: event.stop.lat, lon: event.stop.lon };
  }
  const matchingStop = trip.stops.find((stop) => stop.id === event.stopId);
  if (matchingStop && typeof matchingStop.lat === "number" && typeof matchingStop.lon === "number") {
    return { lat: matchingStop.lat, lon: matchingStop.lon };
  }
  if (index === 0 || event.type === "TRIP_START") {
    if (typeof trip.originLat === "number" && typeof trip.originLon === "number") {
      return { lat: trip.originLat, lon: trip.originLon };
    }
  }
  if (index === total - 1 || event.type === "TRIP_END") {
    if (typeof trip.destLat === "number" && typeof trip.destLon === "number") {
      return { lat: trip.destLat, lon: trip.destLon };
    }
  }
  // TODO: incorporate telematics pings or geocoding to improve fallback accuracy.
  return null;
}

function buildPlannedStops(trip: TripWithRelations): StopDTO[] {
  const stops: StopDTO[] = [];

  if (typeof trip.originLat === "number" && typeof trip.originLon === "number") {
    stops.push({
      id: `${trip.id}-origin`,
      label: trip.order?.origin ? `Start – ${trip.order.origin}` : "Start",
      lat: trip.originLat,
      lon: trip.originLon,
      ts: trip.startedAt?.toISOString(),
      kind: "start",
    });
  }

  const sortedStops = [...trip.stops].sort((a, b) => a.seq - b.seq);

  for (const stop of sortedStops) {
    const coordinates = bestCoordinatesForStop(stop, trip);
    if (!coordinates) {
      continue;
    }

    stops.push({
      id: stop.id,
      label: buildStopLabel(stop),
      lat: coordinates.lat,
      lon: coordinates.lon,
      ts: stop.scheduledAt ? stop.scheduledAt.toISOString() : undefined,
      kind: mapStopKind(stop.stopType),
    });
  }

  if (typeof trip.destLat === "number" && typeof trip.destLon === "number") {
    stops.push({
      id: `${trip.id}-destination`,
      label: trip.order?.destination ? `Finish – ${trip.order.destination}` : "Finish",
      lat: trip.destLat,
      lon: trip.destLon,
      ts: trip.completedAt?.toISOString(),
      kind: "finish",
    });
  }

  return stops;
}

function bestCoordinatesForStop(
  stop: TripWithRelations["stops"][number],
  trip: TripWithRelations,
) {
  if (typeof stop.lat === "number" && typeof stop.lon === "number") {
    return { lat: stop.lat, lon: stop.lon };
  }
  const fallbackEvent = trip.events.find((event) => event.stopId === stop.id);
  if (fallbackEvent && typeof fallbackEvent.lat === "number" && typeof fallbackEvent.lon === "number") {
    return { lat: fallbackEvent.lat, lon: fallbackEvent.lon };
  }
  // TODO: hook in geocoding for city/state pairs when coordinates are missing.
  return null;
}

function buildStopLabel(stop: TripWithRelations["stops"][number]) {
  const prefix = stopLabelPrefix(stop.stopType);
  const locationParts = [stop.name, stop.city, stop.state]
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .join(", ");
  if (!locationParts) {
    return prefix;
  }
  return `${prefix} – ${locationParts}`;
}

function stopLabelPrefix(stopType: string | null) {
  switch (stopType) {
    case "PICKUP":
      return "Pickup";
    case "DELIVERY":
      return "Delivery";
    case "BORDER":
      return "Border";
    case "DROP_HOOK":
      return "Drop & Hook";
    default:
      return stopType ?? "Stop";
  }
}

function mapStopKind(stopType: string | null): StopDTO["kind"] {
  switch (stopType) {
    case "PICKUP":
      return "pickup";
    case "DELIVERY":
      return "delivery";
    case "BORDER":
      return "border";
    default:
      return "other";
  }
}

function deriveEtaToDelivery(trip: TripWithRelations) {
  const deliveryStops = [...trip.stops]
    .filter((stop) => stop.stopType === "DELIVERY")
    .sort((a, b) => a.seq - b.seq);
  const finalDelivery = deliveryStops.at(-1);
  if (finalDelivery?.scheduledAt) {
    return formatCountdown(finalDelivery.scheduledAt);
  }
  if (trip.nextCommitmentAt) {
    return `Next window ${formatCountdown(trip.nextCommitmentAt)}`;
  }
  return "Awaiting schedule";
}

function deriveNextCommitmentText(trip: TripWithRelations, fallback?: string) {
  if (trip.nextCommitmentAt) {
    const formatted = formatDateTimeLabel(trip.nextCommitmentAt);
    if (formatted) {
      return `Due ${formatted}`;
    }
  }
  if (fallback) {
    return fallback;
  }
  return "No upcoming stops";
}

function formatCountdown(date: Date | string) {
  const target = typeof date === "string" ? new Date(date) : date;
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) {
    return "Due now";
  }
  const totalMinutes = Math.round(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${Math.max(minutes, 1)}m`;
}

function prettyEventType(type: string) {
  switch (type) {
    case "TRIP_START":
      return "Trip started";
    case "TRIP_END":
      return "Trip finished";
    case "PICKUP_ARRIVE":
      return "Arrived pickup";
    case "PICKUP_DEPART":
      return "Departed pickup";
    case "DELIVERY_ARRIVE":
      return "Arrived delivery";
    case "DELIVERY_DEPART":
      return "Departed delivery";
    case "BORDER_CROSS":
      return "Crossed border";
    case "DROP_HOOK":
      return "Drop & hook";
    default:
      return type.replaceAll("_", " ");
  }
}
