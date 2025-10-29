"use client";

import { useEffect, useMemo, useState } from "react";
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

interface DriverOption {
  id: string;
  name: string;
  homeBase: string | null;
  hoursAvailableToday: number | null;
  onTimeScore: number | null;
  type: string | null;
  preferredCustomers: string | null;
  blockedCustomers: string | null;
}

interface UnitOption {
  id: string;
  code: string;
  type: string | null;
  homeBase: string | null;
  status: string | null;
  isOnHold: boolean;
  active: boolean;
}

interface RateOption {
  id: string;
  type: string | null;
  zone: string | null;
  fixedCPM: number;
  wageCPM: number;
  addOnsCPM: number;
  fuelCPM: number;
  truckMaintCPM: number;
  trailerMaintCPM: number;
  rollingCPM: number;
}

interface BaseProps {
  orderId: string;
  driverId: string | null;
  unitId: string | null;
  rateId: string | null;
  drivers: DriverOption[];
  units: UnitOption[];
  rates: RateOption[];
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
  customerName: string | null | undefined,
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

const formatRateLabel = (rate: RateOption) => {
  const parts: string[] = [];
  if (rate.type) {
    parts.push(rate.type);
  }
  if (rate.zone) {
    parts.push(rate.zone);
  }
  const rolling = rate.rollingCPM || rate.fuelCPM + rate.truckMaintCPM + rate.trailerMaintCPM;
  const total = rate.fixedCPM + rate.wageCPM + rate.addOnsCPM + rolling;
  if (Number.isFinite(total) && total > 0) {
    parts.push(`${total.toFixed(2)} CPM`);
  }
  return parts.join(" · ") || "Rate";
};

const formatDriverMeta = (driver: DriverOption) => {
  const details: string[] = [];
  if (driver.homeBase) {
    details.push(`Home ${driver.homeBase}`);
  }
  if (driver.hoursAvailableToday != null) {
    details.push(`${driver.hoursAvailableToday} hrs available`);
  }
  return details.join(" · ");
};

const formatUnitMeta = (unit: UnitOption) => {
  const details: string[] = [];
  if (unit.type) {
    details.push(unit.type);
  }
  if (unit.homeBase) {
    details.push(`Home ${unit.homeBase}`);
  }
  if (unit.status) {
    details.push(unit.status);
  }
  return details.join(" · ");
};

const safeNumber = (value: string, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const marginClass = (value: number | null) => {
  if (value == null) {
    return "text-neutral-300";
  }
  if (value >= 0.15) {
    return "text-emerald-400";
  }
  if (value >= 0.08) {
    return "text-amber-400";
  }
  return "text-rose-400";
};

export default function BookTripButton(props: BaseProps) {
  const {
    orderId,
    driverId,
    unitId,
    rateId,
    drivers,
    units,
    rates,
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
    buildDefaultStops(orderOrigin ?? null, orderDestination ?? null, customerName ?? null),
  );
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(driverId);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(unitId);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(rateId);
  const [driverNameInput, setDriverNameInput] = useState(driverName ?? "");
  const [unitCodeInput, setUnitCodeInput] = useState(unitCode ?? "");
  const [tripTypeInput, setTripTypeInput] = useState(tripType ?? "");
  const [tripZoneInput, setTripZoneInput] = useState(tripZone ?? "");
  const [milesInput, setMilesInput] = useState(() =>
    Number.isFinite(miles) && miles > 0 ? miles.toString() : "",
  );
  const [rpmInput, setRpmInput] = useState("");
  const [totalRevenueInput, setTotalRevenueInput] = useState("");
  const [fuelInput, setFuelInput] = useState("0");
  const [addOnsInput, setAddOnsInput] = useState("0");
  const [totalCpmInput, setTotalCpmInput] = useState(() =>
    Number.isFinite(totalCpm) && totalCpm > 0 ? totalCpm.toFixed(2) : "",
  );
  const [lastEditedRevenueField, setLastEditedRevenueField] = useState<"rpm" | "revenue" | null>(null);

  const formatCurrency = (value: number) => value.toFixed(2);
  const formatRpm = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) {
      return "";
    }
    const fixed = value.toFixed(3);
    const trimmed = fixed.replace(/0+$/u, "").replace(/\.$/u, "");
    if (!trimmed.includes(".")) {
      return `${trimmed}.00`;
    }
    const decimals = trimmed.split(".")[1]?.length ?? 0;
    if (decimals === 1) {
      return `${trimmed}0`;
    }
    return trimmed;
  };

