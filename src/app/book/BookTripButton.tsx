"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STOP_TYPES = [
  { value: "PICKUP", label: "Pickup" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "DROP_HOOK", label: "Drop & Hook" },
  { value: "BORDER", label: "Border" },
  { value: "OTHER", label: "Other" },
] as const;

type StopType = (typeof STOP_TYPES)[number]["value"];

function createStopId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

interface BaseProps {
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
  orderOrigin?: string | null;
  orderDestination?: string | null;
  customerName?: string | null;
}

interface StopFormState {
  id: string;
  stopType: StopType;
  name: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postal: string;
  scheduledAt: string;
  lat: string;
  lon: string;
}

function parseLocationParts(raw: string | null | undefined) {
  if (!raw) return { city: "", state: "" };
  const pieces = raw.split(",").map((part) => part.trim()).filter(Boolean);
  if (pieces.length === 0) {
    return { city: "", state: "" };
  }
  if (pieces.length === 1) {
    return { city: pieces[0], state: "" };
  }
  return { city: pieces[0], state: pieces.slice(1).join(", ") };
}

function buildDefaultStops(
  origin: string | null | undefined,
  destination: string | null | undefined,
  customerName: string | null | undefined
): StopFormState[] {
  const defaults: StopFormState[] = [];
  const pickupLocation = parseLocationParts(origin);
  const deliveryLocation = parseLocationParts(destination);

  if (origin) {
    defaults.push({
      id: createStopId(),
      stopType: "PICKUP",
      name: customerName ? `${customerName} Pickup` : "Pickup",
      street: "",
      city: pickupLocation.city,
      state: pickupLocation.state,
      country: "",
      postal: "",
      scheduledAt: "",
      lat: "",
      lon: "",
    });
  }

  if (destination) {
    defaults.push({
      id: createStopId(),
      stopType: "DELIVERY",
      name: customerName ? `${customerName} Delivery` : "Delivery",
      street: "",
      city: deliveryLocation.city,
      state: deliveryLocation.state,
      country: "",
      postal: "",
      scheduledAt: "",
      lat: "",
      lon: "",
    });
  }

  if (defaults.length === 0) {
    defaults.push({
      id: createStopId(),
      stopType: "PICKUP",
      name: "Primary Stop",
      street: "",
      city: "",
      state: "",
      country: "",
      postal: "",
      scheduledAt: "",
      lat: "",
      lon: "",
    });
  }

  return defaults;
}

