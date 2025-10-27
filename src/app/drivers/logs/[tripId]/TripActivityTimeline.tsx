"use client";

import { useMemo } from "react";

import { useTripMapFocus } from "./TripMapAndStatus";
import type { TripEventDTO } from "./TripMapAndStatus";

interface Props {
  events: TripEventDTO[];
}

export default function TripActivityTimeline({ events }: Props) {
  const { focusOnEvent, focusedEventId } = useTripMapFocus();

  const timelineEvents = useMemo(() => events, [events]);

  if (timelineEvents.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 text-[12px] text-neutral-500">
        No events logged yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40">
      <div className="text-sm font-semibold text-neutral-200 mb-4">Recent Activity</div>
      <ul className="space-y-3 text-[12px] text-neutral-200">
        {timelineEvents.map((event) => {
          const accent = eventAccent(event);
          const isFocused = focusedEventId === event.id;
          const stopLabel = event.stop
            ? `Stop ${event.stop.seq} · ${event.stop.city || event.stop.name || "Unknown"}`
            : null;
          const hasCoords = typeof event.lat === "number" && typeof event.lon === "number";
          return (
            <li
              key={event.id}
              className={`grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 ${accent.background} ${isFocused ? "ring-2 ring-emerald-500/50" : ""}`}
            >
              <div className={`h-full w-1 rounded ${accent.bar}`} aria-hidden />
              <div className="space-y-1">
                <div className="text-[12px] font-semibold text-neutral-100">
                  {prettyEventType(event.type)}
                </div>
                {stopLabel ? (
                  <div className="text-[11px] text-neutral-400">{stopLabel}</div>
                ) : null}
                {event.notes ? (
                  <div className="text-[11px] text-neutral-500">{event.notes}</div>
                ) : null}
                {hasCoords ? (
                  <button
                    type="button"
                    onClick={() => focusOnEvent(event.id)}
                    className="text-[11px] font-medium text-emerald-300 hover:text-emerald-200"
                  >
                    View on map
                  </button>
                ) : null}
              </div>
              <div className="text-right text-[11px] text-neutral-400">
                <div className="font-mono">{formatTimestamp(event.at)}</div>
                <div>{relativeTime(event.at)}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatTimestamp(isoDate: string) {
  return new Date(isoDate).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeTime(isoDate: string) {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "moments ago";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m ago`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h ago`;
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
      return "Left pickup";
    case "DELIVERY_ARRIVE":
      return "Arrived delivery";
    case "DELIVERY_DEPART":
      return "Left delivery";
    case "BORDER_CROSS":
      return "Crossed border";
    case "DROP_HOOK":
      return "Drop & hook";
    default:
      return type.replaceAll("_", " ");
  }
}

function eventAccent(event: TripEventDTO) {
  if (event.type === "TRIP_START") {
    return { bar: "bg-emerald-500", background: "bg-emerald-500/5" };
  }
  if (event.type === "TRIP_END") {
    return { bar: "bg-slate-400", background: "bg-slate-400/10" };
  }
  if (event.stop?.stopType === "BORDER" || event.type === "BORDER_CROSS") {
    return { bar: "bg-rose-500", background: "bg-rose-500/5" };
  }
  if (event.stop?.stopType === "DROP_HOOK" || event.type === "DROP_HOOK") {
    return { bar: "bg-amber-400", background: "bg-amber-400/10" };
  }
  if (event.stop?.stopType === "PICKUP" || event.type.startsWith("PICKUP")) {
    return { bar: "bg-sky-500", background: "bg-sky-500/5" };
  }
  if (event.stop?.stopType === "DELIVERY" || event.type.startsWith("DELIVERY")) {
    return { bar: "bg-indigo-500", background: "bg-indigo-500/5" };
  }
  return { bar: "bg-slate-500", background: "bg-slate-500/10" };
}