  const parsePositive = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const canRemoveStop = useMemo(() => stops.length > 1, [stops.length]);

  const selectedDriver = useMemo(
    () => (selectedDriverId ? drivers.find((option) => option.id === selectedDriverId) ?? null : null),
    [drivers, selectedDriverId],
  );

  const selectedUnit = useMemo(
    () => (selectedUnitId ? units.find((option) => option.id === selectedUnitId) ?? null : null),
    [units, selectedUnitId],
  );

  const selectedRate = useMemo(
    () => (selectedRateId ? rates.find((option) => option.id === selectedRateId) ?? null : null),
    [rates, selectedRateId],
  );

  const milesValue = useMemo(() => safeNumber(milesInput, 0), [milesInput]);
  const rpmValue = useMemo(() => safeNumber(rpmInput, 0), [rpmInput]);
  const totalRevenueValue = useMemo(
    () => safeNumber(totalRevenueInput, 0),
    [totalRevenueInput],
  );
  const fuelValue = useMemo(() => safeNumber(fuelInput, 0), [fuelInput]);
  const addOnsValue = useMemo(() => safeNumber(addOnsInput, 0), [addOnsInput]);
  const totalCpmValue = useMemo(() => safeNumber(totalCpmInput, 0), [totalCpmInput]);

  const revenueEstimate = useMemo(() => {
    if (totalRevenueValue > 0) {
      return Number(totalRevenueValue.toFixed(2));
    }
    if (milesValue <= 0 || rpmValue <= 0) {
      return 0;
    }
    return Number((milesValue * rpmValue).toFixed(2));
  }, [milesValue, rpmValue, totalRevenueValue]);

  const costEstimate = useMemo(() => {
    if (milesValue <= 0 || totalCpmValue < 0) {
      return 0;
    }
    return Number((milesValue * totalCpmValue).toFixed(2));
  }, [milesValue, totalCpmValue]);

  const projectedRpmEstimate = useMemo(() => {
    if (milesValue > 0 && revenueEstimate > 0) {
      const rpm = revenueEstimate / milesValue;
      if (Number.isFinite(rpm) && rpm > 0) {
        return Number(rpm.toFixed(2));
      }
    }
    if (rpmValue > 0) {
      return Number(rpmValue.toFixed(2));
    }
    return null;
  }, [milesValue, revenueEstimate, rpmValue]);

  const marginEstimate = useMemo(() => {
    if (revenueEstimate <= 0) {
      return null;
    }
    const margin = (revenueEstimate - costEstimate) / revenueEstimate;
    if (!Number.isFinite(margin)) {
      return null;
    }
    return margin;
  }, [costEstimate, revenueEstimate]);

  const totalCostDisplay = useMemo(() => {
    if (milesValue <= 0 || totalCpmValue < 0) {
      return "";
    }
    return formatCurrency(milesValue * totalCpmValue);
  }, [milesValue, totalCpmValue]);

  const handleRpmInputChange = (value: string) => {
    setRpmInput(value);
    setLastEditedRevenueField("rpm");

    if (!value.trim()) {
      setTotalRevenueInput("");
      return;
    }

    const rpmNumber = parsePositive(value);
    if (rpmNumber === null) {
      setTotalRevenueInput("");
      return;
    }

    const milesNumber = parsePositive(milesInput);
    if (milesNumber == null) {
      return;
    }

    setTotalRevenueInput(formatCurrency(milesNumber * rpmNumber));
  };

  const handleRpmBlur = () => {
    const rpmNumber = parsePositive(rpmInput ?? "");
    if (rpmNumber == null) {
      setRpmInput("");
      return;
    }
    setRpmInput(formatRpm(rpmNumber));
  };

