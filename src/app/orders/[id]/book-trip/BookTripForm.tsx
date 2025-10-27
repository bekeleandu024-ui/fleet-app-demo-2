"use client";

import { useState, useTransition } from "react";

type BookTripFormProps = {
  createTrip: (formData: FormData) => Promise<void>;
};

export default function BookTripForm({ createTrip }: BookTripFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            await createTrip(formData);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to book trip");
          }
        });
      }}
      className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm"
    >
      {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-rose-200">{error}</div>}
      <div className="grid gap-1">
        <label htmlFor="driver" className="text-xs uppercase tracking-wide text-zinc-400">
          Driver
        </label>
        <input
          id="driver"
          name="driver"
          required
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          placeholder="Driver name"
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor="unit" className="text-xs uppercase tracking-wide text-zinc-400">
          Unit
        </label>
        <input
          id="unit"
          name="unit"
          required
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          placeholder="Tractor or trailer"
        />
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
            min="0"
            required
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
            min="0"
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor="tripStart" className="text-xs uppercase tracking-wide text-zinc-400">
            Trip Start
          </label>
          <input
            id="tripStart"
            name="tripStart"
            type="datetime-local"
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
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
      </div>
      <div className="grid gap-1">
        <label htmlFor="weekStart" className="text-xs uppercase tracking-wide text-zinc-400">
          Week Start
        </label>
        <input
          id="weekStart"
          name="weekStart"
          type="date"
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        />
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
