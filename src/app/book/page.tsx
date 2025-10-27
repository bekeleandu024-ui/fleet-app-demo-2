import BookingConsole, {
  BookingDriver,
  BookingOrder,
  BookingRate,
  BookingUnit,
} from "./BookingConsole";
import {
  fetchActiveDrivers,
  fetchAvailableUnits,
  fetchQualifiedOrders,
  fetchRateTemplates,
} from "@/src/server/queries";

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return value;
  }
  try {
    return Number(value);
  } catch {
    return null;
  }
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: { orderId?: string };
}) {
  const [orders, drivers, units, rates] = await Promise.all([
    fetchQualifiedOrders(),
    fetchActiveDrivers(),
    fetchAvailableUnits(),
    fetchRateTemplates(),
  ]);

  const safeOrders: BookingOrder[] = orders.map((order) => ({
    id: order.id,
    customer: order.customer,
    origin: order.origin,
    destination: order.destination,
    requiredTruck: order.requiredTruck,
    notes: order.notes,
    puWindowStart: toIsoString(order.puWindowStart),
    puWindowEnd: toIsoString(order.puWindowEnd),
    delWindowStart: toIsoString(order.delWindowStart),
    delWindowEnd: toIsoString(order.delWindowEnd),
    qualificationNotes: order.qualificationNotes,
  }));

  const safeDrivers: BookingDriver[] = drivers.map((driver) => ({
    id: driver.id,
    name: driver.name,
    homeBase: driver.homeBase,
    type: driver.type,
    hoursAvailableToday: driver.hoursAvailableToday ?? undefined,
    onTimeScore: driver.onTimeScore ?? undefined,
    preferredCustomers: driver.preferredCustomers ?? undefined,
    blockedCustomers: driver.blockedCustomers ?? undefined,
  }));

  const safeUnits: BookingUnit[] = units.map((unit) => ({
    id: unit.id,
    code: unit.code,
    type: unit.type,
    homeBase: unit.homeBase,
    restrictions: unit.restrictions ?? undefined,
  }));

  const safeRates: BookingRate[] = rates.map((rate) => ({
    id: rate.id,
    type: rate.type,
    zone: rate.zone,
    rpm: toNumber(rate.rpm) ?? undefined,
    fuelSurcharge: toNumber(rate.fuelSurcharge) ?? undefined,
    fixedCPM: toNumber(rate.fixedCPM) ?? undefined,
    wageCPM: toNumber(rate.wageCPM) ?? undefined,
    addOnsCPM: toNumber(rate.addOnsCPM) ?? undefined,
    rollingCPM: toNumber(rate.rollingCPM) ?? undefined,
  }));

  return (
    <main className="min-h-screen bg-[#0a0f1c] text-neutral-100 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Book Trips</h1>
          <p className="text-sm text-neutral-400">
            AI-assisted dispatch &amp; pricing console.
          </p>
        </header>

        <BookingConsole
          initialOrderId={searchParams?.orderId ?? null}
          orders={safeOrders}
          drivers={safeDrivers}
          units={safeUnits}
          rates={safeRates}
        />
      </div>
    </main>
  );
}
