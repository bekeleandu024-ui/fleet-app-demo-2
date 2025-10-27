"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DriverOption = { id: string; name: string; type?: string | null };
type UnitOption = { id: string; code: string; weeklyFixedCost?: number | null };
type RateOption = { id: string; type: string; zone: string; fixedCPM: number; wageCPM: number; addOnsCPM: number; rollingCPM: number };
type RateSelectOption = { id: string; label: string };

type TripValues = {
  id: string;
  driverId?: string;
  unitId?: string;
  rateId?: string;
  driver: string;
  unit: string;
  type: string;
  zone: string;
  status: string;
  miles: number;
  revenue: number | null;
  fixedCPM: number | null;
  wageCPM: number | null;
  addOnsCPM: number | null;
  rollingCPM: number | null;
  totalCPM: number | null;
  totalCost: number | null;
  profit: number | null;
  marginPct: number | null;
  driverType?: string | null;
  unitWeeklyFixedCost?: number | null;
};

type Props = {
  trip: TripValues;
  drivers: DriverOption[];
  units: UnitOption[];
  types: string[];
  zones: string[];
  rates: RateOption[];
  rateOptions: RateSelectOption[];
};

type FormState = {
  driverId: string;
  unitId: string;
  rateId: string;
  driver: string;
  unit: string;
  type: string;
  zone: string;
  status: string;
  miles: string;
  revenue: string;
  fixedCPM: string;
  wageCPM: string;
  addOnsCPM: string;
  rollingCPM: string;
  totalCPM: string;
  totalCost: string;
  profit: string;
  marginPct: string;
};

function toInputValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

