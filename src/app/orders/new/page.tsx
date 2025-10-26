"use client";

import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import OcrDropBox, { type OcrResult } from "@/components/ocr-dropbox";
import type { ParsedOrder } from "@/lib/ocr";

const FIELD_LABELS = {
  customer: "Customer",
  origin: "Origin",
  destination: "Destination",
  puWindowStart: "Pickup window start",
  puWindowEnd: "Pickup window end",
  delWindowStart: "Delivery window start",
  delWindowEnd: "Delivery window end",
  requiredTruck: "Required equipment",
  notes: "Notes",
} satisfies Record<keyof ParsedOrder, string>;

type OrderFormState = {
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

type FieldKey = keyof OrderFormState;

const EMPTY_FORM: OrderFormState = {
  customer: "",
  origin: "",
  destination: "",
  puWindowStart: "",
  puWindowEnd: "",
  delWindowStart: "",
  delWindowEnd: "",
  requiredTruck: "",
  notes: "",
};

export default function NewOrderPage() {
  const router = useRouter();
  const [form, setForm] = useState<OrderFormState>({ ...EMPTY_FORM });
  const [ocrText, setOcrText] = useState<string>("");
  const [parsedPreview, setParsedPreview] = useState<ParsedOrder | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<FieldKey>>(new Set<FieldKey>());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>(undefined);

  const previewEntries = useMemo(() => {
    if (!parsedPreview) return [] as Array<[FieldKey, string]>;
    return (Object.keys(FIELD_LABELS) as FieldKey[])
      .map((key) => [key, parsedPreview[key] ?? ""] as [FieldKey, string])
      .filter(([, value]) => value.trim().length > 0);
  }, [parsedPreview]);

  const changedSelections = useMemo(() => {
    return previewEntries.filter(([key, value]) => {
      if (!selectedFields.has(key)) return false;
      return (form[key] ?? "").trim() !== value.trim();
    });
  }, [form, previewEntries, selectedFields]);

  const applyEnabled = changedSelections.length > 0;

  const updateField = useCallback((key: FieldKey, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const handleOcrParsed = useCallback(
    (result: OcrResult) => {
      if (!result.ok) {
        setParsedPreview(null);
        setOcrText("");
        setOcrConfidence(undefined);
        setSelectedFields(new Set<FieldKey>());
        setError(result.error ?? "Unable to read image");
        return;
      }
      setError(null);
      setStatus(null);
      setOcrText(result.text ?? "");
      setParsedPreview(result.parsed ?? null);
      setOcrConfidence(result.ocrConfidence);
      setSelectedFields(new Set<FieldKey>());
    },
    [],
  );

  const toggleField = useCallback(
    (key: FieldKey) => {
      setSelectedFields((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [],
  );

  const applyFields = useCallback(() => {
    if (!parsedPreview) return;
    setForm((current) => {
      const next = { ...current };
      selectedFields.forEach((key) => {
        const value = (parsedPreview[key] ?? "").trim();
        if (value.length > 0 && value !== current[key]) {
          next[key] = value;
        }
      });
      return next;
    });
    setSelectedFields(new Set<FieldKey>());
  }, [parsedPreview, selectedFields]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (submitting) return;
      setSubmitting(true);
      setStatus(null);
      setError(null);
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Failed to save order");
        }
        setStatus("Order created successfully.");
        setForm({ ...EMPTY_FORM });
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Unable to save order");
      } finally {
        setSubmitting(false);
      }
    },
    [form, router, submitting],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New order</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Use the OCR dropbox to pull data from rate confirmations. Select the fields you want to apply
          and merge them directly into the form.
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <OcrDropBox
            onParsed={handleOcrParsed}
            actions={
              <button
                type="button"
                onClick={applyFields}
                disabled={!applyEnabled}
                className="rounded border border-blue-500 px-3 py-1 text-sm font-medium text-blue-600 transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
              >
                Apply fields
              </button>
            }
          />
          {ocrConfidence !== undefined && (
            <div className="text-xs text-slate-500">OCR confidence: {ocrConfidence.toFixed(0)}%</div>
          )}
          {previewEntries.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <div className="mb-3 text-sm font-semibold text-slate-800">Parsed fields</div>
              <ul className="space-y-2">
                {previewEntries.map(([key, value]) => {
                  const checked = selectedFields.has(key);
                  const changed = (form[key] ?? "").trim() !== value.trim();
                  return (
                    <li key={key} className="flex items-start gap-3">
                      <input
                        id={`field-${key}`}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleField(key)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={`field-${key}`} className="flex-1">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {FIELD_LABELS[key]}
                          {!changed && checked && (
                            <span className="ml-2 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-normal text-slate-500">
                              Unchanged
                            </span>
                          )}
                        </div>
                        <div className="mt-1 whitespace-pre-line break-words text-slate-800">{value}</div>
                        {!changed && !checked && (
                          <div className="mt-1 text-xs text-slate-400">Matches current value</div>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {ocrText && (
            <details className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">Raw OCR text</summary>
              <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-600">
                {ocrText}
              </pre>
            </details>
          )}
        </div>
        <div>
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Customer"
                name="customer"
                required
                value={form.customer}
                onChange={(value) => updateField("customer", value)}
              />
              <TextField
                label="Required equipment"
                name="requiredTruck"
                value={form.requiredTruck}
                onChange={(value) => updateField("requiredTruck", value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Origin"
                name="origin"
                required
                value={form.origin}
                onChange={(value) => updateField("origin", value)}
              />
              <TextField
                label="Destination"
                name="destination"
                required
                value={form.destination}
                onChange={(value) => updateField("destination", value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField
                label="Pickup window start"
                name="puWindowStart"
                value={form.puWindowStart}
                onChange={(value) => updateField("puWindowStart", value)}
              />
              <DateField
                label="Pickup window end"
                name="puWindowEnd"
                value={form.puWindowEnd}
                onChange={(value) => updateField("puWindowEnd", value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField
                label="Delivery window start"
                name="delWindowStart"
                value={form.delWindowStart}
                onChange={(value) => updateField("delWindowStart", value)}
              />
              <DateField
                label="Delivery window end"
                name="delWindowEnd"
                value={form.delWindowEnd}
                onChange={(value) => updateField("delWindowEnd", value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={4}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            {status && <div className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{status}</div>}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                Fields update automatically when applied. Required fields marked with *.
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {submitting ? "Saving…" : "Create order"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

type TextFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

function TextField({ label, name, value, onChange, required }: TextFieldProps) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700" htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

type DateFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
};

function DateField({ label, name, value, onChange }: DateFieldProps) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
