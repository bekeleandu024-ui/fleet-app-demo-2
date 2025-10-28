import {
  buildWhyThisAssignment,
  computeMargin,
  getDriverStatus,
  getMarketRate,
  getRoutingEstimate,
  getTripForOrder,
  getUnitStatus,
} from "@/lib/ops-intel";
import prisma from "@/lib/prisma";

function formatNumber(value: number | null | undefined, options?: { digits?: number; prefix?: string; suffix?: string }) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  const digits = options?.digits ?? 2;
  const formatted = value.toFixed(digits);
  return `${options?.prefix ?? ""}${formatted}${options?.suffix ?? ""}`;
}

function formatLocation(location?: { city?: string; state?: string }) {
  if (!location?.city && !location?.state) {
    return "n/a";
  }
  if (location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }
  return location.city ?? location.state ?? "n/a";
}

type BookingRecommendationProps = {
  orderId: string;
};

export default async function BookingRecommendation({ orderId }: BookingRecommendationProps) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customer: true,
      origin: true,
      destination: true,
      requiredTruck: true,
      notes: true,
    },
  });

  if (!order) {
    return (
      <div className="space-y-4 rounded-xl border border-neutral-800 bg-[#0f1013] p-4 text-neutral-200">
        <header className="space-y-1">
          <div className="text-sm font-semibold text-neutral-100">Booking Recommendation</div>
          <p className="text-xs text-neutral-400">Synthesized from telematics, routing, and live market data.</p>
        </header>
        <p className="text-sm text-neutral-400">Order not found.</p>
      </div>
    );
  }

  const trip = await getTripForOrder(order.id);

  if (!trip) {
    return (
      <div className="space-y-4 rounded-xl border border-neutral-800 bg-[#0f1013] p-4 text-neutral-200">
        <header className="space-y-1">
          <div className="text-sm font-semibold text-neutral-100">Booking Recommendation</div>
          <p className="text-xs text-neutral-400">Synthesized from telematics, routing, and live market data.</p>
        </header>
        <div className="rounded-lg border border-neutral-800 bg-[#1a1c21] p-4 text-sm text-neutral-400">
          No trip created for this order yet.
        </div>
      </div>
    );
  }

  const [driverStatus, unitStatus, routing, market] = await Promise.all([
    getDriverStatus(trip.driver),
    getUnitStatus(trip.unit),
    getRoutingEstimate(order.origin, order.destination, trip.miles),
    getMarketRate(order.origin, order.destination, trip),
  ]);

  const margin = computeMargin(trip);
  const whyLines = buildWhyThisAssignment(driverStatus, unitStatus, routing, market);

  return (
    <div className="space-y-5 rounded-xl border border-neutral-800 bg-[#0f1013] p-4 text-neutral-200">
      <header className="space-y-1">
        <div className="text-sm font-semibold text-neutral-100">Booking Recommendation</div>
        <p className="text-xs text-neutral-400">Synthesized from telematics, routing, and live market data.</p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1 rounded-lg border border-neutral-700 bg-[#1a1c21] p-4">
          <div className="text-[0.7rem] uppercase tracking-wide text-neutral-400">Recommended Driver</div>
          <div className="mt-2 text-lg font-semibold text-neutral-100">{driverStatus.name}</div>
          <div className="mt-1 text-[0.8rem] text-neutral-400">
            Home base {driverStatus.homeBase}
          </div>
          <div className="text-[0.8rem] text-neutral-400">
            Last known {formatLocation(driverStatus.lastKnownLocation)}
          </div>
        </div>
        <div className="flex-1 rounded-lg border border-neutral-700 bg-[#1a1c21] p-4">
          <div className="text-[0.7rem] uppercase tracking-wide text-neutral-400">Recommended Unit</div>
          <div className="mt-2 text-lg font-semibold text-neutral-100">{unitStatus.unitId}</div>
          <div className="mt-1 text-[0.8rem] text-neutral-400">
            {unitStatus.unitId}: {unitStatus.classSpec}
          </div>
          <div className="text-[0.8rem] text-neutral-400">
            Last known {formatLocation(unitStatus.lastKnownLocation)}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1 rounded-lg border border-neutral-700 bg-[#1a1c21] p-4">
          <div className="text-[0.7rem] uppercase tracking-wide text-neutral-400">Quoted Rate vs Market</div>
          <div className="mt-2 text-xl font-semibold text-neutral-100">
            {formatNumber(market.quotedRPM, { prefix: "$", suffix: "/mi" })}
          </div>
          <p className="text-[0.8rem] text-neutral-400">
            {market.marketRPM !== null && market.source
              ? `Market index ${market.marketRPM.toFixed(2)} RPM. Source ${market.source}.`
              : "No market index available for this lane."}
          </p>
        </div>
        <div className="flex-1 rounded-lg border border-neutral-700 bg-[#1a1c21] p-4">
          <div className="text-[0.7rem] uppercase tracking-wide text-neutral-400">ETA &amp; Miles</div>
          <div className="mt-2 text-xl font-semibold text-neutral-100">
            {routing.miles !== null ? `${Math.round(routing.miles)} mi` : "— mi"} • {routing.etaHours !== null
              ? `${routing.etaHours.toFixed(1)} hr`
              : "— hr"}
          </div>
          <p className="text-[0.8rem] text-neutral-400">
            {routing.trafficDelayMin !== null
              ? `Routing adds ${routing.trafficDelayMin.toFixed(0)} min vs a 55 mph baseline.`
              : "Traffic delta unavailable."}
            {routing.crossesBorder ? " Route crosses an international border." : ""}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-700 bg-[#1a1c21] p-4">
        <div className="text-[0.7rem] uppercase tracking-wide text-neutral-400">Projected Margin</div>
        <div className="mt-2 text-xl font-semibold text-neutral-100">
          {margin.projectedMarginPct !== null ? `${margin.projectedMarginPct.toFixed(1)}%` : "—"}
        </div>
        <p className="text-[0.8rem] text-neutral-400">
          Total CPM {margin.totalCPM.toFixed(2)}. Internal cost engine (fixed+wage+rolling+add-ons).
        </p>
      </div>

      <section className="space-y-3">
        <div>
          <div className="text-[0.7rem] uppercase tracking-wide text-neutral-400">Why this assignment?</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.8rem] text-neutral-300">
            {whyLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-3 text-[0.8rem] text-neutral-500">
            Data sources: telematics for positioning, routing API for ETA, market index for RPM.
          </p>
          <p className="text-[0.8rem] text-neutral-500">This is advisory. Dispatcher approval required.</p>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-700 bg-[#1a1c21] p-4">
        <div className="text-[0.7rem] uppercase tracking-wide text-neutral-400">Opportunity Summary</div>
        <div className="mt-2 space-y-1 text-[0.8rem] text-neutral-300">
          <p>
            Margin guardrail under review at {margin.projectedMarginPct !== null ? `${margin.projectedMarginPct.toFixed(1)}%` : "—"}.
          </p>
          <p>
            Quote is {formatNumber(market.quotedRPM, { prefix: "$", suffix: "/mi" })}
            {market.marketRPM !== null
              ? ` vs market ${market.marketRPM.toFixed(2)} RPM.`
              : " with no current market index."}
          </p>
          <p>
            Driver has {formatNumber(driverStatus.availableHours, { digits: 1 })} hours projected drive time with buffer for dwell.
          </p>
        </div>
      </section>
    </div>
  );
}