export default function EditForm({ trip, drivers, units, types, zones, rates, rateOptions }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<FormState>({
    driverId: trip.driverId ?? "",
    unitId: trip.unitId ?? "",
    rateId: trip.rateId ?? "",
    driver: trip.driver ?? "",
    unit: trip.unit ?? "",
    type: trip.type ?? "",
    zone: trip.zone ?? "",
    status: trip.status,
    miles: toInputValue(trip.miles),
    revenue: toInputValue(trip.revenue),
    fixedCPM: toInputValue(trip.fixedCPM),
    wageCPM: toInputValue(trip.wageCPM),
    addOnsCPM: toInputValue(trip.addOnsCPM),
    rollingCPM: toInputValue(trip.rollingCPM),
    totalCPM: toInputValue(trip.totalCPM),
    totalCost: toInputValue(trip.totalCost),
    profit: toInputValue(trip.profit),
    marginPct: toInputValue(trip.marginPct),
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rateDictionary = useMemo(() => {
    const dictionary = new Map<string, RateOption>();
    rates.forEach((rate) => dictionary.set(rate.id, rate));
    return dictionary;
  }, [rates]);

  const parseNumber = (value: string) => {
    if (value.trim() === "") return null;
    const number = Number(value);
    if (Number.isNaN(number)) {
      throw new Error(`Invalid number: ${value}`);
    }
    return number;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (values.miles.trim() === "") {
      setError("Miles is required");
      return;
    }

    let payload;
    try {
      const milesValue = Number(values.miles);
      if (!Number.isFinite(milesValue)) {
        throw new Error("Miles must be a number");
      }

      payload = {
        driverId: values.driverId || null,
        unitId: values.unitId || null,
        rateId: values.rateId || null,
        driver: values.driver || null,
        unit: values.unit || null,
        type: values.type || null,
        zone: values.zone || null,
        status: values.status,
        miles: milesValue,
        revenue: parseNumber(values.revenue),
        fixedCPM: parseNumber(values.fixedCPM),
        wageCPM: parseNumber(values.wageCPM),
        addOnsCPM: parseNumber(values.addOnsCPM),
        rollingCPM: parseNumber(values.rollingCPM),
        totalCPM: parseNumber(values.totalCPM),
        totalCost: parseNumber(values.totalCost),
        profit: parseNumber(values.profit),
        marginPct: parseNumber(values.marginPct),
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to prepare payload");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/trips/${trip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(typeof json?.error === "string" ? json.error : "Failed to update trip");
      }

      setSuccess("Trip updated");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update trip");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm">
      {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-rose-200">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-200">{success}</div>}

      <div className="grid gap-1">
        <label className="text-xs uppercase tracking-wide text-zinc-400" htmlFor="driverId">
          Driver
        </label>
        <select
          id="driverId"
          name="driverId"
          value={values.driverId}
          onChange={(event) => {
            const nextId = event.target.value;
            const selected = drivers.find((driver) => driver.id === nextId);
            setValues((prev) => ({
              ...prev,
              driverId: nextId,
              driver: selected?.name ?? "",
            }));
          }}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        >
          <option value="">Unassigned</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <label className="text-xs uppercase tracking-wide text-zinc-400" htmlFor="unitId">
          Unit
        </label>
        <select
          id="unitId"
          name="unitId"
          value={values.unitId}
          onChange={(event) => {
            const nextId = event.target.value;
            const selected = units.find((unit) => unit.id === nextId);
            setValues((prev) => ({
              ...prev,
              unitId: nextId,
              unit: selected?.code ?? "",
            }));
          }}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        >
          <option value="">Unassigned</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.code}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <label className="text-xs uppercase tracking-wide text-zinc-400" htmlFor="type">
          Type
        </label>
        <select
          id="type"
          name="type"
          value={values.type}
          onChange={(event) => setValues((prev) => ({ ...prev, type: event.target.value }))}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        >
          <option value="">Select type</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <label className="text-xs uppercase tracking-wide text-zinc-400" htmlFor="zone">
          Zone
        </label>
        <select
          id="zone"
          name="zone"
          value={values.zone}
          onChange={(event) => setValues((prev) => ({ ...prev, zone: event.target.value }))}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        >
          <option value="">Select zone</option>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <label className="text-xs uppercase tracking-wide text-zinc-400" htmlFor="rateId">
          Rate template
        </label>
        <select
          id="rateId"
          name="rateId"
          value={values.rateId}
          onChange={(event) => {
            const nextId = event.target.value;
            const rate = nextId ? rateDictionary.get(nextId) : undefined;
            setValues((prev) => ({
              ...prev,
              rateId: nextId,
              fixedCPM: rate ? rate.fixedCPM.toString() : prev.fixedCPM,
              wageCPM: rate ? rate.wageCPM.toString() : prev.wageCPM,
              addOnsCPM: rate ? rate.addOnsCPM.toString() : prev.addOnsCPM,
              rollingCPM: rate ? rate.rollingCPM.toString() : prev.rollingCPM,
            }));
          }}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        >
          <option value="">No rate</option>
          {rateOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <label className="text-xs uppercase tracking-wide text-zinc-400" htmlFor="status">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={values.status}
          onChange={(event) => setValues((prev) => ({ ...prev, status: event.target.value }))}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        >
          {[
            "Created",
            "Dispatched",
            "En Route",
            "Completed",
            "Cancelled",
          ].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1">
          <label className="text-xs uppercase tracking-wide text-zinc-400" htmlFor="miles">
            Miles
          </label>
          <input
            id="miles"
            name="miles"
            type="number"
            min={0}
            step="1"
            required
            value={values.miles}
            onChange={(event) => setValues((prev) => ({ ...prev, miles: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-1">
          <label className="text-xs uppercase tracking-wide text-zinc-400" htmlFor="revenue">
            Revenue ($)
          </label>
          <input
            id="revenue"
            name="revenue"
            type="number"
            min={0}
            step="0.01"
            value={values.revenue}
            onChange={(event) => setValues((prev) => ({ ...prev, revenue: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {([
          ["fixedCPM", "Fixed CPM"],
          ["wageCPM", "Wage CPM"],
          ["addOnsCPM", "Add-ons CPM"],
          ["rollingCPM", "Rolling CPM"],
          ["totalCPM", "Total CPM"],
          ["totalCost", "Total Cost"],
          ["profit", "Profit"],
          ["marginPct", "Margin (fraction)"]
        ] as Array<[keyof FormState, string]>).map(([key, label]) => (
          <div key={key} className="grid gap-1">
            <label className="text-xs uppercase tracking-wide text-zinc-400" htmlFor={key}>
              {label}
            </label>
            <input
              id={key}
              name={key}
              type="number"
              step="0.0001"
              value={values[key]}
              onChange={(event) => setValues((prev) => ({ ...prev, [key]: event.target.value }))}
              className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
