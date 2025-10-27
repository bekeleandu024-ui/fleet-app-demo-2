"use client";

import { useMemo } from "react";

import { formatDateTimeLabel, formatRelativeAgo } from "@/lib/formatters";

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
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 text-[13px] text-white/60 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        No events logged yet.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-5 text-white/90 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
      <div className="mb-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-white">Recent Activity</div>
      <ul className="space-y-3">
        {timelineEvents.map((event) => {
          const accent = eventAccent(event);
          const timestamp = formatDateTimeLabel(event.at);
          const relative = formatRelativeAgo(event.at);
          const stopLabel = event.stop
            ? [event.stop.name, event.stop.city, event.stop.state]
                .filter((value) => value && value.trim().length > 0)
                .join(", ")
            : null;

          return (
            <li
              key={event.id}
              className="relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.02] p-4 transition hover:bg-white/[0.04]"
            >
              <span className={`absolute left-0 top-0 h-full w-1 ${accent.bar}`} aria-hidden />
              <div className="flex flex-col gap-3 pl-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="space-y-1">
                  <div className="text-[13px] font-semibold text-white">{prettyEventType(event.type)}</div>
                  {stopLabel ? (
                    <div className="text-[12px] text-white/60">{stopLabel}</div>
                  ) : null}
                  {event.notes ? (
                    <div className="rounded-md border border-white/5 bg-white/[0.03] px-3 py-2 text-[12px] text-white/70">
                      {event.notes}
                    </div>
                  ) : null}
                </div>
                <div className="text-right text-[12px] text-white/60 sm:min-w-[140px]">
                  {timestamp ? <div className="font-mono text-white/70">{timestamp}</div> : null}
                  {relative ? <div>{relative}</div> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
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

function eventAccent(event: TimelineEventDTO) {
  if (event.type === "TRIP_START") {
    return { bar: "bg-emerald-400" };
  }
  if (event.type === "TRIP_END") {
    return { bar: "bg-slate-400" };
  }
  if (event.stop?.stopType === "BORDER" || event.type === "BORDER_CROSS") {
    return { bar: "bg-rose-400" };
  }
  if (event.stop?.stopType === "DROP_HOOK" || event.type === "DROP_HOOK") {
    return { bar: "bg-amber-300" };
  }
  if (event.stop?.stopType === "PICKUP" || event.type.startsWith("PICKUP")) {
    return { bar: "bg-sky-400" };
  }
  if (event.stop?.stopType === "DELIVERY" || event.type.startsWith("DELIVERY")) {
    return { bar: "bg-violet-400" };
  }
  return { bar: "bg-white/30" };
}
