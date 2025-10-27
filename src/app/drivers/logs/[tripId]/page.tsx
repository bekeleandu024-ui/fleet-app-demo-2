import LogButtons from "./LogButtons";
import prisma from "@/lib/prisma";

export default async function DriverLogPage({
  params,
}: {
  params: { tripId: string };
}) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.tripId },
    include: {
      order: true,
      events: {
        orderBy: { at: "desc" },
      },
    },
  });

  if (!trip) {
    return (
      <main className="min-h-screen bg-[#0a0f1c] text-neutral-200 flex items-center justify-center">
        <div className="text-center text-sm text-neutral-400">Trip not found.</div>
      </main>
    );
  }

  const miles = Number(trip.miles ?? 0);
  const revenue = Number(trip.revenue ?? 0);
  const wageCPM = Number(trip.wageCPM ?? 0);
  const fixedCPM = Number(trip.fixedCPM ?? 0);
  const rollingCPM = Number(trip.rollingCPM ?? 0);
  const addOnsCPM = Number(trip.addOnsCPM ?? 0);
  const totalCPM = Number(trip.totalCPM ?? 0);
  const totalCost = Number(trip.totalCost ?? 0);
  const profit = Number(trip.profit ?? 0);
  const marginPct = Number(trip.marginPct ?? 0);

  return (
    <main className="min-h-screen bg-[#0a0f1c] text-neutral-100 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Driver Log / Trip Clock</h1>
          <p className="text-sm text-neutral-400">
            One-tap milestones. Every press is timestamped, cost is updated.
          </p>
        </header>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40 grid gap-4 md:grid-cols-2 text-[13px] leading-relaxed">
          <div>
            <div className="text-[11px] text-neutral-400 uppercase">Trip / Lane</div>
            <div className="text-neutral-100 font-semibold text-sm">
              {trip.order?.origin || "—"} → {trip.order?.destination || "—"}
            </div>
            <div className="text-neutral-400 text-[11px]">
              Trip #{trip.id.slice(0, 8).toUpperCase()}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-400 uppercase">Driver / Unit</div>
            <div className="text-neutral-100 font-medium text-sm">
              {trip.driver || "—"} &nbsp; / &nbsp; {trip.unit || "—"}
            </div>
            <div className="text-neutral-400 text-[11px]">Status: {trip.status || "Created"}</div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-400 uppercase">Miles / Revenue</div>
            <div className="text-neutral-100 font-medium text-sm">{miles} mi</div>
            <div className="text-neutral-400 text-[11px]">${revenue.toFixed(2)} total</div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-400 uppercase">Cost / Margin</div>
            <div className="text-neutral-100 font-medium text-sm">
              Total CPM {totalCPM.toFixed(2)}
            </div>
            <div
              className={`text-[11px] ${
                marginPct >= 0.12
                  ? "text-emerald-400"
                  : marginPct >= 0.08
                  ? "text-yellow-300"
                  : "text-red-400"
              }`}
            >
              Margin {(marginPct * 100).toFixed(1)}%
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-3 text-[11px] text-neutral-300">
            <Metric label="Fixed CPM" value={fixedCPM.toFixed(2)} prefix="$" />
            <Metric label="Wage CPM" value={wageCPM.toFixed(2)} prefix="$" />
            <Metric label="Rolling CPM" value={rollingCPM.toFixed(2)} prefix="$" />
            <Metric label="Add-ons CPM" value={addOnsCPM.toFixed(2)} prefix="$" />
            <Metric label="Total Cost" value={totalCost.toFixed(2)} prefix="$" />
            <Metric label="Profit" value={profit.toFixed(2)} prefix="$" />
          </div>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40 space-y-4">
          <div className="text-sm font-semibold text-neutral-200">Log an Event</div>
          <div className="text-[12px] text-neutral-400">
            Tap a button when it happens. We'll timestamp it, update cost, and factor
            detention / accessorials automatically.
          </div>
          <LogButtons tripId={trip.id} />
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/40">
          <div className="text-sm font-semibold text-neutral-200 mb-3">Recent Activity</div>
          <ul className="space-y-3 text-[12px] text-neutral-200">
            {trip.events.length === 0 && (
              <li className="text-neutral-500 text-[11px]">No events logged yet.</li>
            )}

            {trip.events.map((ev) => (
              <li
                key={ev.id}
                className="flex flex-col rounded-lg border border-neutral-800 bg-neutral-800/30 p-3"
              >
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-neutral-100">{prettyEventType(ev.type)}</span>
                  <span className="text-neutral-400 text-[11px] font-mono">
                    {formatTimestamp(ev.at)}
                  </span>
                </div>
                {(ev.location || ev.notes) && (
                  <div className="text-neutral-400 text-[11px] mt-1 space-y-1">
                    {ev.location ? <div>Loc: {ev.location}</div> : null}
                    {ev.notes ? <div>Note: {ev.notes}</div> : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function formatTimestamp(date: Date) {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function prettyEventType(type: string) {
  switch (type) {
    case "TRIP_START":
      return "Trip started";
    case "TRIP_END":
      return "Trip finished";
    case "PICKUP_ARRIVE":
      return "Arrived pickup";
    case "PICKUP_DEPART":
      return "Left pickup";
    case "DELIVERY_ARRIVE":
      return "Arrived delivery";
    case "DELIVERY_DEPART":
      return "Left delivery";
    case "BORDER_CROSS":
      return "Crossed border";
    case "DROP_HOOK":
      return "Drop & hook";
    default:
      return type;
  }
}

function Metric({
  label,
  value,
  prefix,
  suffix,
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800/80 bg-neutral-900/70 px-3 py-2 shadow-inner shadow-black/40">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-[12px] font-semibold text-neutral-100">
        {prefix ? `${prefix}` : ""}
        {value}
        {suffix ? `${suffix}` : ""}
      </div>
    </div>
  );
}
