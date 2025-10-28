import Link from "next/link";

import { generateBookingSuggestion } from "@/lib/aiBooking";
import prisma from "@/lib/prisma";

import BookTripButton from "./BookTripButton";

type SearchParams = Record<string, string | string[] | undefined>;

type SafeOrder = {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  requiredTruck: string | null;
  puWindowStart: Date | null;
  puWindowEnd: Date | null;
  delWindowStart: Date | null;
  delWindowEnd: Date | null;
  notes: string | null;
};

type SafeDriver = {
  id: string;
  name: string;
  homeBase: string | null;
  hoursAvailableToday: number | null;
  onTimeScore: number | null;
  type: string | null;
  preferredCustomers: string | null;
  blockedCustomers: string | null;
};

type SafeUnit = {
  id: string;
  code: string;
  type: string | null;
  homeBase: string | null;
  status: string | null;
  isOnHold: boolean;
  active: boolean;
  lastKnownLat: number | null;
  lastKnownLon: number | null;
};

type SafeRate = {
  id: string;
  type: string | null;
  zone: string | null;
  rpm: number | null;
  fixedCPM: number;
  wageCPM: number;
  addOnsCPM: number;
  rollingCPM: number;
};

const formatWindow = (start: Date | null, end: Date | null): string => {
  if (!start && !end) {
    return "Flexible";
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (start && end) {
    return `${formatter.format(start)} → ${formatter.format(end)}`;
  }

  if (start) {
    return `From ${formatter.format(start)}`;
  }

  if (end) {
    return `By ${formatter.format(end)}`;
  }

  return "Flexible";
};

const marginClass = (value: number): string => {
  if (value >= 0.15) {
    return "text-emerald-400";
  }

  if (value >= 0.08) {
    return "text-amber-400";
  }

  return "text-rose-400";
};

const toSafeOrders = (
  orders: Awaited<ReturnType<typeof prisma.order.findMany>>,
): SafeOrder[] =>
  orders.map((order) => ({
    id: order.id,
    customer: order.customer,
    origin: order.origin,
    destination: order.destination,
    requiredTruck: order.requiredTruck,
    puWindowStart: order.puWindowStart ?? null,
    puWindowEnd: order.puWindowEnd ?? null,
    delWindowStart: order.delWindowStart ?? null,
    delWindowEnd: order.delWindowEnd ?? null,
    notes: order.notes,
  }));

const toSafeDrivers = (
  drivers: Awaited<ReturnType<typeof prisma.driver.findMany>>,
): SafeDriver[] =>
  drivers.map((driver) => ({
    id: driver.id,
    name: driver.name,
    homeBase: driver.homeBase,
    hoursAvailableToday: driver.hoursAvailableToday ?? null,
    onTimeScore: driver.onTimeScore ?? null,
    type: driver.type ?? null,
    preferredCustomers: driver.preferredCustomers ?? null,
    blockedCustomers: driver.blockedCustomers ?? null,
  }));

const toSafeUnits = (
  units: Awaited<ReturnType<typeof prisma.unit.findMany>>,
): SafeUnit[] =>
  units.map((unit) => ({
    id: unit.id,
    code: unit.code,
    type: unit.type ?? null,
    homeBase: unit.homeBase,
    status: unit.status ?? null,
    isOnHold: unit.isOnHold,
    active: unit.active,
    lastKnownLat: unit.lastKnownLat ?? null,
    lastKnownLon: unit.lastKnownLon ?? null,
  }));

const toSafeRates = (
  rates: Awaited<ReturnType<typeof prisma.rate.findMany>>,
): SafeRate[] =>
  rates.map((rate) => ({
    id: rate.id,
    type: rate.type ?? null,
    zone: rate.zone ?? null,
    rpm: rate.rpm ? Number(rate.rpm) : null,
    fixedCPM: Number(rate.fixedCPM),
    wageCPM: Number(rate.wageCPM),
    addOnsCPM: Number(rate.addOnsCPM),
    rollingCPM: Number(rate.rollingCPM),
  }));

const getSelectedOrderId = (
  orders: SafeOrder[],
  searchParams?: SearchParams,
): string | null => {
  if (!searchParams) {
    return orders[0]?.id ?? null;
  }

  const selectedOrderIdParam = searchParams.orderId;

  if (Array.isArray(selectedOrderIdParam)) {
    return selectedOrderIdParam[0] ?? orders[0]?.id ?? null;
  }

  return selectedOrderIdParam ?? orders[0]?.id ?? null;
};

const loadBookingData = async () => {
  const [orders, drivers, units, rates] = await Promise.all([
    prisma.order.findMany({
      where: { status: "Qualified" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.driver.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.unit.findMany({
      where: { active: true, isOnHold: false },
      orderBy: { code: "asc" },
    }),
    prisma.rate.findMany({
      orderBy: [{ type: "asc" }, { zone: "asc" }],
    }),
  ]);

  return {
    safeOrders: toSafeOrders(orders),
    safeDrivers: toSafeDrivers(drivers),
    safeUnits: toSafeUnits(units),
    safeRates: toSafeRates(rates),
  };
};

export default async function BookPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { safeOrders, safeDrivers, safeUnits, safeRates } = await loadBookingData();

  const selectedOrderId = getSelectedOrderId(safeOrders, resolvedSearchParams);
  const selectedOrder = safeOrders.find((order) => order.id === selectedOrderId) ?? null;

  const suggestion = selectedOrder
    ? await generateBookingSuggestion(selectedOrder, safeDrivers, safeUnits, safeRates)
    : null;

  const selectedRateForBooking = suggestion
    ? safeRates.find((rate) => rate.id === suggestion.selectedRateId) ?? safeRates[0] ?? null
    : null;

  const ordersReadyCount = safeOrders.length;
  const driversWithHoursCount = safeDrivers.filter(
    (driver) => (driver.hoursAvailableToday ?? 0) >= 6,
  ).length;
  const stagedUnitsCount = safeUnits.filter((unit) => {
    if (!unit.status) {
      return true;
    }

    const status = unit.status.toLowerCase();

    return ["available", "idle", "ready", "staged"].some((keyword) =>
      status.includes(keyword),
    );
  }).length;

  const driverShortlist = suggestion
    ? [
        {
          id: suggestion.suggestedDriver.id,
          name: suggestion.suggestedDriver.name,
          meta: suggestion.suggestedDriver.reason,
          highlight: true,
        },
        ...safeDrivers
          .filter((driver) => driver.id !== suggestion.suggestedDriver.id)
          .slice(0, 2)
          .map((driver) => ({
            id: driver.id,
            name: driver.name,
            meta: driver.homeBase ? `Home ${driver.homeBase}` : "Standby",
            highlight: false,
          })),
      ]
    : safeDrivers.slice(0, 3).map((driver, index) => ({
        id: driver.id,
        name: driver.name,
        meta: driver.homeBase ? `Home ${driver.homeBase}` : "Standby",
        highlight: index === 0,
      }));

  const unitShortlist = suggestion
    ? [
        {
          id: suggestion.suggestedUnit.id,
          code: suggestion.suggestedUnit.code,
          meta: suggestion.suggestedUnit.reason,
          highlight: true,
        },
        ...safeUnits
          .filter((unit) => unit.id !== suggestion.suggestedUnit.id)
          .slice(0, 2)
          .map((unit) => ({
            id: unit.id,
            code: unit.code,
            meta: unit.homeBase ? `Home ${unit.homeBase}` : unit.status ?? "Available",
            highlight: false,
          })),
      ]
    : safeUnits.slice(0, 3).map((unit, index) => ({
        id: unit.id,
        code: unit.code,
        meta: unit.homeBase ? `Home ${unit.homeBase}` : unit.status ?? "Available",
        highlight: index === 0,
      }));

  const defaultDriverRecord = suggestion
    ? safeDrivers.find((driver) => driver.id === suggestion.suggestedDriver.id) ?? null
    : safeDrivers[0] ?? null;
  const defaultUnitRecord = suggestion
    ? safeUnits.find((unit) => unit.id === suggestion.suggestedUnit.id) ?? null
    : safeUnits[0] ?? null;
  const defaultRateRecord = suggestion
    ? safeRates.find((rate) => rate.id === suggestion.selectedRateId) ?? null
    : safeRates[0] ?? null;

  const defaultDriverId = defaultDriverRecord?.id ?? (suggestion ? suggestion.suggestedDriver.id : null);
  const defaultUnitId = defaultUnitRecord?.id ?? (suggestion ? suggestion.suggestedUnit.id : null);
  const defaultRateId = defaultRateRecord?.id ?? (suggestion ? suggestion.selectedRateId : null);

  const defaultDriverName = suggestion
    ? suggestion.suggestedDriver.name
    : defaultDriverRecord?.name ?? "";
  const defaultUnitCode = suggestion
    ? suggestion.suggestedUnit.code
    : defaultUnitRecord?.code ?? "";

  const defaultTripType = suggestion
    ? selectedRateForBooking?.type ?? null
    : defaultRateRecord?.type ?? null;
  const defaultTripZone = suggestion
    ? selectedRateForBooking?.zone ?? null
    : defaultRateRecord?.zone ?? null;

  const defaultMiles = suggestion?.etaEstimate.miles ?? 0;
  const defaultRpmQuoted = suggestion?.suggestedRate.rpmQuoted ?? defaultRateRecord?.rpm ?? 0;
  const defaultTotalCpm = suggestion?.suggestedRate.totalCPM
    ?? (defaultRateRecord
      ? defaultRateRecord.fixedCPM + defaultRateRecord.wageCPM + defaultRateRecord.addOnsCPM + defaultRateRecord.rollingCPM
      : 0);

  const bookingNotes = suggestion?.notesForDispatcher ?? "Manual booking created from Trip Booking Control Center.";
  const bookingHighlights = suggestion
    ? [
        suggestion.suggestedDriver.reason,
        suggestion.suggestedUnit.reason,
        `Market ${suggestion.suggestedRate.rpmMarket.toFixed(2)} vs Quote ${suggestion.suggestedRate.rpmQuoted.toFixed(2)}`,
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Trip Booking Control Center</h1>
        <p className="text-sm text-neutral-400">
          Prioritize qualified freight, confirm resources, and launch the trip without leaving the console.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg shadow-black/40">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Qualified Orders Ready</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-400">{ordersReadyCount}</div>
          <p className="mt-1 text-xs text-neutral-400">Loads cleared for booking and waiting for assignment.</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg shadow-black/40">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Drivers With 6+ Hours</div>
          <div className="mt-2 text-2xl font-semibold text-sky-400">{driversWithHoursCount}</div>
          <p className="mt-1 text-xs text-neutral-400">Hours-of-service verified and ready to roll.</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg shadow-black/40">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Units Staged</div>
          <div className="mt-2 text-2xl font-semibold text-amber-400">{stagedUnitsCount}</div>
          <p className="mt-1 text-xs text-neutral-400">Tractors and trailers cleared for dispatch today.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg shadow-black/40">
            <div className="text-sm font-semibold text-neutral-200">Qualified Orders</div>
            <ul className="mt-4 space-y-3">
              {safeOrders.map((order) => {
                const href = `/book?orderId=${order.id}`;
                const isActive = order.id === selectedOrderId;

                return (
                  <li key={order.id}>
                    <Link
                      href={href}
                      className={`block rounded-lg border px-3 py-3 transition ${
                        isActive
                          ? "border-emerald-500/60 bg-emerald-500/10"
                          : "border-neutral-800 bg-neutral-950/40 hover:border-neutral-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-neutral-100">{order.customer}</div>
                          <div className="text-xs text-neutral-400">
                            {order.origin} → {order.destination}
                          </div>
                          <div className="mt-1 text-[11px] text-neutral-500">
                            {order.requiredTruck ? `${order.requiredTruck} · ` : ""}
                            PU {formatWindow(order.puWindowStart, order.puWindowEnd)}
                          </div>
                        </div>
                        <span className="rounded-full bg-neutral-800 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                          {isActive ? "In Focus" : "Qualified"}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
              {safeOrders.length === 0 && (
                <li className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 px-3 py-6 text-center text-xs text-neutral-500">
                  No qualified orders waiting.
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-neutral-200">Crew Lineup</div>
              <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Live availability</span>
            </div>
            <div className="mt-4 grid gap-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Drivers</h3>
                <ul className="mt-2 space-y-2">
                  {driverShortlist.length > 0 ? (
                    driverShortlist.map((driver) => (
                      <li
                        key={driver.id}
                        className={`rounded-lg border px-3 py-2 text-sm transition ${
                          driver.highlight
                            ? "border-emerald-500/60 bg-emerald-500/10 text-neutral-50"
                            : "border-neutral-800 bg-neutral-950/40 text-neutral-200"
                        }`}
                      >
                        <div className="font-medium">{driver.name}</div>
                        <div className="text-[11px] text-neutral-400">{driver.meta}</div>
                      </li>
                    ))
                  ) : (
                    <li className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 px-3 py-4 text-center text-xs text-neutral-500">
                      All drivers currently dispatched.
                    </li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Units</h3>
                <ul className="mt-2 space-y-2">
                  {unitShortlist.length > 0 ? (
                    unitShortlist.map((unit) => (
                      <li
                        key={unit.id}
                        className={`rounded-lg border px-3 py-2 text-sm transition ${
                          unit.highlight
                            ? "border-amber-500/60 bg-amber-500/10 text-neutral-50"
                            : "border-neutral-800 bg-neutral-950/40 text-neutral-200"
                        }`}
                      >
                        <div className="font-medium">{unit.code}</div>
                        <div className="text-[11px] text-neutral-400">{unit.meta}</div>
                      </li>
                    ))
                  ) : (
                    <li className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 px-3 py-4 text-center text-xs text-neutral-500">
                      No idle equipment — check dwell in Fleet.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-200">Order Snapshot</div>
                <p className="text-xs text-neutral-400">Key load requirements before assigning resources.</p>
              </div>
              {selectedOrder && (
                <span className="rounded-full border border-neutral-700 bg-neutral-800/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-300">
                  {selectedOrder.requiredTruck ?? "Standard"}
                </span>
              )}
            </div>

            {selectedOrder ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Customer</h3>
                    <p className="mt-1 text-sm font-medium text-neutral-100">{selectedOrder.customer}</p>
                    <p className="text-xs text-neutral-400">
                      {selectedOrder.origin} → {selectedOrder.destination}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Pickup Window</h3>
                    <p className="mt-1 text-sm text-neutral-200">
                      {formatWindow(selectedOrder.puWindowStart, selectedOrder.puWindowEnd)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Delivery Window</h3>
                    <p className="mt-1 text-sm text-neutral-200">
                      {formatWindow(selectedOrder.delWindowStart, selectedOrder.delWindowEnd)}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Dispatcher Notes</h3>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                      {selectedOrder.notes ?? "No special handling requirements recorded."}
                    </p>
                  </div>
                  <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Trip Context</div>
                    <p className="mt-2 text-xs text-neutral-300">
                      Validate guardrails before booking. AI recommendations factor live rates, driver scorecards, and dwell risk.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-5 text-sm text-neutral-400">
                Select an order from the left to review critical load information.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-200">Booking Recommendation</div>
                <p className="text-xs text-neutral-400">Synthesized from telematics, routing, and live market data.</p>
              </div>
              {suggestion && suggestion.suggestedRate.estMarginPct < 0.1 && (
                <span className="rounded-full border border-rose-500/50 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-300">
                  Guardrail Breach
                </span>
              )}
            </div>

            {selectedOrder ? (
              <div className="mt-4 space-y-5">
                {suggestion ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Recommended Driver</h3>
                        <p className="mt-1 text-sm text-neutral-200">{suggestion.suggestedDriver.name}</p>
                        <p className="text-xs text-neutral-400">{suggestion.suggestedDriver.reason}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Recommended Unit</h3>
                        <p className="mt-1 text-sm text-neutral-200">{suggestion.suggestedUnit.code}</p>
                        <p className="text-xs text-neutral-400">{suggestion.suggestedUnit.reason}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Quoted Rate vs Market</div>
                        <div className="mt-2 text-xl font-semibold text-neutral-100">
                          ${suggestion.suggestedRate.rpmQuoted.toFixed(2)}/mi
                        </div>
                        <p className="text-xs text-neutral-400">
                          Market index {suggestion.suggestedRate.rpmMarket.toFixed(2)} RPM.
                        </p>
                      </div>
                      <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">ETA &amp; Miles</div>
                        <div className="mt-2 text-xl font-semibold text-neutral-100">
                          {suggestion.etaEstimate.miles.toFixed(0)} mi · {(suggestion.etaEstimate.etaMinutes / 60).toFixed(1)} hr
                        </div>
                        <p className="text-xs text-neutral-400">{suggestion.etaEstimate.trafficNote}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Projected Margin</div>
                      <div className={`mt-2 text-xl font-semibold tracking-tight ${marginClass(suggestion.suggestedRate.estMarginPct)}`}>
                        {(suggestion.suggestedRate.estMarginPct * 100).toFixed(1)}%
                      </div>
                      <p className="text-xs text-neutral-400">
                        Total CPM {suggestion.suggestedRate.totalCPM.toFixed(2)}. Internal cost engine (fixed+wage+rolling+add-ons).
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Why this assignment?</h3>
                      <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-neutral-400">
                        {suggestion.notesForDispatcher}
                      </p>
                    </div>
                    <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Opportunity Summary</div>
                      <ul className="mt-2 space-y-1 text-xs text-neutral-300">
                        <li>
                          Margin guardrail {suggestion.suggestedRate.estMarginPct >= 0.15 ? "healthy" : "under review"} at
                          {(suggestion.suggestedRate.estMarginPct * 100).toFixed(1)}%.
                        </li>
                        <li>
                          Quote is ${suggestion.suggestedRate.rpmQuoted.toFixed(2)} vs market {suggestion.suggestedRate.rpmMarket.toFixed(2)} RPM.
                        </li>
                        <li>
                          Driver has {(suggestion.etaEstimate.etaMinutes / 60).toFixed(1)} hours projected drive time with
                          buffer for dwell.
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-5 text-sm text-neutral-400">
                    AI dispatch hasn't returned a recommendation yet. Book manually below.
                  </div>
                )}
                <BookTripButton
                  orderId={selectedOrder.id}
                  driverId={defaultDriverId}
                  unitId={defaultUnitId}
                  rateId={defaultRateId}
                  drivers={safeDrivers}
                  units={safeUnits}
                  rates={safeRates}
                  driverName={defaultDriverName}
                  unitCode={defaultUnitCode}
                  tripType={defaultTripType ?? null}
                  tripZone={defaultTripZone ?? null}
                  miles={defaultMiles}
                  rpmQuoted={defaultRpmQuoted}
                  totalCpm={defaultTotalCpm}
                  notes={bookingNotes}
                  highlights={bookingHighlights}
                  orderOrigin={selectedOrder.origin}
                  orderDestination={selectedOrder.destination}
                  customerName={selectedOrder.customer}
                />
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-5 text-sm text-neutral-400">
                Select an order to see suggested driver, unit, and rate.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
