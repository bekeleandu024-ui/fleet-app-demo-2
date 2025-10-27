"use client";

import { useState } from "react";

interface Props {
  orderId: string;
  driverId: string | null;
  unitId: string | null;
  rateId: string | null;
  driverName: string;
  unitCode: string;
  tripType?: string | null;
  tripZone?: string | null;
  miles: number;
  rpmQuoted: number;
  totalCpm: number;
  notes: string;
  highlights: string[];
}

export default function BookTripButton({
  orderId,
  driverId,
  unitId,
  rateId,
  driverName,
  unitCode,
  tripType,
  tripZone,
  miles,
  rpmQuoted,
  totalCpm,
  notes,
  highlights,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setStatus("loading");
    setMessage(null);
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          driverId,
          unitId,
          rateId,
          driverName,
          unitCode,
          tripType,
          tripZone,
          miles,
          rpm: rpmQuoted,
          fuelSurcharge: 0,
          addOns: 0,
          totalCpm,
          total: Number((rpmQuoted * miles).toFixed(2)),
          aiReason: notes,
          aiHighlights: highlights,
          aiDiagnostics: null,
        }),
      });
      if (!response.ok) {
        throw new Error(`Booking failed with status ${response.status}`);
      }
      setStatus("success");
      setMessage("Trip booked. Dispatch workflow updated.");
    } catch (error) {
      console.error("Failed to book trip", error);
      setStatus("error");
      setMessage("Unable to create trip. Review inputs and retry.");
    }
  };

  const disabled = status === "loading";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? "Booking trip…" : "Book Trip"}
      </button>
      {message && (
        <p
          className={`text-xs ${status === "error" ? "text-rose-400" : "text-emerald-400"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
