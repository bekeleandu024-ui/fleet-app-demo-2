"use client";

import { useMemo, useState, useTransition } from "react";

type TripFormValues = {
  driver: string;
  driverId: string;
  unit: string;
  unitId: string;
  rateId: string;
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
  tripStart: string;
  tripEnd: string;
  weekStart: string;
  status: string;
};

type DriverOption = { id: string; name: string };
type UnitOption = { id: string; code: string };
type RateOption = {
  id: string;
  label: string;
  fixedCPM: number;
  wageCPM: number;
  addOnsCPM: number;
  rollingCPM: number;
};

type Props = {
  trip: {
    id: string;
    orderId: string | null;
    driver: string;
    unit: string;
    driverId: string;
    unitId: string;
    rateId: string;
    miles: number;
    revenue: number | "";
    fixedCPM: number | "";
    wageCPM: number | "";
    addOnsCPM: number | "";
    rollingCPM: number | "";
    totalCPM: number | "";
    totalCost: number | "";
    profit: number | "";
    marginPct: number | "";
    tripStart: string;
    tripEnd: string;
    weekStart: string;
    status: string;
  };
  drivers: DriverOption[];
  units: UnitOption[];
  rates: RateOption[];
  updateTrip: (formData: FormData) => Promise<void>;
};

function toStringValue(value: number | "") {
  if (value === "") return "";
  return Number.isFinite(value) ? value.toString() : "";
}

