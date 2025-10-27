"use client";

import { useState, useTransition } from "react";

type UnitFormValues = {
  code: string;
  type: string;
  homeBase: string;
  weeklyFixedCost: string;
  active: boolean;
};

type UnitFormProps = {
  initialValues?: Partial<UnitFormValues>;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
};

export default function UnitForm({ initialValues, action, submitLabel }: UnitFormProps) {
  const [values, setValues] = useState<UnitFormValues>({
    code: initialValues?.code ?? "",
    type: initialValues?.type ?? "",
    homeBase: initialValues?.homeBase ?? "",
    weeklyFixedCost: initialValues?.weeklyFixedCost ?? "",
    active: initialValues?.active ?? true,
  });
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
            await action(formData);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save unit");
          }
        });
      }}
      className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm"
    >
      {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-rose-200">{error}</div>}
      <div className="grid gap-1">
        <label htmlFor="code" className="text-xs uppercase tracking-wide text-zinc-400">
          Code
        </label>
        <input
          id="code"
          name="code"
          required
          value={values.code}
          onChange={(event) => setValues((prev) => ({ ...prev, code: event.target.value }))}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor="type" className="text-xs uppercase tracking-wide text-zinc-400">
          Type
        </label>
        <input
          id="type"
          name="type"
          value={values.type}
          onChange={(event) => setValues((prev) => ({ ...prev, type: event.target.value }))}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor="homeBase" className="text-xs uppercase tracking-wide text-zinc-400">
          Home Base
        </label>
        <input
          id="homeBase"
          name="homeBase"
          value={values.homeBase}
          onChange={(event) => setValues((prev) => ({ ...prev, homeBase: event.target.value }))}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor="weeklyFixedCost" className="text-xs uppercase tracking-wide text-zinc-400">
          Weekly Fixed Cost ($/week)
        </label>
        <input
          id="weeklyFixedCost"
          name="weeklyFixedCost"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 675"
          value={values.weeklyFixedCost}
          onChange={(event) => setValues((prev) => ({ ...prev, weeklyFixedCost: event.target.value }))}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        />
      </div>
      <label className="flex items-center gap-3 text-sm text-zinc-300">
        <input
          type="checkbox"
          name="active"
          checked={values.active}
          onChange={(event) => setValues((prev) => ({ ...prev, active: event.target.checked }))}
          className="h-4 w-4 rounded border border-zinc-700 bg-black"
        />
        Active
      </label>
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