export default function BookTripButton(props: BaseProps) {
  const {
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
    orderOrigin,
    orderDestination,
    customerName,
  } = props;

  const router = useRouter();
  const [stops, setStops] = useState<StopFormState[]>(() =>
    buildDefaultStops(orderOrigin ?? null, orderDestination ?? null, customerName ?? null)
  );
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const canRemoveStop = useMemo(() => stops.length > 1, [stops.length]);

  const handleStopChange = (id: string, field: keyof StopFormState, value: string) => {
    setStops((prev) =>
      prev.map((stop) => (stop.id === id ? { ...stop, [field]: value } : stop))
    );
  };

  const addStop = () => {
    setStops((prev) => [
      ...prev,
      {
        id: createStopId(),
        stopType: "OTHER",
        name: "",
        street: "",
        city: "",
        state: "",
        country: "",
        postal: "",
        scheduledAt: "",
        lat: "",
        lon: "",
      },
    ]);
  };

  const removeStop = (id: string) => {
    if (!canRemoveStop) return;
    setStops((prev) => prev.filter((stop) => stop.id !== id));
  };

  const submit = async () => {
    if (stops.length === 0) {
      setMessage("Add at least one stop before booking.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const payload = {
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
        stops: stops.map((stop) => {
          const latString = stop.lat.trim();
          const lonString = stop.lon.trim();
          const latValue = latString ? Number(latString) : null;
          const lonValue = lonString ? Number(lonString) : null;
          return {
            stopType: stop.stopType,
            name: stop.name.trim() || null,
            street: stop.street.trim() || null,
            city: stop.city.trim() || null,
            state: stop.state.trim() || null,
            country: stop.country.trim() || null,
            postal: stop.postal.trim() || null,
            scheduledAt: stop.scheduledAt
              ? new Date(stop.scheduledAt).toISOString()
              : null,
            lat: latValue !== null && Number.isFinite(latValue) ? latValue : null,
            lon: lonValue !== null && Number.isFinite(lonValue) ? lonValue : null,
          };
        }),
      };

      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMessage = errorBody?.error ?? `Booking failed (${response.status})`;
        throw new Error(errorMessage);
      }

      const result = (await response.json()) as { ok: boolean; trip?: { id: string } };
      if (!result.ok || !result.trip?.id) {
        throw new Error("Trip creation response incomplete");
      }

      setStatus("success");
      setMessage("Trip booked. Redirecting to live log…");
      router.push(`/drivers/logs/${result.trip.id}`);
    } catch (error) {
      console.error("Failed to book trip", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to create trip.");
    }
  };

  const disabled = status === "loading";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 shadow-inner shadow-black/40">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-neutral-200">Dispatch Overrides</div>
            <p className="text-xs text-neutral-400">
              Build the route to reflect every commitment and stop.
            </p>
          </div>
          <button
            type="button"
            onClick={addStop}
            className="rounded-lg border border-neutral-700 px-3 py-1 text-[11px] font-semibold text-neutral-200 transition hover:bg-neutral-800"
          >
            + Add Stop
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {stops.map((stop, index) => (
            <div
              key={stop.id}
              className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400">
                <span>Stop {index + 1}</span>
                {canRemoveStop && (
                  <button
                    type="button"
                    onClick={() => removeStop(stop.id)}
                    className="text-rose-300 transition hover:text-rose-200"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,180px)]">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wide text-neutral-500">
                    Type
                  </label>
                  <select
                    value={stop.stopType}
                    onChange={(event) =>
                      handleStopChange(stop.id, "stopType", event.target.value as StopType)
                    }
                    className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                  >
                    {STOP_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-neutral-500">
                      Location Name
                    </label>
                    <input
                      value={stop.name}
                      onChange={(event) => handleStopChange(stop.id, "name", event.target.value)}
                      placeholder="Customer or facility"
                      className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-neutral-500">
                      City
                    </label>
                    <input
                      value={stop.city}
                      onChange={(event) => handleStopChange(stop.id, "city", event.target.value)}
                      placeholder="City"
                      className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-neutral-500">
                      State / Province
                    </label>
                    <input
                      value={stop.state}
                      onChange={(event) => handleStopChange(stop.id, "state", event.target.value)}
                      placeholder="State"
                      className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-neutral-500">
                      Postal / Zip
                    </label>
                    <input
                      value={stop.postal}
                      onChange={(event) => handleStopChange(stop.id, "postal", event.target.value)}
                      placeholder="Zip"
                      className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-neutral-500">
                      Country
                    </label>
                    <input
                      value={stop.country}
                      onChange={(event) => handleStopChange(stop.id, "country", event.target.value)}
                      placeholder="Country"
                      className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-neutral-500">
                      Street
                    </label>
                    <input
                      value={stop.street}
                      onChange={(event) => handleStopChange(stop.id, "street", event.target.value)}
                      placeholder="123 Main St"
                      className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-neutral-500">
                      Coordinates (optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={stop.lat}
                        onChange={(event) => handleStopChange(stop.id, "lat", event.target.value)}
                        placeholder="Lat"
                        className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                      />
                      <input
                        value={stop.lon}
                        onChange={(event) => handleStopChange(stop.id, "lon", event.target.value)}
                        placeholder="Lon"
                        className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wide text-neutral-500">
                    Scheduled At (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={stop.scheduledAt}
                    onChange={(event) => handleStopChange(stop.id, "scheduledAt", event.target.value)}
                    className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Local time window start.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={submit}
          disabled={disabled}
          className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "loading" ? "Booking trip…" : "Book Trip"}
        </button>
        {message && (
          <p className={`text-xs ${status === "error" ? "text-rose-400" : "text-emerald-400"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