export default function EditForm({ trip, drivers, units, rates, updateTrip }: Props) {
  const [formValues, setFormValues] = useState<TripFormValues>({
    driver: trip.driver ?? "",
    driverId: trip.driverId ?? "",
    unit: trip.unit ?? "",
    unitId: trip.unitId ?? "",
    rateId: trip.rateId ?? "",
    miles: trip.miles.toString(),
    revenue: toStringValue(trip.revenue),
    fixedCPM: toStringValue(trip.fixedCPM),
    wageCPM: toStringValue(trip.wageCPM),
    addOnsCPM: toStringValue(trip.addOnsCPM),
    rollingCPM: toStringValue(trip.rollingCPM),
    totalCPM: toStringValue(trip.totalCPM),
    totalCost: toStringValue(trip.totalCost),
    profit: toStringValue(trip.profit),
    marginPct: toStringValue(trip.marginPct),
    tripStart: trip.tripStart ?? "",
    tripEnd: trip.tripEnd ?? "",
    weekStart: trip.weekStart ?? "",
    status: trip.status ?? "Created",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedRate = useMemo(() => rates.find((rate) => rate.id === formValues.rateId), [rates, formValues.rateId]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            await updateTrip(formData);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update trip");
          }
        });
      }}
      className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm"
    >
      <input type="hidden" name="orderId" value={trip.orderId ?? ""} />
      {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-rose-200">{error}</div>}
      <div className="grid gap-1">
        <label className="text-xs uppercase tracking-wide text-zinc-400" htmlFor="driverId">
          Driver
        </label>
        <select
          id="driverId"
          name="driverId"
          value={formValues.driverId}
          onChange={(event) => {
            const value = event.target.value;
            const driver = drivers.find((item) => item.id === value);
            setFormValues((prev) => ({
              ...prev,
              driverId: value,
              driver: driver ? driver.name : prev.driver,
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
        <label className="text-xs uppercase tracking-wide text-zinc-400" htmlFor="driver">
          Driver Name (display)
        </label>
        <input
          id="driver"
          name="driver"
          value={formValues.driver}
          onChange={(event) => setFormValues((prev) => ({ ...prev, driver: event.target.value }))}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        />
      </div>
      <div className="grid gap-1">
        <label className="text-xs uppercase tracking-wide text-zinc-400" htmlFor="unitId">
          Unit
        </label>
        <select
          id="unitId"
          name="unitId"
          value={formValues.unitId}
          onChange={(event) => {
            const value = event.target.value;
            const unit = units.find((item) => item.id === value);
            setFormValues((prev) => ({
              ...prev,
              unitId: value,
              unit: unit ? unit.code : prev.unit,
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
        <label className="text-xs uppercase tracking-wide text-zinc-400" htmlFor="unit">
          Unit Code (display)
        </label>
        <input
          id="unit"
          name="unit"
          value={formValues.unit}
          onChange={(event) => setFormValues((prev) => ({ ...prev, unit: event.target.value }))}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        />
      </div>
      <div className="grid gap-1">
        <label className="text-xs uppercase tracking-wide text-zinc-400" htmlFor="rateId">
          Rate Template
        </label>
        <select
          id="rateId"
          name="rateId"
          value={formValues.rateId}
          onChange={(event) => {
            const value = event.target.value;
            const rate = rates.find((item) => item.id === value);
            setFormValues((prev) => ({
              ...prev,
              rateId: value,
              fixedCPM: rate ? rate.fixedCPM.toString() : prev.fixedCPM,
              wageCPM: rate ? rate.wageCPM.toString() : prev.wageCPM,
              addOnsCPM: rate ? rate.addOnsCPM.toString() : prev.addOnsCPM,
              rollingCPM: rate ? rate.rollingCPM.toString() : prev.rollingCPM,
            }));
          }}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        >
          <option value="">No rate</option>
          {rates.map((rate) => (
            <option key={rate.id} value={rate.id}>
              {rate.label}
            </option>
          ))}
        </select>
        {selectedRate && (
          <p className="text-xs text-zinc-500">Applied from rate: {selectedRate.label}</p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor="miles" className="text-xs uppercase tracking-wide text-zinc-400">
            Miles
          </label>
          <input
            id="miles"
            name="miles"
            type="number"
            step="0.1"
            required
            value={formValues.miles}
            onChange={(event) => setFormValues((prev) => ({ ...prev, miles: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="revenue" className="text-xs uppercase tracking-wide text-zinc-400">
            Revenue
          </label>
          <input
            id="revenue"
            name="revenue"
            type="number"
            step="0.01"
            value={formValues.revenue}
            onChange={(event) => setFormValues((prev) => ({ ...prev, revenue: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor="fixedCPM" className="text-xs uppercase tracking-wide text-zinc-400">
            Fixed CPM
          </label>
          <input
            id="fixedCPM"
            name="fixedCPM"
            type="number"
            step="0.01"
            value={formValues.fixedCPM}
            onChange={(event) => setFormValues((prev) => ({ ...prev, fixedCPM: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="wageCPM" className="text-xs uppercase tracking-wide text-zinc-400">
            Wage CPM
          </label>
          <input
            id="wageCPM"
            name="wageCPM"
            type="number"
            step="0.01"
            value={formValues.wageCPM}
            onChange={(event) => setFormValues((prev) => ({ ...prev, wageCPM: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="addOnsCPM" className="text-xs uppercase tracking-wide text-zinc-400">
            Add-ons CPM
          </label>
          <input
            id="addOnsCPM"
            name="addOnsCPM"
            type="number"
            step="0.01"
            value={formValues.addOnsCPM}
            onChange={(event) => setFormValues((prev) => ({ ...prev, addOnsCPM: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="rollingCPM" className="text-xs uppercase tracking-wide text-zinc-400">
            Rolling CPM
          </label>
          <input
            id="rollingCPM"
            name="rollingCPM"
            type="number"
            step="0.01"
            value={formValues.rollingCPM}
            onChange={(event) => setFormValues((prev) => ({ ...prev, rollingCPM: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-1">
          <label htmlFor="totalCPM" className="text-xs uppercase tracking-wide text-zinc-400">
            Total CPM
          </label>
          <input
            id="totalCPM"
            name="totalCPM"
            type="number"
            step="0.01"
            value={formValues.totalCPM}
            onChange={(event) => setFormValues((prev) => ({ ...prev, totalCPM: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="totalCost" className="text-xs uppercase tracking-wide text-zinc-400">
            Total Cost
          </label>
          <input
            id="totalCost"
            name="totalCost"
            type="number"
            step="0.01"
            value={formValues.totalCost}
            onChange={(event) => setFormValues((prev) => ({ ...prev, totalCost: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="profit" className="text-xs uppercase tracking-wide text-zinc-400">
            Profit
          </label>
          <input
            id="profit"
            name="profit"
            type="number"
            step="0.01"
            value={formValues.profit}
            onChange={(event) => setFormValues((prev) => ({ ...prev, profit: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="marginPct" className="text-xs uppercase tracking-wide text-zinc-400">
            Margin %
          </label>
          <input
            id="marginPct"
            name="marginPct"
            type="number"
            step="0.01"
            value={formValues.marginPct}
            onChange={(event) => setFormValues((prev) => ({ ...prev, marginPct: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-1">
          <label htmlFor="tripStart" className="text-xs uppercase tracking-wide text-zinc-400">
            Trip Start
          </label>
          <input
            id="tripStart"
            name="tripStart"
            type="datetime-local"
            value={formValues.tripStart}
            onChange={(event) => setFormValues((prev) => ({ ...prev, tripStart: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="tripEnd" className="text-xs uppercase tracking-wide text-zinc-400">
            Trip End
          </label>
          <input
            id="tripEnd"
            name="tripEnd"
            type="datetime-local"
            value={formValues.tripEnd}
            onChange={(event) => setFormValues((prev) => ({ ...prev, tripEnd: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="weekStart" className="text-xs uppercase tracking-wide text-zinc-400">
            Week Start
          </label>
          <input
            id="weekStart"
            name="weekStart"
            type="date"
            value={formValues.weekStart}
            onChange={(event) => setFormValues((prev) => ({ ...prev, weekStart: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
      </div>
      <div className="grid gap-1">
        <label htmlFor="status" className="text-xs uppercase tracking-wide text-zinc-400">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={formValues.status}
          onChange={(event) => setFormValues((prev) => ({ ...prev, status: event.target.value }))}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        >
          {[
            "Created",
            "Dispatched",
            "In Transit",
            "Completed",
            "Cancelled",
          ].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save Trip"}
        </button>
      </div>
    </form>
  );
}