  const handleTotalRevenueChange = (value: string) => {
    setTotalRevenueInput(value);
    setLastEditedRevenueField("revenue");

    if (!value.trim()) {
      setRpmInput("");
      return;
    }

    const revenueNumber = parsePositive(value);
    if (revenueNumber === null) {
      setRpmInput("");
      return;
    }

    const milesNumber = parsePositive(milesInput);
    if (milesNumber == null) {
      return;
    }

    const rpmFromRevenue = revenueNumber / milesNumber;
    if (!Number.isFinite(rpmFromRevenue) || rpmFromRevenue <= 0) {
      setRpmInput("");
      return;
    }

    setRpmInput(formatRpm(rpmFromRevenue));
  };

  const handleTotalRevenueBlur = () => {
    const revenueNumber = parsePositive(totalRevenueInput ?? "");
    if (revenueNumber == null) {
      setTotalRevenueInput("");
      return;
    }
    setTotalRevenueInput(formatCurrency(revenueNumber));
  };

  useEffect(() => {
    if (milesValue <= 0) {
      return;
    }

    if (lastEditedRevenueField === "revenue") {
      const revenueNumber = parsePositive(totalRevenueInput);
      if (revenueNumber != null) {
        const rpmFromRevenue = revenueNumber / milesValue;
        if (Number.isFinite(rpmFromRevenue) && rpmFromRevenue > 0) {
          setRpmInput(formatRpm(rpmFromRevenue));
        }
      }
      return;
    }

    if (lastEditedRevenueField === "rpm") {
      const rpmNumber = parsePositive(rpmInput);
      if (rpmNumber != null) {
        setTotalRevenueInput(formatCurrency(rpmNumber * milesValue));
      }
    }
  }, [lastEditedRevenueField, milesValue]);

  const handleStopChange = (id: string, field: keyof StopFormState, value: string) => {
    setStops((prev) =>
      prev.map((stop) => (stop.id === id ? { ...stop, [field]: value } : stop)),
    );
  };

  const handleDriverSelect = (value: string) => {
    const nextId = value || null;
    setSelectedDriverId(nextId);
    const option = drivers.find((driver) => driver.id === nextId) ?? null;
    setDriverNameInput(option?.name ?? "");
  };

  const handleUnitSelect = (value: string) => {
    const nextId = value || null;
    setSelectedUnitId(nextId);
    const option = units.find((unit) => unit.id === nextId) ?? null;
    setUnitCodeInput(option?.code ?? "");
  };

