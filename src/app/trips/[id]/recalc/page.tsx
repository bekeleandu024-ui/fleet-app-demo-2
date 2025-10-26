import Link from "next/link";
import { notFound } from "next/navigation";
import { recalcTripTotals, type TripRecalcResult } from "@/server/trip-recalc";

const ROWS: Array<{ key: keyof TripRecalcResult["before"]; label: string; format: (value: number | null) => string }> = [
  { key: "fixedCPM", label: "Fixed CPM", format: (value) => formatCurrency(value, true) },
  { key: "wageCPM", label: "Wage CPM", format: (value) => formatCurrency(value, true) },
  { key: "addOnsCPM", label: "Add-ons CPM", format: (value) => formatCurrency(value, true) },
  { key: "rollingCPM", label: "Rolling CPM", format: (value) => formatCurrency(value, true) },
  { key: "totalCPM", label: "Total CPM", format: (value) => formatCurrency(value, true) },
  { key: "totalCost", label: "Total cost", format: (value) => formatCurrency(value, false) },
  { key: "revenue", label: "Revenue", format: (value) => formatCurrency(value, false) },
  { key: "profit", label: "Profit", format: (value) => formatCurrency(value, false) },
  { key: "marginPct", label: "Margin %", format: formatPercent },
];

const DIFF_THRESHOLD = 0.005;

export default async function TripRecalcPage({ params }: { params: { id: string } }) {
  let result: TripRecalcResult | null = null;
  try {
    result = await recalcTripTotals(params.id);
  } catch (error) {
    notFound();
  }

  if (!result) {
    notFound();
  }

  const { trip, before, after, rateApplied } = result;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Trip recalculation</h1>
          <p className="mt-1 text-sm text-slate-600">
            Updated cents-per-mile totals have been written back to the trip. Review the before/after
            comparison below to understand the change.
          </p>
          <div className="mt-3 rounded border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
            <div className="font-medium text-slate-800">{trip.driver}</div>
            <div className="text-xs text-slate-500">Unit {trip.unit} • {trip.miles.toLocaleString()} miles • {trip.status}</div>
            {rateApplied ? (
              <div className="mt-2 text-xs text-green-700">
                Applied rate {rateApplied.label} to fill missing CPM components.
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-500">
                Existing CPM values were used because all cost components were already populated.
              </div>
            )}
          </div>
        </div>
        <Link
          href={`/trips/${trip.id}/edit`}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Back to edit
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Metric</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Before</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">After</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Δ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ROWS.map((row) => {
              const beforeValue = before[row.key];
              const afterValue = after[row.key];
              const diffValue =
                beforeValue === null || afterValue === null ? null : afterValue - beforeValue;
              const tone = diffValue === null || Math.abs(diffValue) < DIFF_THRESHOLD
                ? "text-slate-500"
                : diffValue > 0
                ? "text-green-600"
                : "text-red-600";
              return (
                <tr key={row.key} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-800">{row.label}</td>
                  <td className="px-4 py-2 text-slate-700">{row.format(beforeValue)}</td>
                  <td className="px-4 py-2 text-slate-700">{row.format(afterValue)}</td>
                  <td className={`px-4 py-2 font-semibold ${tone}`}>
                    {diffValue === null ? "—" : formatDiff(diffValue, row.key === "marginPct")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-sm">
        Differences under {DIFF_THRESHOLD.toFixed(3)} are shown in gray to account for floating-point rounding.
      </div>
    </div>
  );
}

function formatCurrency(value: number | null, isCentsPerMile: boolean) {
  if (value === null) return "—";
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isCentsPerMile ? `$${formatted}/mi` : `$${formatted}`;
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${value.toFixed(2)}%`;
}

function formatDiff(value: number, isPercent: boolean) {
  if (Math.abs(value) < DIFF_THRESHOLD) {
    return isPercent ? "0.00%" : "$0.00";
  }
  const sign = value > 0 ? "+" : "−";
  if (isPercent) {
    return `${sign}${Math.abs(value).toFixed(2)}%`;
  }
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}
