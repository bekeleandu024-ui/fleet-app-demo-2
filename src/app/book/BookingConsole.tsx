"use client";

import { useEffect, useMemo, useState } from "react";

import {
  BookingDriverInput,
  BookingOrderInput,
  BookingRateInput,
  BookingSuggestion,
  BookingUnitInput,
  generateBookingSuggestion,
} from "@/src/lib/aiBooking";

export interface BookingOrder extends BookingOrderInput {
  destination: string;
  origin: string;
  customer: string;
  puWindowStart: string | null;
  puWindowEnd: string | null;
  delWindowStart: string | null;
  delWindowEnd: string | null;
  qualificationNotes?: string | null;
}

export interface BookingDriver extends BookingDriverInput {
  id: string;
  name: string;
}

export interface BookingUnit extends BookingUnitInput {
  id: string;
  code: string;
}

export interface BookingRate extends BookingRateInput {
  id: string;
  type?: string | null;
  zone?: string | null;
}

interface Props {
  initialOrderId?: string | null;
  orders: BookingOrder[];
  drivers: BookingDriver[];
  units: BookingUnit[];
  rates: BookingRate[];
}

interface ToastState {
  type: "success" | "error";
  message: string;
}

interface ConfirmationState {
  tripId: string;
  orderId: string;
  driver: string;
  unit: string;
  route: string;
  total: number;
}