  const handleRateSelect = (value: string) => {
    const nextId = value || null;
    setSelectedRateId(nextId);
    const option = rates.find((rate) => rate.id === nextId) ?? null;
    if (option) {
      setTripTypeInput(option.type ?? "");
      setTripZoneInput(option.zone ?? "");
      const rolling = option.rollingCPM || option.fuelCPM + option.truckMaintCPM + option.trailerMaintCPM;
      const total = option.fixedCPM + option.wageCPM + option.addOnsCPM + rolling;
      const suggestedRpm = total > 0 ? Number((total + 0.45).toFixed(2)) : null;
      if (suggestedRpm !== null) {
        setRpmInput(formatRpm(suggestedRpm));
        setLastEditedRevenueField("rpm");
        const milesParsed = safeNumber(milesInput, 0);
        if (milesParsed > 0) {
          setTotalRevenueInput(formatCurrency(milesParsed * suggestedRpm));
        } else {
          setTotalRevenueInput("");
        }
      }
      setTotalCpmInput(total.toFixed(2));
    }
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
    const driverNameValue = driverNameInput.trim();
    const unitCodeValue = unitCodeInput.trim();
    if (!driverNameValue || !unitCodeValue) {
      setStatus("error");
      setMessage("Driver name and unit code are required.");
      return;
    }

    if (stops.length === 0) {
      setMessage("Add at least one stop before booking.");
      setStatus("error");
      return;
    }

    if (milesValue <= 0 || rpmValue <= 0) {
      setStatus("error");
      setMessage("Enter miles and RPM before booking.");
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const payload = {
        orderId,
        driverId: selectedDriverId,
        unitId: selectedUnitId,
        rateId: selectedRateId,
        driverName: driverNameValue,
        unitCode: unitCodeValue,
        tripType: tripTypeInput.trim() || null,
        tripZone: tripZoneInput.trim() || null,
        miles: milesValue,
        rpm: rpmValue,
        fuelSurcharge: fuelValue,
        addOns: addOnsValue,
        totalCpm: totalCpmValue || null,
        total: Number(revenueEstimate.toFixed(2)),
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
      setMessage("Trip booked. Redirecting to trips board…");
      router.push("/trips");
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
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-neutral-200">Trip Assignment</div>
            <p className="text-xs text-neutral-400">Align resources, economics, and guardrails before booking.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500">Driver</label>
              <select
                value={selectedDriverId ?? ""}
                onChange={(event) => handleDriverSelect(event.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {drivers.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              {selectedDriver && (
                <p className="text-[11px] text-neutral-500">{formatDriverMeta(selectedDriver)}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500">Driver Name (manifest)</label>
              <input
                value={driverNameInput}
                onChange={(event) => setDriverNameInput(event.target.value)}
                placeholder="Driver name"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500">Unit</label>
              <select
                value={selectedUnitId ?? ""}
                onChange={(event) => handleUnitSelect(event.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {units.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.code}
                  </option>
                ))}
              </select>
              {selectedUnit && (
                <p className="text-[11px] text-neutral-500">{formatUnitMeta(selectedUnit)}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500">Unit Code (BOL)</label>
              <input
                value={unitCodeInput}
                onChange={(event) => setUnitCodeInput(event.target.value)}
                placeholder="Unit code"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500">Rate</label>
              <select
                value={selectedRateId ?? ""}
                onChange={(event) => handleRateSelect(event.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select rate</option>
                {rates.map((option) => (
                  <option key={option.id} value={option.id}>
                    {formatRateLabel(option)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500">Trip Type</label>
              <input
                value={tripTypeInput}
                onChange={(event) => setTripTypeInput(event.target.value)}
                placeholder="Linehaul / Shuttle / Dedicated"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500">Trip Zone</label>
              <input
                value={tripZoneInput}
                onChange={(event) => setTripZoneInput(event.target.value)}
                placeholder="Zone"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500">Miles</label>
              <input
                value={milesInput}
                onChange={(event) => setMilesInput(event.target.value)}
                placeholder="Miles"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500">Quoted RPM</label>
              <input
                value={rpmInput}
                onChange={(event) => handleRpmInputChange(event.target.value)}
                onBlur={handleRpmBlur}
                placeholder="Revenue per mile"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500">Total Revenue ($)</label>
              <input
                value={totalRevenueInput}
                onChange={(event) => handleTotalRevenueChange(event.target.value)}
                onBlur={handleTotalRevenueBlur}
                placeholder="Linehaul total"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500">Fuel Surcharge ($)</label>
              <input
                value={fuelInput}
                onChange={(event) => setFuelInput(event.target.value)}
                placeholder="Fuel"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500">Add-ons ($)</label>
              <input
                value={addOnsInput}
                onChange={(event) => setAddOnsInput(event.target.value)}
                placeholder="Accessorials"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500">Total Cost CPM</label>
              <input
                value={totalCpmInput}
                onChange={(event) => setTotalCpmInput(event.target.value)}
                placeholder="Cost per mile"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500">Total Cost ($)</label>
              <input
                value={totalCostDisplay}
                readOnly
                placeholder="Auto-calculated"
                className="w-full cursor-not-allowed rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-300"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Projected RPM</div>
              <div className="mt-1 text-sm font-semibold text-neutral-100">
                {projectedRpmEstimate != null ? `$${projectedRpmEstimate.toFixed(2)}/mi` : "—"}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Projected Margin</div>
              <div className={`mt-1 text-sm font-semibold ${marginClass(marginEstimate)}`}>
                {marginEstimate == null ? "—" : `${(marginEstimate * 100).toFixed(1)}%`}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
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
