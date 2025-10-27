"use client";

import { useMemo } from "react";

interface TimelineEventDTO {
  id: string;
  type: string;
  at: string;
  notes?: string | null;
  stop?: {
    id: string;
    seq: number;
    stopType: string;
    name?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
}

interface Props {
  events: TimelineEventDTO[];
}

export default function TripActivityTimeline({ events }: Props) {
  const timelineEvents = useMemo(() => events, [events]);

  if (timelineEvents.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5 text-xs text-slate-400">
        No events logged yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5 shadow-lg shadow-black/40">
      <div className="mb-4 text-sm font-semibold text-slate-200">Recent Activity</div>
      <ul className="space-y-3 text-xs text-slate-100">
        {timelineEvents.map((event) => {
          const accent = eventAccent(event);
          const stopLabel = event.stop
            ? `Stop ${event.stop.seq} · ${event.stop.city || event.stop.name || "Unknown"}`
            : null;
          return (
            <li
              key={event.id}
              className={`grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-lg border border-white/10 bg-slate-900/40 p-3 ${accent.background}`}
            >
              <div className={`h-full w-1 rounded ${accent.bar}`} aria-hidden />
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-50">
                  {prettyEventType(event.type)}
                </div>
                {stopLabel ? (
                  <div className="text-[11px] text-slate-400">{stopLabel}</div>
                ) : null}
                {event.notes ? (
                  <div className="text-[11px] text-slate-500">{event.notes}</div>
                ) : null}
              </div>
              <div className="text-right text-[11px] text-slate-400">
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

function eventAccent(event: TimelineEventDTO) {
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
