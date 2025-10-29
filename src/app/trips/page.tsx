import prisma from "@/lib/prisma";
import { differenceInMinutes } from "@/lib/date-utils";
import { listKnownMarkets, normalizeMarketCode } from "@/lib/marketRateModel";

import DashboardCard from "@/src/components/DashboardCard";

const pillBaseClass = "inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-medium text-white";

type Coordinates = { lat: number; lon: number };

type TripStopData = {
  stopType: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lon: number | null;
  scheduledAt: Date | null;
  seq: number;
};

type DelayComputation = {
  delayRiskPct: number | null;
  eta: Date | null;
  slackMinutes: number | null;
};

const MARKET_LOOKUP = new Map(listKnownMarkets().map((market) => [market.code, market]));
const AVERAGE_SPEED_MPH = 50;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMiles(origin: Coordinates, destination: Coordinates) {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLon = toRadians(destination.lon - origin.lon);
  const originLat = toRadians(origin.lat);
  const destLat = toRadians(destination.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(originLat) * Math.cos(destLat);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

function resolveMarketCoordinates(location: string | null | undefined): Coordinates | null {
  if (!location) return null;
  const code = normalizeMarketCode(location);
  if (!code) return null;
  const market = MARKET_LOOKUP.get(code);
  if (!market) return null;
  return { lat: market.lat, lon: market.lon };
}

function stopCoordinates(stop: TripStopData | null | undefined): Coordinates | null {
  if (!stop) return null;
  if (stop.lat != null && stop.lon != null) {
    return { lat: stop.lat, lon: stop.lon };
  }
  const city = stop.city?.trim();
  if (!city) return null;
  const combined = stop.state ? `${city}, ${stop.state}` : city;
  return resolveMarketCoordinates(combined);
}

function findDestinationStop(stops: TripStopData[]): TripStopData | null {
  if (!stops.length) return null;
  const deliveryStops = [...stops].reverse().filter((stop) => stop.stopType?.toUpperCase() === "DELIVERY");
  if (deliveryStops.length) {
    return deliveryStops[0];
  }
  return stops[stops.length - 1] ?? null;
}

function computeDelayMetrics({
  unitHomeBase,
  destination,
  destinationFallback,
  deliveryWindowStart,
  deliveryWindowEnd,
}: {
  unitHomeBase: string | null | undefined;
  destination: TripStopData | null;
  destinationFallback: string | null | undefined;
  deliveryWindowStart: Date | null | undefined;
  deliveryWindowEnd: Date | null | undefined;
}): DelayComputation {
  const originCoords = resolveMarketCoordinates(unitHomeBase);
  const destinationCoords = destination
    ? stopCoordinates(destination)
    : resolveMarketCoordinates(destinationFallback);
  if (!originCoords || !destinationCoords) {
    return { delayRiskPct: null, eta: null, slackMinutes: null };
  }

  const distance = haversineMiles(originCoords, destinationCoords);
  const travelMinutes = Math.round(((distance || 0) / AVERAGE_SPEED_MPH) * 60);
  const now = new Date();
  const eta = new Date(now.getTime() + travelMinutes * 60 * 1000);

  if (!deliveryWindowEnd) {
    return { delayRiskPct: null, eta, slackMinutes: null };
  }

  const timeUntilWindowEnd = differenceInMinutes(deliveryWindowEnd, now);
  const slackMinutes = differenceInMinutes(deliveryWindowEnd, eta);

  if (timeUntilWindowEnd <= 0) {
    return { delayRiskPct: 1, eta, slackMinutes };
  }

  const rawWindowMinutes =
    deliveryWindowStart && deliveryWindowEnd
      ? Math.max(30, differenceInMinutes(deliveryWindowEnd, deliveryWindowStart))
      : Math.max(120, Math.round(travelMinutes * 0.5 + 120));

  if (slackMinutes <= 0) {
    return { delayRiskPct: 1, eta, slackMinutes };
  }

  const normalizedSlack = Math.min(slackMinutes, rawWindowMinutes);
  const delayRiskPct = clamp01(1 - normalizedSlack / rawWindowMinutes);

  return { delayRiskPct, eta, slackMinutes };
}

function formatEtaDetail(eta: Date | null, slackMinutes: number | null): string {
  if (!eta) return "ETA pending";
  const timeText = eta.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (slackMinutes == null) {
    return `ETA ${timeText}`;
  }

  if (slackMinutes < 0) {
    return `ETA ${timeText} (late by ${Math.abs(slackMinutes)} min)`;
  }

  if (slackMinutes < 60) {
    return `ETA ${timeText} (${slackMinutes} min buffer)`;
  }

  const hoursBuffer = (slackMinutes / 60).toFixed(1);
  return `ETA ${timeText} (${hoursBuffer} h buffer)`;
}

function pctColor(pctNum: number | null | undefined) {
  if (pctNum == null || isNaN(pctNum)) return "text-white/60";
  if (pctNum >= 0.12) return "text-emerald-300";
  if (pctNum >= 0.08) return "text-yellow-200";
  return "text-rose-300";
}

function riskColor(riskNum: number | null | undefined) {
  if (riskNum == null || isNaN(riskNum)) return "text-white/60";
  if (riskNum >= 0.3) return "text-rose-300";
  if (riskNum >= 0.15) return "text-yellow-200";
  return "text-emerald-300";
}

type VerdictTone = "ok" | "caution" | "danger";

// Classify AI verdict for the trip
function classifyVerdict(
  marginPct: number | null,
  delayRiskPct: number | null,
  status: string | null | undefined,
) {
  const noStatus = !status || status.trim() === "";
  if (noStatus) {
    return {
      label: "Needs Intervention",
      tone: "danger" as VerdictTone,
    } as const;
  }

  const marginKnown = marginPct != null && !Number.isNaN(marginPct);
  const delayKnown = delayRiskPct != null && !Number.isNaN(delayRiskPct);

  if (!marginKnown || !delayKnown) {
    return {
      label: "Caution",
      tone: "caution" as VerdictTone,
    } as const;
  }

  const lowMarginHard = marginPct < 0.05; // <5%
  const highDelayHard = delayRiskPct >= 0.3; // 30%+

  if (lowMarginHard || highDelayHard) {
    return {
      label: "Needs Intervention",
      tone: "danger" as VerdictTone,
    } as const;
  }

  const lowMarginSoft = marginPct < 0.08; // <8%
  const highDelaySoft = delayRiskPct >= 0.15; // 15%+

  if (lowMarginSoft || highDelaySoft) {
    return {
      label: "Caution",
      tone: "caution" as VerdictTone,
    } as const;
  }

  return {
    label: "OK",
    tone: "ok" as VerdictTone,
  } as const;
}

// Build quick bullet reasons for dispatcher
function buildReasons({
  marginPct,
  delayRiskPct,
  status,
  driver,
  nextCommitmentAt,
  eta,
  slackMinutes,
}: {
  marginPct: number | null;
  delayRiskPct: number | null;
  status: string | null | undefined;
  driver: string | null | undefined;
  nextCommitmentAt: Date | null | undefined;
  eta: Date | null;
  slackMinutes: number | null;
}) {
  const reasons: string[] = [];

  if (!status || status.trim() === "") {
    reasons.push("Missing status / not fully dispatched");
  }

  if (marginPct == null || Number.isNaN(marginPct)) {
    reasons.push("Margin data unavailable");
  } else if (marginPct < 0.05) {
    reasons.push(`Low gross margin: ${(marginPct * 100).toFixed(1)}% (<5%)`);
  } else if (marginPct < 0.08) {
    reasons.push(`Thin margin: ${(marginPct * 100).toFixed(1)}% (<8%)`);
  } else {
    reasons.push(`Margin healthy: ${(marginPct * 100).toFixed(1)}%`);
  }

  if (delayRiskPct == null || Number.isNaN(delayRiskPct)) {
    reasons.push("Delay risk pending scheduling data");
  } else if (delayRiskPct >= 0.3) {
    reasons.push(`High delay risk: ${(delayRiskPct * 100).toFixed(1)}% (late ETA likely)`);
  } else if (delayRiskPct >= 0.15) {
    reasons.push(`Watch ETA: ${(delayRiskPct * 100).toFixed(1)}% delay risk`);
  } else {
    reasons.push(`On-time projection looks fine (${(delayRiskPct * 100).toFixed(1)}% risk)`);
  }

  if (eta) {
    reasons.push(formatEtaDetail(eta, slackMinutes));
  }

  if (driver) {
    reasons.push(`Driver: ${driver}`);
  }

  if (nextCommitmentAt) {
    reasons.push(
      `Next commitment: ${nextCommitmentAt.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}`,
    );
  } else {
    reasons.push("No next commitment logged");
  }

  return reasons;
}

const verdictToneDot: Record<VerdictTone, string> = {
  ok: "bg-emerald-400",
  caution: "bg-yellow-300",
  danger: "bg-rose-400",
};

export default async function TripsPage() {
  const tripsRaw = await prisma.trip.findMany({
    include: {
      order: true,
      unitRef: {
        select: {
          homeBase: true,
        },
      },
      stops: {
        orderBy: { seq: "asc" },
        select: {
          stopType: true,
          city: true,
          state: true,
          lat: true,
          lon: true,
          scheduledAt: true,
          seq: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 25,
  });

  // Normalize data for rendering
  const trips = tripsRaw.map((t) => {
    const revenue = t.revenue != null ? Number(t.revenue) : null;
    const totalCost = t.totalCost != null ? Number(t.totalCost) : null;
    const computedProfit =
      revenue != null && totalCost != null ? revenue - totalCost : null;
    const fallbackProfit =
      computedProfit != null
        ? computedProfit
        : t.profit != null
          ? Number(t.profit)
          : null;
    const marginPct =
      revenue && revenue !== 0 && fallbackProfit != null
        ? fallbackProfit / revenue
        : null;

    const miles = Number(t.miles ?? 0);
    const rpm = revenue != null && miles > 0 ? revenue / miles : null;

    const stops = ((t.stops ?? []) as TripStopData[]).sort((a, b) => a.seq - b.seq);
    const destinationStop = findDestinationStop(stops);
    const fallbackDestination = destinationStop
      ? [destinationStop.city, destinationStop.state].filter(Boolean).join(", ") || null
      : t.order?.destination ?? null;

    const { delayRiskPct, eta, slackMinutes } = computeDelayMetrics({
      unitHomeBase: t.unitRef?.homeBase ?? null,
      destination: destinationStop,
      destinationFallback: fallbackDestination ?? t.order?.destination ?? null,
      deliveryWindowStart: t.order?.delWindowStart ?? destinationStop?.scheduledAt ?? null,
      deliveryWindowEnd: t.order?.delWindowEnd ?? destinationStop?.scheduledAt ?? null,
    });

    const verdict = classifyVerdict(marginPct, delayRiskPct, t.status);
    const reasons = buildReasons({
      marginPct,
      delayRiskPct,
      status: t.status,
      driver: t.driver,
      nextCommitmentAt: t.nextCommitmentAt,
      eta,
      slackMinutes,
    });

    return {
      id: t.id,
      createdAt: t.createdAt,
      status: t.status || "Created",
      driver: t.driver || "",
      unit: t.unit || "",
      origin: t.order?.origin || "",
      destination: t.order?.destination || "",
      miles,
      marginPct,
      delayRiskPct,
      verdict,
      reasons,
      rpm,
      eta,
      slackMinutes,
    };
  });

  // KPI block
  const activeTrips = trips.filter((t) => t.status.toLowerCase() !== "completed");
  const needsInterventionCount = activeTrips.filter(
    (t) => t.verdict.label === "Needs Intervention",
  ).length;
  const cautionCount = activeTrips.filter((t) => t.verdict.label === "Caution").length;

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard
        title="Trips"
        description="Live dispatch health, AI-style risk assessment, and profit watch."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-wide text-white/50">Active Trips</div>
            <div className="mt-2 text-2xl font-semibold text-white">{activeTrips.length}</div>
            <div className="text-[11px] text-white/60">Monitoring status, timing, and margin drift.</div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-wide text-white/50">Needs Intervention</div>
            <div className="mt-2 text-2xl font-semibold text-white">{needsInterventionCount}</div>
            <div className="text-[11px] text-white/60">Margin &lt;5%, delay risk &gt;30%, or missing dispatch status.</div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-wide text-white/50">Caution</div>
            <div className="mt-2 text-2xl font-semibold text-white">{cautionCount}</div>
            <div className="text-[11px] text-white/60">Thin margin (&lt;8%) or ETA slippage risk.</div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        title="Recent / Active Trips"
        description="AI verdict explains why a trip is risky (late, unprofitable, incomplete)."
        headerRight={<span className="text-[10px] font-mono text-white/60">showing {trips.length} latest</span>}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[11px] text-white/80">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="py-2 pr-4 font-normal uppercase tracking-wide">Trip</th>
                <th className="py-2 pr-4 font-normal uppercase tracking-wide">Driver / Unit</th>
                <th className="py-2 pr-4 font-normal uppercase tracking-wide">Lane</th>
                <th className="py-2 pr-4 font-normal uppercase tracking-wide">Miles / RPM</th>
                <th className="py-2 pr-4 font-normal uppercase tracking-wide">Margin</th>
                <th className="py-2 pr-4 font-normal uppercase tracking-wide">Delay Risk</th>
                <th className="py-2 pr-4 font-normal uppercase tracking-wide">AI Verdict</th>
                <th className="py-2 pr-4 font-normal uppercase tracking-wide">Notes</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {trips.map((t) => (
                <tr key={t.id} className="align-top transition hover:bg-white/5">
                  {/* Trip ID + status */}
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-white">{t.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-[10px] text-white/60">{t.status}</div>
                    <div className="text-[10px] text-white/60">
                      {t.createdAt.toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>

                  {/* Driver / Unit */}
                  <td className="py-3 pr-4">
                    <div className="font-medium text-white">{t.driver || "—"}</div>
                    <div className="text-[10px] text-white/60">{t.unit || "—"}</div>
                  </td>

                  {/* Lane */}
                  <td className="py-3 pr-4">
                    <div className="text-white">
                      {t.origin || "—"} <span className="text-white/40">→</span> {t.destination || "—"}
                    </div>
                    <div className="text-[10px] text-white/60">{t.miles} mi</div>
                  </td>

                  {/* Miles / RPM */}
                  <td className="py-3 pr-4">
                    <div className="text-white">{t.miles} mi</div>
                    <div className="text-[10px] text-white/60">
                      {t.rpm != null ? `${t.rpm.toFixed(2)} $/mi` : "—"}
                    </div>
                  </td>

                  {/* Margin */}
                  <td className="py-3 pr-4">
                    <div className={`font-semibold ${pctColor(t.marginPct)} text-[12px]`}>
                      {t.marginPct != null && !Number.isNaN(t.marginPct)
                        ? `${(t.marginPct * 100).toFixed(1)}%`
                        : "—"}
                    </div>
                    <div className="text-[10px] text-white/50">Gross margin</div>
                  </td>

                  {/* Delay Risk */}
                  <td className="py-3 pr-4">
                    <div className={`font-semibold ${riskColor(t.delayRiskPct)} text-[12px]`}>
                      {t.delayRiskPct != null && !Number.isNaN(t.delayRiskPct)
                        ? `${(t.delayRiskPct * 100).toFixed(1)}%`
                        : "—"}
                    </div>
                    <div className="text-[10px] text-white/50">{formatEtaDetail(t.eta, t.slackMinutes)}</div>
                  </td>

                  {/* Verdict */}
                  <td className="py-3 pr-4">
                    <span className={pillBaseClass}>
                      <span className={`h-1.5 w-1.5 rounded-full ${verdictToneDot[t.verdict.tone]}`} aria-hidden />
                      {t.verdict.label}
                    </span>
                  </td>

                  {/* Notes / Reasons */}
                  <td className="w-[220px] max-w-[220px] py-3 pr-4">
                    <ul className="list-disc space-y-1 pl-4 text-[10px] leading-relaxed text-white/60">
                      {t.reasons.map((line, idx) => (
                        <li key={idx}>{line}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}

              {trips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[11px] text-white/60">
                    No trips have been booked yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
