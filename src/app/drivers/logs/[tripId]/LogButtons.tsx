"use client";

import { useMemo, useState } from "react";

import { logDriverEvent } from "./actions";

const BUTTONS: { label: string; eventType: string }[] = [
  { label: "Trip Start", eventType: "TRIP_START" },
  { label: "Arrived Pickup", eventType: "PICKUP_ARRIVE" },
  { label: "Left Pickup", eventType: "PICKUP_DEPART" },
  { label: "Arrived Delivery", eventType: "DELIVERY_ARRIVE" },
  { label: "Left Delivery", eventType: "DELIVERY_DEPART" },
  { label: "Crossed Border", eventType: "BORDER_CROSS" },
  { label: "Drop & Hook", eventType: "DROP_HOOK" },
  { label: "Trip Finished", eventType: "TRIP_END" },
];

const STOP_SPECIFIC_EVENTS = new Set([
  "PICKUP_ARRIVE",
  "PICKUP_DEPART",
  "DELIVERY_ARRIVE",
  "DELIVERY_DEPART",
  "BORDER_CROSS",
  "DROP_HOOK",
]);

interface StopOption {
  id: string;
  seq: number;
  stopType: string;
  name?: string | null;
  city?: string | null;
  state?: string | null;
}

interface Props {
  tripId: string;
  stops: StopOption[];
}

function describeStop(stop: StopOption) {
  const labelParts: string[] = [];
  labelParts.push(`Stop ${stop.seq}`);
  if (stop.stopType) {
    labelParts.push(stop.stopType.replace("_", " "));
  }
  const locationBits = [stop.name, stop.city, stop.state]
    .filter((part) => part && part.trim().length > 0)
    .map((part) => part!.trim());
  if (locationBits.length) {
    labelParts.push(locationBits.join(" · "));
  }
  return labelParts.join(" — ");
}

async function requestGeolocation() {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return null;
  }
  return new Promise<{ lat: number; lon: number } | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

export default function LogButtons({ tripId, stops }: Props) {
  const [selectedStopId, setSelectedStopId] = useState<string>(stops[0]?.id ?? "");
  const [odometer, setOdometer] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const stopOptions = useMemo(() => {
    if (stops.length === 0) {
      return [] as { value: string; label: string }[];
    }
    return stops.map((stop) => ({
      value: stop.id,
      label: describeStop(stop),
    }));
  }, [stops]);

  async function handleClick(eventType: string) {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const requiresStop = STOP_SPECIFIC_EVENTS.has(eventType);
      const stopId = requiresStop ? selectedStopId || null : null;
      if (requiresStop && !stopId) {
        setMessage("Select a stop to log this event.");
        return;
      }

      const coords = await requestGeolocation();
      const odometerValue = odometer.trim() ? Number(odometer) : null;
      const odometerNumber = odometerValue !== null && Number.isFinite(odometerValue)
        ? odometerValue
        : null;

      await logDriverEvent({
        tripId,
        eventType,
        stopId,
        lat: coords?.lat ?? null,
        lon: coords?.lon ?? null,
        odometer: odometerNumber,
      });

      setMessage("Event logged.");
    } catch (error) {
      console.error("Failed to log driver event", error);
      setMessage("Unable to record event. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 text-[12px]">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-neutral-500">
            Event Stop
          </label>
          <select
            value={selectedStopId}
            onChange={(event) => setSelectedStopId(event.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">No stop (freeform)</option>
            {stopOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-neutral-500">
            Odometer (mi)
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            value={odometer}
            onChange={(event) => setOdometer(event.target.value)}
            placeholder="Optional"
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {BUTTONS.map((btn) => (
          <button
            key={btn.eventType}
            onClick={() => handleClick(btn.eventType)}
            disabled={isSubmitting}
            className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-left font-semibold text-neutral-100 transition hover:bg-neutral-700/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="text-[12px] leading-tight">{btn.label}</div>
            <div className="text-[10px] font-normal text-neutral-400 leading-tight">
              Tap to timestamp now
            </div>
          </button>
        ))}
      </div>
      {message && (
        <p className="text-[11px] text-neutral-400">{message}</p>
      )}
    </div>
  );
}
