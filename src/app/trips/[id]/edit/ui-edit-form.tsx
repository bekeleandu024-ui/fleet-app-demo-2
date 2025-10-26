"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

export type TripForClient = {
  id: string;
  driver: string;
  unit: string;
  miles: number;
  revenue?: number | null;
  fixedCPM?: number | null;
  wageCPM?: number | null;
  addOnsCPM?: number | null;
  rollingCPM?: number | null;
  totalCPM?: number | null;
  totalCost?: number | null;
  profit?: number | null;
  marginPct?: number | null;
  type?: string | null;
  zone?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  driverId?: string | null;
  unitId?: string | null;
  rateId?: string | null;
  tripStart?: string | null;
  tripEnd?: string | null;
};

type Option = {
  id: string;
  name?: string;
  code?: string;
  label?: string;
};

type RateOption = Option & {
  fixedCPM: number;
  wageCPM: number;
  addOnsCPM: number;
  rollingCPM: number;
};

type Props = {
  trip: TripForClient;
  drivers: Option[];
  units: Option[];
  types: string[];
  zones: string[];
  rates?: RateOption[];
};

const NUMERIC_FIELDS: Array<keyof Pick<TripForClient,
  | "miles"
  | "revenue"
  | "fixedCPM"
  | "wageCPM"
  | "addOnsCPM"
  | "rollingCPM"
  | "totalCPM"
  | "totalCost"
  | "profit"
  | "marginPct"
>> = [
  "miles",
  "revenue",
  "fixedCPM",
  "wageCPM",
  "addOnsCPM",
  "rollingCPM",
  "totalCPM",
  "totalCost",
  "profit",
  "marginPct",
];

