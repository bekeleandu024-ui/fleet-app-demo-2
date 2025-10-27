"use client";

import { useMemo, useState, useTransition } from "react";
import type { ParsedOrder } from "@/lib/parse-order";
import OcrDropBox from "@/components/ocr-dropbox";

type FormState = {
  customer: string;
  origin: string;
  destination: string;
  puWindowStart: string;
  puWindowEnd: string;
  delWindowStart: string;
  delWindowEnd: string;
  requiredTruck: string;
  notes: string;
};

type CheckboxMap = Record<keyof ParsedOrder, boolean>;

type NewOrderFormProps = {
  createOrder: (formData: FormData) => Promise<void>;
};

const fieldLabels: Record<keyof ParsedOrder, string> = {
  customer: "Customer",
  origin: "Origin",
  destination: "Destination",
  puWindowStart: "Pickup Window Start",
  puWindowEnd: "Pickup Window End",
  delWindowStart: "Delivery Window Start",
  delWindowEnd: "Delivery Window End",
  requiredTruck: "Required Truck",
  notes: "Notes",
};

function toDateTimeInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toISOString().slice(0, 16);
}

export default function NewOrderForm({ createOrder }: NewOrderFormProps) {
  const [formValues, setFormValues] = useState<FormState>({
    customer: "",
    origin: "",
    destination: "",
    puWindowStart: "",
    puWindowEnd: "",
    delWindowStart: "",
    delWindowEnd: "",
    requiredTruck: "",
    notes: "",
  });
  const [parsed, setParsed] = useState<ParsedOrder | null>(null);
  const [selectedFields, setSelectedFields] = useState<CheckboxMap>({
    customer: true,
    origin: true,
    destination: true,
    puWindowStart: true,
    puWindowEnd: true,
    delWindowStart: true,
    delWindowEnd: true,
    requiredTruck: true,
    notes: true,
  });
  const [rawText, setRawText] = useState<string>("");
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const parsedEntries = useMemo(() => {
    if (!parsed) return [] as Array<[keyof ParsedOrder, string]>;
    return (Object.entries(parsed) as Array<[keyof ParsedOrder, string]>).filter(
      (entry): entry is [keyof ParsedOrder, string] => Boolean(entry[1])
    );
  }, [parsed]);

  const handleApplyFields = () => {
    if (!parsed) return;
    setFormValues((current) => {
      const next = { ...current };
      (Object.keys(parsed) as Array<keyof ParsedOrder>).forEach((key) => {
        if (!selectedFields[key]) return;
        const value = parsed[key];
        if (!value) return;
        const fieldKey = key as keyof FormState;
        if (
          key === "puWindowStart" ||
          key === "puWindowEnd" ||
          key === "delWindowStart" ||
          key === "delWindowEnd"
        ) {
          next[fieldKey] = toDateTimeInput(value);
        } else {
          next[fieldKey] = value;
        }
      });
      return next;
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      try {
        await createOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create order");
      }
    });
  };

  const onParsed = (payload: {
    ok?: boolean;
    ocrConfidence?: number;
    text?: string;
    parsed?: ParsedOrder;
    error?: string;
  }) => {
    if (payload.ok) {
      setRawText(payload.text ?? "");
      setParsed(payload.parsed ?? null);
      setOcrConfidence(payload.ocrConfidence);
    } else {
      setError(payload.error ?? "Unable to parse OCR text");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">New Order</h1>
        <p className="text-sm text-zinc-400">
          Paste a screenshot, select the fields you want to apply, then review the order form below.
        </p>
      </div>

      <OcrDropBox
        onParsed={onParsed}
        actions={
          <button
            type="button"
            onClick={() => {
              setParsed(null);
              setRawText("");
              setOcrConfidence(undefined);
            }}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
          >
            Clear OCR
          </button>
        }
      />

      {parsedEntries.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Parsed Fields</h2>
              {ocrConfidence !== undefined && (
                <p className="text-xs text-zinc-400">OCR confidence: {ocrConfidence.toFixed(1)}%</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleApplyFields}
              className="rounded-lg bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/30"
            >
              Apply selected fields
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {parsedEntries.map(([key, value]) => (
              <label key={key} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedFields[key]}
                  onChange={(event) =>
                    setSelectedFields((current) => ({ ...current, [key]: event.target.checked }))
                  }
                />
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-400">{fieldLabels[key]}</p>
                  <p className="text-sm text-zinc-100">{value}</p>
                </div>
              </label>
            ))}
          </div>
          {rawText && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Raw OCR Text</p>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-zinc-900/80 p-3 text-xs text-zinc-300">{rawText}</pre>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm">
        {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-rose-200">{error}</div>}
        <div className="grid gap-1">
          <label htmlFor="customer" className="text-xs uppercase tracking-wide text-zinc-400">
            Customer
          </label>
          <input
            id="customer"
            name="customer"
            required
            value={formValues.customer}
            onChange={(event) => setFormValues((prev) => ({ ...prev, customer: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="origin" className="text-xs uppercase tracking-wide text-zinc-400">
            Origin
          </label>
          <input
            id="origin"
            name="origin"
            required
            value={formValues.origin}
            onChange={(event) => setFormValues((prev) => ({ ...prev, origin: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="destination" className="text-xs uppercase tracking-wide text-zinc-400">
            Destination
          </label>
          <input
            id="destination"
            name="destination"
            required
            value={formValues.destination}
            onChange={(event) => setFormValues((prev) => ({ ...prev, destination: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1">
            <label htmlFor="puWindowStart" className="text-xs uppercase tracking-wide text-zinc-400">
              Pickup Window Start
            </label>
            <input
              id="puWindowStart"
              name="puWindowStart"
              type="datetime-local"
              value={formValues.puWindowStart}
              onChange={(event) => setFormValues((prev) => ({ ...prev, puWindowStart: event.target.value }))}
              className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
            />
          </div>
          <div className="grid gap-1">
            <label htmlFor="puWindowEnd" className="text-xs uppercase tracking-wide text-zinc-400">
              Pickup Window End
            </label>
            <input
              id="puWindowEnd"
              name="puWindowEnd"
              type="datetime-local"
              value={formValues.puWindowEnd}
              onChange={(event) => setFormValues((prev) => ({ ...prev, puWindowEnd: event.target.value }))}
              className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1">
            <label htmlFor="delWindowStart" className="text-xs uppercase tracking-wide text-zinc-400">
              Delivery Window Start
            </label>
            <input
              id="delWindowStart"
              name="delWindowStart"
              type="datetime-local"
              value={formValues.delWindowStart}
              onChange={(event) => setFormValues((prev) => ({ ...prev, delWindowStart: event.target.value }))}
              className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
            />
          </div>
          <div className="grid gap-1">
            <label htmlFor="delWindowEnd" className="text-xs uppercase tracking-wide text-zinc-400">
              Delivery Window End
            </label>
            <input
              id="delWindowEnd"
              name="delWindowEnd"
              type="datetime-local"
              value={formValues.delWindowEnd}
              onChange={(event) => setFormValues((prev) => ({ ...prev, delWindowEnd: event.target.value }))}
              className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
            />
          </div>
        </div>
        <div className="grid gap-1">
          <label htmlFor="requiredTruck" className="text-xs uppercase tracking-wide text-zinc-400">
            Required Truck
          </label>
          <input
            id="requiredTruck"
            name="requiredTruck"
            value={formValues.requiredTruck}
            onChange={(event) => setFormValues((prev) => ({ ...prev, requiredTruck: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="notes" className="text-xs uppercase tracking-wide text-zinc-400">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={formValues.notes}
            onChange={(event) => setFormValues((prev) => ({ ...prev, notes: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400 disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
