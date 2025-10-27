"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import OcrDropBox from "@/components/ocr-dropbox";
import type { ParsedOrderDraft, ParsedOrderField } from "@/lib/ocr";
import type {
  AnalysisResult,
  DraftInfoEmailResult,
  DraftOrderInput,
} from "@/server/analyze-order";

type Props = {
  analyzeAction: (input: DraftOrderInput) => Promise<AnalysisResult>;
  draftEmailAction: (input: DraftOrderInput) => Promise<DraftInfoEmailResult>;
};

type IntakeParsedOrder = {
  customer: string;
  origin: string;
  destination: string;
  pickupWindowStart?: string;
  pickupWindowEnd?: string;
  deliveryWindowStart?: string;
  deliveryWindowEnd?: string;
  requiredTruck?: string;
  notes?: string;
  confidence: number;
  warnings: string[];
};

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
  source: string;
};

type CheckboxMap = Record<keyof ParsedOrderDraft, boolean>;

const ORDER_FIELDS: Array<keyof ParsedOrderDraft> = [
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

const fieldLabels: Record<keyof ParsedOrderDraft, string> = {
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

export function OrderIntakeWorkspace({ analyzeAction, draftEmailAction }: Props) {
  const router = useRouter();
  const intakeFileInputRef = useRef<HTMLInputElement | null>(null);
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
    source: "OCR",
  });
  const [parsed, setParsed] = useState<ParsedOrderDraft | null>(null);
  const [parsedFields, setParsedFields] = useState<ParsedOrderField[]>([]);
  const [selectedFields, setSelectedFields] = useState<CheckboxMap>(() => emptyCheckboxMap());
  const [rawText, setRawText] = useState<string>("");
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [emailDraft, setEmailDraft] = useState<DraftInfoEmailResult | null>(null);
  const [analysisPending, startAnalysis] = useTransition();
  const [emailPending, startEmailDraft] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [intakePending, setIntakePending] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [intakeConfidence, setIntakeConfidence] = useState<number | null>(null);
  const [intakeWarnings, setIntakeWarnings] = useState<string[]>([]);

  const parsedEntries = useMemo(() => {
    if (!parsed) return [] as Array<[keyof ParsedOrderDraft, string]>;
    return ORDER_FIELDS.reduce<Array<[keyof ParsedOrderDraft, string]>>((acc, key) => {
      const value = parsed[key];
      if (value) {
        acc.push([key, value]);
      }
      return acc;
    }, []);
  }, [parsed]);

  const applyParsedOrderToForm = useCallback((parsedOrder: ParsedOrderDraft) => {
    setParsed(parsedOrder);
    setParsedFields([]);
    setSelectedFields(() => {
      const next = emptyCheckboxMap();
      ORDER_FIELDS.forEach((key) => {
        if (parsedOrder[key]) {
          next[key] = true;
        }
      });
      return next;
    });
    setRawText("");
    setAnalysis(null);
    setEmailDraft(null);
  }, []);

  const handleIntakeUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIntakeError(null);
      setIntakeWarnings([]);
      setIntakeConfidence(null);
      setIntakePending(true);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/intake/ocr", {
          method: "POST",
          body: formData,
        });

        const json = await response.json();

        if (!response.ok || !json?.ok) {
          const message = typeof json?.error === "string" ? json.error : "Unable to read document";
          throw new Error(message);
        }

        const parsed: IntakeParsedOrder | undefined = json.parsed;
        if (!parsed) {
          throw new Error("OCR service returned no data");
        }

        setFormValues((current) => {
          const next = { ...current };
          if (parsed.customer) next.customer = parsed.customer;
          if (parsed.origin) next.origin = parsed.origin;
          if (parsed.destination) next.destination = parsed.destination;
          if (parsed.requiredTruck) next.requiredTruck = parsed.requiredTruck;
          if (parsed.pickupWindowStart)
            next.puWindowStart = toDateTimeInput(parsed.pickupWindowStart);
          if (parsed.pickupWindowEnd)
            next.puWindowEnd = toDateTimeInput(parsed.pickupWindowEnd);
          if (parsed.deliveryWindowStart)
            next.delWindowStart = toDateTimeInput(parsed.deliveryWindowStart);
          if (parsed.deliveryWindowEnd)
            next.delWindowEnd = toDateTimeInput(parsed.deliveryWindowEnd);
          if (parsed.notes) next.notes = parsed.notes;
          return next;
        });

        const parsedDraft: ParsedOrderDraft = {
          customer: parsed.customer || undefined,
          origin: parsed.origin || undefined,
          destination: parsed.destination || undefined,
          requiredTruck: parsed.requiredTruck || undefined,
          puWindowStart: parsed.pickupWindowStart,
          puWindowEnd: parsed.pickupWindowEnd,
          delWindowStart: parsed.deliveryWindowStart,
          delWindowEnd: parsed.deliveryWindowEnd,
          notes: parsed.notes || undefined,
        };

        applyParsedOrderToForm(parsedDraft);

        setIntakeWarnings(parsed.warnings ?? []);
        setIntakeConfidence(typeof parsed.confidence === "number" ? parsed.confidence : null);
        setOcrConfidence(typeof parsed.confidence === "number" ? parsed.confidence * 100 : undefined);
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : "Unable to read document";
        setIntakeError(message);
        setIntakeConfidence(null);
      } finally {
        setIntakePending(false);
        if (intakeFileInputRef.current) {
          intakeFileInputRef.current.value = "";
        }
      }
    },
    [applyParsedOrderToForm]
  );

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

  const handleAnalyze = useCallback(() => {
    setError(null);
    startAnalysis(async () => {
      try {
        const payload: DraftOrderInput = {
          customer: formValues.customer,
          origin: formValues.origin,
          destination: formValues.destination,
          requiredTruck: formValues.requiredTruck,
          puWindowStart: formValues.puWindowStart,
          puWindowEnd: formValues.puWindowEnd,
          delWindowStart: formValues.delWindowStart,
          delWindowEnd: formValues.delWindowEnd,
          notes: formValues.notes,
        };
        const result = await analyzeAction(payload);
        setAnalysis(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to analyze order");
      }
    });
  }, [analyzeAction, formValues]);

  const handleDraftEmail = useCallback(() => {
    setError(null);
    startEmailDraft(async () => {
      try {
        const payload: DraftOrderInput = {
          customer: formValues.customer,
          origin: formValues.origin,
          destination: formValues.destination,
          requiredTruck: formValues.requiredTruck,
          puWindowStart: formValues.puWindowStart,
          puWindowEnd: formValues.puWindowEnd,
          delWindowStart: formValues.delWindowStart,
          delWindowEnd: formValues.delWindowEnd,
          notes: formValues.notes,
        };
        const draft = await draftEmailAction(payload);
        setEmailDraft(draft);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to draft email");
      }
    });
  }, [draftEmailAction, formValues]);

  const onParsed = useCallback(
    (payload: {
      ok?: boolean;
      ocrConfidence?: number;
      text?: string;
      parsed?: ParsedOrderDraft;
      warnings?: string[];
      fields?: ParsedOrderField[];
      error?: string;
    }) => {
      if (payload.ok) {
        setParsed(payload.parsed ?? null);
        setParsedFields(payload.fields ?? []);
        setSelectedFields(() => {
          const next = emptyCheckboxMap();
          ORDER_FIELDS.forEach((key) => {
            if (payload.parsed?.[key]) {
              next[key] = true;
            }
          });
          return next;
        });
        setRawText(payload.text ?? "");
        setOcrConfidence(payload.ocrConfidence);
        setAnalysis(null);
        setEmailDraft(null);
      } else {
        setError(payload.error ?? "Unable to parse OCR text");
      }
    },
    []
  );

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
      source: formValues.source.trim() || "OCR",
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

      const { orderId } = await response.json();
      router.push(`/orders/${orderId}/plan`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Order intake workspace</h1>
        <p className="text-sm text-zinc-400">
          Paste a screenshot, review parsed fields, run rule checks, then submit once qualified.
        </p>
      </div>

      <section className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-6 text-sm text-slate-100 shadow-[0_20px_45px_-20px_rgba(15,23,42,0.65)]">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-white">AI-assisted intake</h2>
          <p className="text-xs text-slate-300">
            Drop a rate sheet or load table and we&apos;ll pre-fill the order details for review.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label
            className={`inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-2 text-sm font-semibold transition hover:border-slate-500 ${
              intakePending ? "pointer-events-none opacity-70" : ""
            }`}
          >
            <input
              ref={intakeFileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleIntakeUpload}
            />
            {intakePending ? "Reading…" : "Upload rate sheet"}
          </label>
          {intakeConfidence !== null && (
            <span className="text-xs uppercase tracking-wide text-slate-300">
              Confidence: {(intakeConfidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
        {intakeWarnings.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-amber-300">
            {intakeWarnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2">
                <span aria-hidden>⚠</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        )}
        {intakeError && (
          <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {intakeError}
          </p>
        )}
      </section>

      <OcrDropBox
        onParsed={onParsed}
        actions={
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
          >
            {copied ? "Copied" : "Copy raw text"}
          </button>
        }
      />

      {parsedEntries.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Parsed fields</h2>
              {ocrConfidence !== undefined && (
                <p className="text-xs text-zinc-400">OCR confidence: {ocrConfidence.toFixed(1)}%</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
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
              <label key={key} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
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
                  {parsedFields
                    .filter((field) => field.field === key)
                    .map((field) => (
                      <p key={field.sourceText} className="text-xs text-zinc-500">
                        {field.sourceText}
                      </p>
                    ))}
                </div>
              </label>
            ))}
          </div>
          {rawText && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Raw OCR text</p>
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
              Pickup window start
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
              Pickup window end
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
              Delivery window start
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
              Delivery window end
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
            Required equipment
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
            Notes / instructions
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formValues.notes}
            onChange={(event) => setFormValues((prev) => ({ ...prev, notes: event.target.value }))}
            className="min-h-[100px] rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor="source" className="text-xs uppercase tracking-wide text-zinc-400">
            Source
          </label>
          <select
            id="source"
            name="source"
            value={formValues.source}
            onChange={(event) => setFormValues((prev) => ({ ...prev, source: event.target.value }))}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
          >
            <option value="OCR">OCR</option>
            <option value="EMAIL">Email</option>
            <option value="CSV">CSV</option>
            <option value="MANUAL">Manual</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAnalyze}
            className="rounded-lg border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/20"
            disabled={analysisPending}
          >
            {analysisPending ? "Checking rules…" : "Run rule check"}
          </button>
          <button
            type="button"
            onClick={handleDraftEmail}
            disabled={emailPending}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500 disabled:opacity-60"
          >
            {emailPending ? "Drafting…" : "Draft follow-up email"}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="ml-auto rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit order"}
          </button>
        </div>
      </form>

      {analysis && (
        <div className="grid gap-4 rounded-xl border border-sky-500/40 bg-sky-500/5 p-6 text-sm text-sky-100">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Rule check results</h3>
            <span className="text-xs uppercase tracking-wide text-sky-200">{analysis.nextStep}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-sky-200">Missing fields</p>
              <ul className="mt-1 list-disc pl-5">
                {analysis.missingFields.length ? (
                  analysis.missingFields.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>None</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-sky-200">SLA warnings</p>
              <ul className="mt-1 list-disc pl-5">
                {analysis.slaWarnings.length ? (
                  analysis.slaWarnings.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>None</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-sky-200">Blacklist hits</p>
              <ul className="mt-1 list-disc pl-5">
                {analysis.blacklistHits.length ? (
                  analysis.blacklistHits.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>None</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-sky-200">Border warnings</p>
              <ul className="mt-1 list-disc pl-5">
                {analysis.borderWarnings.length ? (
                  analysis.borderWarnings.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>None</li>
                )}
              </ul>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-sky-200">AI summary</p>
            <p className="mt-1 text-sm text-sky-100">{analysis.summary.textSummary}</p>
            <ul className="mt-2 list-disc pl-5 text-sky-200">
              {analysis.summary.why.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.summary.actions.map((action) => (
                <span
                  key={action.label}
                  className="rounded-full border border-sky-400/50 px-3 py-1 text-xs uppercase tracking-wide"
                >
                  {action.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {emailDraft && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6 text-sm text-emerald-100">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Suggested follow-up email</h3>
            <span className="text-xs uppercase tracking-wide text-emerald-200">{emailDraft.summary.textSummary}</span>
          </div>
          <p className="mt-3 text-xs uppercase tracking-wide text-emerald-200">Subject</p>
          <p className="text-sm text-emerald-100">{emailDraft.subject}</p>
          <p className="mt-3 text-xs uppercase tracking-wide text-emerald-200">Body</p>
          <pre className="mt-1 whitespace-pre-wrap text-sm text-emerald-100">{emailDraft.body}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            {emailDraft.summary.actions.map((action) => (
              <span
                key={action.label}
                className="rounded-full border border-emerald-400/40 px-3 py-1 text-xs uppercase tracking-wide"
              >
                {action.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
