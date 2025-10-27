"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ParsedOrder } from "@/lib/ocr";
import OcrDropBox from "@/components/ocr-dropbox";

const ORDER_FIELDS: Array<keyof ParsedOrder> = [
  "customer",
  "origin",
  "destination",
  "requiredTruck",
  "puWindowStart",
  "puWindowEnd",
  "delWindowStart",
  "delWindowEnd",
  "notes",
];

type FormState = {
  customer: string;
  origin: string;
  destination: string;
  requiredTruck: string;
  puWindowStart: string;
  puWindowEnd: string;
  delWindowStart: string;
  delWindowEnd: string;
  notes: string;
};

type CheckboxMap = Record<keyof ParsedOrder, boolean>;

const fieldLabels: Record<keyof ParsedOrder, string> = {
  customer: "Customer",
  origin: "Origin",
  destination: "Destination",
  requiredTruck: "Required Truck",
  puWindowStart: "Pickup Window Start",
  puWindowEnd: "Pickup Window End",
  delWindowStart: "Delivery Window Start",
  delWindowEnd: "Delivery Window End",
  notes: "Notes",
};

function toDateTimeInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const pad = (input: number) => input.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function emptyCheckboxMap(): CheckboxMap {
  return {
    customer: false,
    origin: false,
    destination: false,
    requiredTruck: false,
    puWindowStart: false,
    puWindowEnd: false,
    delWindowStart: false,
    delWindowEnd: false,
    notes: false,
  };
}

export default function NewOrderForm() {
  const router = useRouter();
  const [formValues, setFormValues] = useState<FormState>({
    customer: "",
    origin: "",
    destination: "",
    requiredTruck: "",
    puWindowStart: "",
    puWindowEnd: "",
    delWindowStart: "",
    delWindowEnd: "",
    notes: "",
  });
  const [parsed, setParsed] = useState<ParsedOrder | null>(null);
  const [selectedFields, setSelectedFields] = useState<CheckboxMap>(() => emptyCheckboxMap());
  const [rawText, setRawText] = useState<string>("");
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const parsedEntries = useMemo(() => {
    if (!parsed) return [] as Array<[keyof ParsedOrder, string]>;
    return ORDER_FIELDS.reduce<Array<[keyof ParsedOrder, string]>>((acc, key) => {
      const value = parsed[key];
      if (value) {
        acc.push([key, value]);
      }
      return acc;
    }, []);
  }, [parsed]);

  const applyDisabled = useMemo(() => {
    if (!parsedEntries.length) return true;
    const checked = parsedEntries.filter(([key]) => selectedFields[key]);
    if (!checked.length) return true;
    return !checked.some(([key, value]) => {
      const targetKey = key as keyof FormState;
      const parsedValue =
        key === "puWindowStart" ||
        key === "puWindowEnd" ||
        key === "delWindowStart" ||
        key === "delWindowEnd"
          ? toDateTimeInput(value)
          : value;
      return parsedValue !== (formValues[targetKey] ?? "");
    });
  }, [formValues, parsedEntries, selectedFields]);

  const resetOcr = useCallback(() => {
    setParsed(null);
    setSelectedFields(emptyCheckboxMap());
    setRawText("");
    setOcrConfidence(undefined);
  }, []);

  const handleApplyFields = useCallback(() => {
    if (!parsed) return;
    setFormValues((current) => {
      const next = { ...current };
      ORDER_FIELDS.forEach((key) => {
        if (!selectedFields[key]) return;
        const value = parsed[key];
        if (!value) return;
        const targetKey = key as keyof FormState;
        if (
          key === "puWindowStart" ||
          key === "puWindowEnd" ||
          key === "delWindowStart" ||
          key === "delWindowEnd"
        ) {
          next[targetKey] = toDateTimeInput(value);
        } else {
          next[targetKey] = value;
        }
      });
      return next;
    });
  }, [parsed, selectedFields]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      customer: formValues.customer.trim(),
      origin: formValues.origin.trim(),
      destination: formValues.destination.trim(),
      requiredTruck: formValues.requiredTruck.trim() || null,
      puWindowStart: formValues.puWindowStart || null,
      puWindowEnd: formValues.puWindowEnd || null,
      delWindowStart: formValues.delWindowStart || null,
      delWindowEnd: formValues.delWindowEnd || null,
      notes: formValues.notes.trim() || null,
    };

    if (!payload.customer || !payload.origin || !payload.destination) {
      setError("Customer, origin, and destination are required.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        const message =
          typeof json?.error === "string"
            ? json.error
            : Array.isArray(json?.error)
            ? json.error.join(", ")
            : "Failed to create order";
        throw new Error(message);
      }

      router.push("/orders");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = useCallback(() => {
    if (!rawText) return;
    void navigator.clipboard
      .writeText(rawText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        setError("Unable to copy text to clipboard");
      });
  }, [rawText]);

  const onParsed = useCallback(
    (payload: { ok?: boolean; ocrConfidence?: number; text?: string; parsed?: ParsedOrder; error?: string }) => {
      if (payload.ok) {
        setParsed(payload.parsed ?? null);
        setSelectedFields(() => {
          const next = emptyCheckboxMap();
          ORDER_FIELDS.forEach((key) => {
            if (payload.parsed?.[key]) {
              next[key] = false;
            }
          });
          return next;
        });
        setRawText(payload.text ?? "");
        setOcrConfidence(payload.ocrConfidence);
      } else {
        setError(payload.error ?? "Unable to parse OCR text");
      }
    },
    []
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">New Order</h1>
        <p className="text-sm text-zinc-400">
          Paste a screenshot, review the extracted details, then apply the fields you want to keep.
        </p>
      </div>

      <OcrDropBox
        onParsed={onParsed}
        actions={
          <button
            type="button"
            onClick={resetOcr}
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-500"
              >
                {copied ? "Copied!" : "Copy text"}
              </button>
              <button
                type="button"
                onClick={handleApplyFields}
                disabled={applyDisabled}
                className="rounded-lg bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Apply selected fields
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {parsedEntries.map(([key, value]) => (
              <label
                key={key}
                className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border border-zinc-600 bg-black"
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
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-zinc-900/80 p-3 text-xs text-zinc-300 whitespace-pre-wrap">
                {rawText}
              </pre>
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
            disabled={submitting}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
