import Link from "next/link";
import { recalcTripTotals } from "@/server/trip-recalc";

const FIELD_ORDER = [
  "fixedCPM",
  "wageCPM",
  "addOnsCPM",
  "rollingCPM",
  "totalCPM",
  "totalCost",
  "profit",
  "marginPct",
] as const;

const LABELS: Record<(typeof FIELD_ORDER)[number], string> = {
  fixedCPM: "Fixed CPM",
  wageCPM: "Wage CPM",
  addOnsCPM: "Add-ons CPM",
  rollingCPM: "Rolling CPM",
  totalCPM: "Total CPM",
  totalCost: "Total Cost",
  profit: "Profit",
  marginPct: "Margin",
};

const CURRENCY_FIELDS = new Set<(typeof FIELD_ORDER)[number]>(["totalCost", "profit"]);
function formatValue(field: (typeof FIELD_ORDER)[number], value: number | null) {
  if (value === null || value === undefined) return "—";
  if (field === "marginPct") {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (CURRENCY_FIELDS.has(field)) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);
  }
  return value.toFixed(2);
}

function getDeltaInfo(field: (typeof FIELD_ORDER)[number], before: number | null, after: number | null) {
  if (before === null && after === null) {
    return { label: "—", tone: "neutral", arrow: "→" };
  }
  if (before === null || after === null) {
    return { label: "n/a", tone: "neutral", arrow: "→" };
  }
  const deltaRaw = after - before;
  const threshold = field === "marginPct" ? 0.0005 : 0.005;
  if (Math.abs(deltaRaw) < threshold) {
    return { label: "≈0", tone: "neutral", arrow: "→" };
  }

  const isBenefitField = field === "profit" || field === "marginPct";
  const improved = isBenefitField ? deltaRaw > 0 : deltaRaw < 0;
  const worse = isBenefitField ? deltaRaw < 0 : deltaRaw > 0;

  let arrow = "→";
  if (improved) {
    arrow = isBenefitField ? "↑" : "↓";
  } else if (worse) {
    arrow = isBenefitField ? "↓" : "↑";
  }

  const tone = improved ? "positive" : worse ? "negative" : "neutral";

  let label: string;
  if (field === "marginPct") {
    label = `${deltaRaw > 0 ? "+" : ""}${(deltaRaw * 100).toFixed(1)} pts`;
  } else if (CURRENCY_FIELDS.has(field)) {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
    label = `${deltaRaw > 0 ? "+" : ""}${formatter.format(deltaRaw)}`;
  } else {
    label = `${deltaRaw > 0 ? "+" : ""}${deltaRaw.toFixed(2)}`;
  }

  return { label, tone, arrow };
}

const toneClasses: Record<string, string> = {
  positive: "text-emerald-300",
  negative: "text-rose-400",
  neutral: "text-zinc-400",
};

export default async function TripRecalcPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { trip, before, after, rateApplied } = await recalcTripTotals(id);
  const hasChanges = FIELD_ORDER.some((field) => {
    const beforeValue = before[field] ?? null;
    const afterValue = after[field] ?? null;
    if (beforeValue === null && afterValue === null) return false;
    if (beforeValue === null || afterValue === null) return true;
    const threshold = field === "marginPct" ? 0.0005 : 0.005;
    return Math.abs(afterValue - beforeValue) > threshold;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Recalculated totals</h1>
          <p className="text-sm text-zinc-400">
            {trip.driver && `${trip.driver} • `}
            {trip.unit && `${trip.unit} • `}
            {trip.miles.toLocaleString()} miles
          </p>
        </div>
        <Link href={`/trips/${trip.id}/edit`} className="text-sm text-sky-300 hover:text-sky-200">
          ← Back to edit
        </Link>
      </div>

      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          rateApplied
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
            : hasChanges
            ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
            : "border-zinc-700 bg-zinc-900/70 text-zinc-300"
        }`}
      >
        {rateApplied
          ? "Applied default rate to fill missing CPM fields."
          : hasChanges
          ? "Trip totals refreshed with the latest CPM inputs."
          : "No changes were necessary; totals already matched current inputs."}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900/60 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Metric</th>
              <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">Before</th>
              <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">After</th>
              <th className="px-4 py-3 text-right font-medium uppercase tracking-wide">Δ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/60">
            {FIELD_ORDER.map((field) => {
              const delta = getDeltaInfo(field, before[field], after[field]);
              return (
                <tr key={field}>
                  <td className="px-4 py-3 text-zinc-300">{LABELS[field]}</td>
                  <td className="px-4 py-3 text-right text-zinc-200">{formatValue(field, before[field])}</td>
                  <td className="px-4 py-3 text-right text-zinc-200">{formatValue(field, after[field])}</td>
                  <td className={`px-4 py-3 text-right font-medium ${toneClasses[delta.tone]}`}>
                    <span className="inline-flex items-center justify-end gap-1">
                      <span>{delta.arrow}</span>
                      <span>{delta.label}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