export default function EditForm({ trip, drivers, units, types, zones, rates }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<TripForClient>({ ...trip });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const rateMap = useMemo(() => {
    const map = new Map<string, RateOption>();
    (rates ?? []).forEach((rate) => {
      map.set(rate.id, rate);
    });
    return map;
  }, [rates]);

  const onTextChange = (key: keyof TripForClient, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const onNumberChange = (key: typeof NUMERIC_FIELDS[number], value: string) => {
    if (key === "miles") {
      if (value === "") return;
      const numeric = Number(value);
      if (Number.isNaN(numeric)) return;
      setForm((current) => ({ ...current, miles: numeric }));
      return;
    }
    if (value === "") {
      setForm((current) => ({ ...current, [key]: null }));
      return;
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    setForm((current) => ({ ...current, [key]: numeric }));
  };

  const onDriverChange = (value: string) => {
    const option = drivers.find((driver) => driver.id === value);
    setForm((current) => ({
      ...current,
      driverId: option?.id ?? null,
      driver: option?.name ?? current.driver,
    }));
  };

  const onUnitChange = (value: string) => {
    const option = units.find((unit) => unit.id === value);
    setForm((current) => ({
      ...current,
      unitId: option?.id ?? null,
      unit: option?.code ?? current.unit,
    }));
  };

  const onRateChange = (value: string) => {
    const option = value ? rateMap.get(value) : undefined;
    setForm((current) => {
      const next: TripForClient = {
        ...current,
        rateId: option?.id ?? null,
      };
      if (option) {
        next.fixedCPM = option.fixedCPM;
        next.wageCPM = option.wageCPM;
        next.addOnsCPM = option.addOnsCPM;
        next.rollingCPM = option.rollingCPM;
        const total = option.fixedCPM + option.wageCPM + option.addOnsCPM + option.rollingCPM;
        next.totalCPM = total;
      }
      return next;
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const payload = {
      ...form,
      tripStart: form.tripStart || null,
      tripEnd: form.tripEnd || null,
      driverId: form.driverId || null,
      unitId: form.unitId || null,
      rateId: form.rateId || null,
    };
    startTransition(async () => {
      try {
        const response = await fetch(`/api/trips/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error ?? "Failed to update trip");
        }
        const updated: TripForClient = data.trip;
        setForm({ ...updated });
        setMessage("Trip updated.");
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Unable to update trip");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Driver"
          value={form.driverId ?? ""}
          onChange={onDriverChange}
          options={drivers.map((driver) => ({ value: driver.id, label: driver.name ?? driver.id }))}
        />
        <SelectField
          label="Unit"
          value={form.unitId ?? ""}
          onChange={onUnitChange}
          options={units.map((unit) => ({ value: unit.id, label: unit.code ?? unit.id }))}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="Trip type"
          value={form.type ?? ""}
          onChange={(value) => onTextChange("type", value)}
          suggestionsId="trip-types"
          suggestions={types}
        />
        <TextInput
          label="Zone"
          value={form.zone ?? ""}
          onChange={(value) => onTextChange("zone", value)}
          suggestionsId="trip-zones"
          suggestions={zones}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <NumberInput
          label="Miles"
          value={form.miles}
          onChange={(value) => onNumberChange("miles", value)}
          required
        />
        <NumberInput
          label="Revenue"
          value={form.revenue ?? ""}
          onChange={(value) => onNumberChange("revenue", value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <NumberInput
          label="Fixed CPM"
          value={form.fixedCPM ?? ""}
          onChange={(value) => onNumberChange("fixedCPM", value)}
        />
        <NumberInput
          label="Wage CPM"
          value={form.wageCPM ?? ""}
          onChange={(value) => onNumberChange("wageCPM", value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <NumberInput
          label="Add-ons CPM"
          value={form.addOnsCPM ?? ""}
          onChange={(value) => onNumberChange("addOnsCPM", value)}
        />
        <NumberInput
          label="Rolling CPM"
          value={form.rollingCPM ?? ""}
          onChange={(value) => onNumberChange("rollingCPM", value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <NumberInput
          label="Total CPM"
          value={form.totalCPM ?? ""}
          onChange={(value) => onNumberChange("totalCPM", value)}
        />
        <NumberInput
          label="Total cost"
          value={form.totalCost ?? ""}
          onChange={(value) => onNumberChange("totalCost", value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <NumberInput
          label="Profit"
          value={form.profit ?? ""}
          onChange={(value) => onNumberChange("profit", value)}
        />
        <NumberInput
          label="Margin %"
          value={form.marginPct ?? ""}
          onChange={(value) => onNumberChange("marginPct", value)}
        />
      </div>
      {rates && rates.length > 0 && (
        <SelectField
          label="Rate program"
          value={form.rateId ?? ""}
          onChange={onRateChange}
          options={[
            { value: "", label: "None" },
            ...rates.map((rate) => ({ value: rate.id, label: rate.label ?? "Rate" })),
          ]}
        />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <DateInput
          label="Trip start"
          value={form.tripStart ?? ""}
          onChange={(value) => onTextChange("tripStart", value)}
        />
        <DateInput
          label="Trip end"
          value={form.tripEnd ?? ""}
          onChange={(value) => onTextChange("tripEnd", value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="Driver name override"
          value={form.driver}
          onChange={(value) => onTextChange("driver", value)}
        />
        <TextInput
          label="Unit code override"
          value={form.unit}
          onChange={(value) => onTextChange("unit", value)}
        />
      </div>
      <TextInput
        label="Status"
        value={form.status}
        onChange={(value) => onTextChange("status", value)}
      />
      {message && <div className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        disabled={isPending}
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
};

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <select
        className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type TextInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestionsId?: string;
  suggestions?: string[];
};

function TextInput({ label, value, onChange, suggestionsId, suggestions }: TextInputProps) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        list={suggestionsId}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {suggestions && suggestions.length > 0 && suggestionsId && (
        <datalist id={suggestionsId}>
          {suggestions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </div>
  );
}

type NumberInputProps = {
  label: string;
  value: number | string | null;
  onChange: (value: string) => void;
  required?: boolean;
};

function NumberInput({ label, value, onChange, required }: NumberInputProps) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}{required && <span className="ml-1 text-red-500">*</span>}</label>
      <input
        type="number"
        step="0.01"
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
    </div>
  );
}

type DateInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function DateInput({ label, value, onChange }: DateInputProps) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        type="datetime-local"
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