export default function BookingConsole({ initialOrderId, orders, drivers, units, rates }: Props) {
  const [orderList, setOrderList] = useState(orders);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(() => initialOrderId ?? orders[0]?.id ?? null);
  const [suggestion, setSuggestion] = useState<BookingSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [booking, setBooking] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [tripType, setTripType] = useState("");
  const [tripZone, setTripZone] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [miles, setMiles] = useState(0);
  const [rpm, setRpm] = useState(0);
  const [fuelSurcharge, setFuelSurcharge] = useState(0);
  const [addOns, setAddOns] = useState(0);

  useEffect(() => {
    if (!initialOrderId) return;
    setSelectedOrderId(initialOrderId);
  }, [initialOrderId]);

  const selectedOrder = useMemo(
    () => orderList.find((order) => order.id === selectedOrderId) ?? null,
    [orderList, selectedOrderId]
  );

  useEffect(() => {
    if (!selectedOrder) {
      setSuggestion(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoadingSuggestion(true);
      try {
        const aiOrder: BookingOrderInput = {
          id: selectedOrder.id,
          customer: selectedOrder.customer,
          origin: selectedOrder.origin,
          destination: selectedOrder.destination,
          requiredTruck: selectedOrder.requiredTruck,
          notes: selectedOrder.notes,
        };
        const result = await generateBookingSuggestion(aiOrder, drivers, units, rates);
        if (cancelled) return;
        setSuggestion(result);
        setSelectedDriverId(result.suggestedDriverId ?? null);
        setSelectedUnitId(result.suggestedUnitId ?? null);
        setSelectedRateId(result.suggestedRateId ?? null);
        setTripType(result.tripType ?? "");
        setTripZone(result.tripZone ?? "");
        setMiles(result.rate.miles);
        setRpm(result.rate.rpm);
        setFuelSurcharge(result.rate.fuelSurcharge);
        setAddOns(result.rate.addOns);
      } catch (error) {
        console.error("Failed to generate booking suggestion", error);
        if (!cancelled) {
          setToast({ type: "error", message: "Unable to generate AI suggestion." });
          setSuggestion(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingSuggestion(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [selectedOrder, drivers, units, rates]);

  const totalCpm = useMemo(() => Number((rpm + fuelSurcharge + addOns).toFixed(2)), [rpm, fuelSurcharge, addOns]);
  const totalRevenue = useMemo(() => Number((totalCpm * miles).toFixed(2)), [totalCpm, miles]);

  const handleRateChange = (value: string) => {
    setSelectedRateId(value || null);
    const match = rates.find((rate) => rate.id === value);
    if (match) {
      const computedRpm = match.rpm ?? (match.fixedCPM ?? 0) + (match.wageCPM ?? 0) + (match.rollingCPM ?? 0);
      setRpm(Number((computedRpm ?? 0).toFixed(2)));
      if (match.fuelSurcharge != null) {
        setFuelSurcharge(Number(match.fuelSurcharge.toFixed(2)));
      }
      if (match.addOnsCPM != null) {
        setAddOns(Number(match.addOnsCPM.toFixed(2)));
      }
      if (match.type) {
        setTripType(match.type);
      }
      if (match.zone) {
        setTripZone(match.zone);
      }
    } else if (suggestion) {
      setRpm(suggestion.rate.rpm);
      setFuelSurcharge(suggestion.rate.fuelSurcharge);
      setAddOns(suggestion.rate.addOns);
      setTripType(suggestion.tripType ?? "");
      setTripZone(suggestion.tripZone ?? "");
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const formatWindow = (start: string | null, end: string | null) => {
    if (!start && !end) return "Flexible";
    const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" };
    const format = (value: string | null) => (value ? new Date(value).toLocaleString(undefined, opts) : "");
    const startText = format(start);
    const endText = format(end);
    return [startText, endText].filter(Boolean).join(" → ");
  };

  const handleBookTrip = async () => {
    if (!selectedOrder) return;
    setBooking(true);
    setToast(null);

    const driver = selectedDriverId ? drivers.find((item) => item.id === selectedDriverId) : null;
    const unit = selectedUnitId ? units.find((item) => item.id === selectedUnitId) : null;
    const rate = selectedRateId ? rates.find((item) => item.id === selectedRateId) : null;

    const driverName = driver?.name ?? suggestion?.suggestedDriverName ?? "Unassigned Driver";
    const unitCode = unit?.code ?? suggestion?.suggestedUnitCode ?? "TBD-UNIT";
    const routeLabel = `${selectedOrder.origin} → ${selectedOrder.destination}`;

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          driverId: driver?.id ?? null,
          unitId: unit?.id ?? null,
          rateId: rate?.id ?? null,
          driverName,
          unitCode,
          tripType: tripType || suggestion?.tripType || null,
          tripZone: tripZone || suggestion?.tripZone || null,
          miles,
          rpm,
          fuelSurcharge,
          addOns,
          totalCpm,
          total: totalRevenue,
          aiReason: suggestion?.reasoning.summary ?? null,
          aiHighlights: suggestion?.reasoning.highlights ?? [],
          aiDiagnostics: suggestion?.diagnostics ?? null,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error || "Failed to book trip");
      }

      const body = await response.json();
      const bookedTrip = body.trip as { id: string; orderId: string; driver: string; unit: string; revenue: number | null };

      setToast({ type: "success", message: `Trip booked for ${driverName}` });
      setConfirmation({
        tripId: bookedTrip.id,
        orderId: bookedTrip.orderId,
        driver: driverName,
        unit: unitCode,
        route: routeLabel,
        total: totalRevenue,
      });
      setOrderList((prev) => {
        const updated = prev.filter((order) => order.id !== selectedOrder.id);
        setSelectedOrderId(updated[0]?.id ?? null);
        return updated;
      });
      setSuggestion(null);
    } catch (error) {
      console.error(error);
      setToast({ type: "error", message: error instanceof Error ? error.message : "Failed to book trip" });
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Qualified Orders</h2>
        {orderList.length === 0 && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-400">
            All qualified orders are booked. Refresh to check for new work.
          </div>
        )}
        <div className="space-y-2">
          {orderList.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => setSelectedOrderId(order.id)}
              className={`w-full rounded-xl border p-4 text-left transition hover:border-indigo-500 hover:bg-neutral-800/60 ${
                order.id === selectedOrderId
                  ? "border-indigo-500 bg-neutral-800/80"
                  : "border-neutral-800 bg-neutral-900/60"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Order #{order.id.slice(-6).toUpperCase()}</span>
                <span>{formatWindow(order.puWindowStart, order.puWindowEnd)}</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-100">
                {order.customer}
              </div>
              <div className="text-xs text-neutral-300">
                {order.origin} → {order.destination}
              </div>
              {order.requiredTruck && (
                <div className="mt-2 text-xs text-indigo-300">Equipment: {order.requiredTruck}</div>
              )}
              {order.qualificationNotes && (
                <div className="mt-1 text-[11px] text-neutral-400">{order.qualificationNotes}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {toast && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              toast.type === "success"
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/60 bg-red-500/10 text-red-200"
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">AI Recommendation</h3>
            {loadingSuggestion && <span className="text-xs text-neutral-400">Generating…</span>}
          </div>
          {!selectedOrder && <p className="mt-4 text-sm text-neutral-400">Select an order to see AI guidance.</p>}
          {selectedOrder && suggestion && !loadingSuggestion && (
            <div className="mt-4 space-y-3 text-sm text-neutral-200">
              <div>
                <span className="mr-2">📍</span>
                <strong>Driver:</strong> {suggestion.suggestedDriverName ?? "Review needed"}
              </div>
              <div>
                <span className="mr-2">🚛</span>
                <strong>Unit:</strong> {suggestion.suggestedUnitCode ?? "Assign manually"}
              </div>
              <div>
                <span className="mr-2">💲</span>
                <strong>Rate:</strong> ${totalCpm.toFixed(2)}/mi • {miles} mi
              </div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-300">
                <div className="font-semibold text-neutral-200">🧠 Reasoning</div>
                <p className="mt-1 text-neutral-300">{suggestion.reasoning.summary}</p>
                <ul className="mt-2 space-y-1">
                  {suggestion.reasoning.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
          <h3 className="text-lg font-semibold text-slate-100">Dispatch Overrides</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="text-xs uppercase tracking-wide text-neutral-400">
              Driver
              <select
                value={selectedDriverId ?? ""}
                onChange={(event) => setSelectedDriverId(event.target.value || null)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 p-2 text-sm text-slate-100"
              >
                <option value="">{suggestion?.suggestedDriverName ? "Use AI suggestion" : "Select driver"}</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} • {driver.homeBase ?? "No home base"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs uppercase tracking-wide text-neutral-400">
              Unit
              <select
                value={selectedUnitId ?? ""}
                onChange={(event) => setSelectedUnitId(event.target.value || null)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 p-2 text-sm text-slate-100"
              >
                <option value="">{suggestion?.suggestedUnitCode ? "Use AI suggestion" : "Select unit"}</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code} • {unit.homeBase ?? "Mobile"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs uppercase tracking-wide text-neutral-400">
              Rate Template
              <select
                value={selectedRateId ?? ""}
                onChange={(event) => handleRateChange(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 p-2 text-sm text-slate-100"
              >
                <option value="">{suggestion?.suggestedRateId ? "Use AI suggestion" : "Select rate"}</option>
                {rates.map((rate) => (
                  <option key={rate.id} value={rate.id}>
                    {rate.type ?? "Linehaul"} • {rate.zone ?? "General"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs uppercase tracking-wide text-neutral-400">
              Trip Type
              <input
                value={tripType}
                onChange={(event) => setTripType(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 p-2 text-sm text-slate-100"
                placeholder="Linehaul"
              />
            </label>
            <label className="text-xs uppercase tracking-wide text-neutral-400">
              Trip Zone
              <input
                value={tripZone}
                onChange={(event) => setTripZone(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 p-2 text-sm text-slate-100"
                placeholder="ON-MI"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-xs uppercase tracking-wide text-neutral-400">
              Miles
              <input
                type="number"
                min={1}
                value={miles}
                onChange={(event) => setMiles(Number(event.target.value) || 0)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 p-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs uppercase tracking-wide text-neutral-400">
              Linehaul RPM
              <input
                type="number"
                step="0.01"
                value={rpm}
                onChange={(event) => setRpm(Number(event.target.value) || 0)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 p-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs uppercase tracking-wide text-neutral-400">
              Fuel Surcharge CPM
              <input
                type="number"
                step="0.01"
                value={fuelSurcharge}
                onChange={(event) => setFuelSurcharge(Number(event.target.value) || 0)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 p-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs uppercase tracking-wide text-neutral-400">
              Accessorial CPM
              <input
                type="number"
                step="0.01"
                value={addOns}
                onChange={(event) => setAddOns(Number(event.target.value) || 0)}
                className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950/60 p-2 text-sm text-slate-100"
              />
            </label>
          </div>

          <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-200">
            <div className="flex items-center justify-between">
              <span>Total CPM</span>
              <span className="font-semibold text-indigo-300">${totalCpm.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span>Projected Revenue</span>
              <span className="font-semibold text-indigo-300">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleBookTrip}
              disabled={!selectedOrder || booking}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-neutral-700"
            >
              {booking ? "Booking…" : "Book Trip"}
            </button>
          </div>
        </div>
      </div>

      {confirmation && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-6 text-neutral-100 shadow-2xl">
            <h4 className="text-lg font-semibold">Trip Booked</h4>
            <p className="mt-2 text-sm text-neutral-300">
              Trip <span className="font-medium text-indigo-300">{confirmation.tripId}</span> scheduled for {confirmation.route}.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-200">
              <li>Driver: {confirmation.driver}</li>
              <li>Unit: {confirmation.unit}</li>
              <li>Total Revenue: ${confirmation.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</li>
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
