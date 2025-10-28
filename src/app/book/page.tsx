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
  searchParams?: SearchParams;
}) {
  const { safeOrders, safeDrivers, safeUnits, safeRates } = await loadBookingData();

  const selectedOrderId = getSelectedOrderId(safeOrders, searchParams);
  const selectedOrder = safeOrders.find((order) => order.id === selectedOrderId) ?? null;

  const suggestion = selectedOrder
    ? await generateBookingSuggestion(selectedOrder, safeDrivers, safeUnits, safeRates)
    : null;

  const selectedRateForBooking = suggestion
    ? safeRates.find((rate) => rate.id === suggestion.selectedRateId) ?? safeRates[0] ?? null
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Booking Console</h1>
        <p className="text-sm text-neutral-400">
          Choose a qualified order and apply the AI recommendation before dispatching.
        </p>
      </div>

      <div className="md:grid md:grid-cols-[1fr_2fr] md:items-start md:gap-6 space-y-6 md:space-y-0">
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
                        Qualified
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

        <div className="space-y-4">
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
              suggestion ? (
                <div className="mt-4 space-y-5">
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
                  <BookTripButton
                    orderId={selectedOrder.id}
                    driverId={suggestion.suggestedDriver.id}
                    unitId={suggestion.suggestedUnit.id}
                    rateId={suggestion.selectedRateId}
                    driverName={suggestion.suggestedDriver.name}
                    unitCode={suggestion.suggestedUnit.code}
                    tripType={selectedRateForBooking?.type ?? null}
                    tripZone={selectedRateForBooking?.zone ?? null}
                    miles={suggestion.etaEstimate.miles}
                    rpmQuoted={suggestion.suggestedRate.rpmQuoted}
                    totalCpm={suggestion.suggestedRate.totalCPM}
                    notes={suggestion.notesForDispatcher}
                    highlights={[
                      suggestion.suggestedDriver.reason,
                      suggestion.suggestedUnit.reason,
                      `Market ${suggestion.suggestedRate.rpmMarket.toFixed(2)} vs Quote ${suggestion.suggestedRate.rpmQuoted.toFixed(2)}`,
                    ]}
                    orderOrigin={selectedOrder.origin}
                    orderDestination={selectedOrder.destination}
                    customerName={selectedOrder.customer}
                  />
                </div>
              ) : (
                <div className="mt-6 rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-5 text-sm text-neutral-400">
                  Generating recommendation from live feeds…
                </div>
              )
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
