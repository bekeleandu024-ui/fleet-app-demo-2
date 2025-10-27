import Link from "next/link";
import { recalcTripTotals } from "@/server/trip-recalc";

const metricConfig = [
  { key: "fixedCPM", label: "Fixed CPM", format: "perMile" },
  { key: "wageCPM", label: "Wage CPM", format: "perMile" },
  { key: "addOnsCPM", label: "Add-ons CPM", format: "perMile" },
  { key: "rollingCPM", label: "Rolling CPM", format: "perMile" },
  { key: "totalCPM", label: "Total CPM", format: "perMile", direction: "lower" as const },
  { key: "totalCost", label: "Total Cost", format: "currency", direction: "lower" as const },
  { key: "revenue", label: "Revenue", format: "currency", direction: "higher" as const },
  { key: "profit", label: "Profit", format: "currency", direction: "higher" as const },
  { key: "marginPct", label: "Margin %", format: "percent", direction: "higher" as const },
] as const;

function formatValue(value: number | null | undefined, type: "perMile" | "currency" | "percent") {
  if (value === null || value === undefined) return "—";
  switch (type) {
    case "currency":
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
    case "percent":
      return `${value.toFixed(2)}%`;
    case "perMile":
    default:
      return `$${value.toFixed(2)}/mi`;
  }
}

function classifyChange(direction: "higher" | "lower" | undefined, before: number | null | undefined, after: number | null | undefined) {
  if (before === null && after === null) return "neutral";
  if (before === null || after === null) return "changed";
  const diff = after - before;
  if (Math.abs(diff) < 0.0005) return "neutral";
  if (!direction) {
    return "changed";
  }
  if (direction === "higher") {
    return diff > 0 ? "positive" : "negative";
  }
  return diff < 0 ? "positive" : "negative";
}

export default async function TripRecalcPage({ params }: { params: { id: string } }) {
  const { trip, before, after, rateApplied } = await recalcTripTotals(params.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={trip.orderId ? `/orders/${trip.orderId}` : "/orders"} className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Back to order
        </Link>
        <h1 className="text-2xl font-semibold text-white">Trip Cost Recalculation</h1>
        {trip.order && (
          <p className="text-sm text-zinc-400">
            {trip.order.customer}: {trip.order.origin} → {trip.order.destination}
          </p>
        )}
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          Miles: {trip.miles.toLocaleString()} • Revenue: {trip.revenue !== null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(trip.revenue) : "—"}
        </p>
        {rateApplied ? (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            Rate template applied: {rateApplied.label}
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-300">
            No rate template linked. Existing CPM values were reused.
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900/60 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Metric</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Before</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">After</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/60">
            {metricConfig.map((metric) => {
              const change = classifyChange(metric.direction, before[metric.key], after[metric.key]);
              const toneClass =
                change === "positive"
                  ? "text-emerald-400"
                  : change === "negative"
                  ? "text-rose-400"
                  : change === "changed"
                  ? "text-sky-400"
                  : "text-zinc-300";
              return (
                <tr key={metric.key} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-white">{metric.label}</td>
                  <td className="px-4 py-3 text-zinc-300">{formatValue(before[metric.key], metric.format)}</td>
                  <td className={`px-4 py-3 font-semibold ${toneClass}`}>
                    {formatValue(after[metric.key], metric.format)}
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
