"use client";

import { useTransition } from "react";
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

export default function LogButtons({ tripId }: { tripId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick(eventType: string) {
    startTransition(async () => {
      await logDriverEvent({ tripId, eventType });
    });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
      {BUTTONS.map((btn) => (
        <button
          key={btn.eventType}
          onClick={() => handleClick(btn.eventType)}
          disabled={isPending}
          className="rounded-lg border border-neutral-700 bg-neutral-800/60 hover:bg-neutral-700/60 text-neutral-100 px-3 py-2 text-left shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="font-semibold text-[12px] leading-tight">{btn.label}</div>
          <div className="text-[10px] text-neutral-400 leading-tight">Tap to timestamp now</div>
        </button>
      ))}
    </div>
  );
}
