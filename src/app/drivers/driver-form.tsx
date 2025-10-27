"use client";

import { useState, useTransition } from "react";

type DriverFormValues = {
  name: string;
  license: string;
  homeBase: string;
  active: boolean;
};

type DriverFormProps = {
  initialValues?: Partial<DriverFormValues>;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
};

export default function DriverForm({ initialValues, action, submitLabel }: DriverFormProps) {
  const [values, setValues] = useState<DriverFormValues>({
    name: initialValues?.name ?? "",
    license: initialValues?.license ?? "",
    homeBase: initialValues?.homeBase ?? "",
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
            setError(err instanceof Error ? err.message : "Failed to save driver");
          }
        });
      }}
      className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm"
    >
      {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-rose-200">{error}</div>}
      <div className="grid gap-1">
        <label htmlFor="name" className="text-xs uppercase tracking-wide text-zinc-400">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor="license" className="text-xs uppercase tracking-wide text-zinc-400">
          License
        </label>
        <input
          id="license"
          name="license"
          value={values.license}
          onChange={(event) => setValues((prev) => ({ ...prev, license: event.target.value }))}
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
