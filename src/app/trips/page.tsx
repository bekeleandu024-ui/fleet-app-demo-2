import prisma from "@/lib/prisma";

import DashboardCard from "@/src/components/DashboardCard";

const pillBaseClass = "inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-medium text-white";

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
  marginPct: number,
  delayRiskPct: number,
  status: string | null | undefined,
) {
  const lowMarginHard = marginPct < 0.05; // <5%
  const highDelayHard = delayRiskPct >= 0.3; // 30%+
  const noStatus = !status || status.trim() === "";

  if (lowMarginHard || highDelayHard || noStatus) {
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
}: {
  marginPct: number;
  delayRiskPct: number;
  status: string | null | undefined;
  driver: string | null | undefined;
  nextCommitmentAt: Date | null | undefined;
}) {
  const reasons: string[] = [];

  if (!status || status.trim() === "") {
    reasons.push("Missing status / not fully dispatched");
  }

  if (marginPct < 0.05) {
    reasons.push(`Low gross margin: ${(marginPct * 100).toFixed(1)}% (<5%)`);
  } else if (marginPct < 0.08) {
    reasons.push(`Thin margin: ${(marginPct * 100).toFixed(1)}% (<8%)`);
  } else {
    reasons.push(`Margin healthy: ${(marginPct * 100).toFixed(1)}%`);
  }

  if (delayRiskPct >= 0.3) {
    reasons.push(
      `High delay risk: ${(delayRiskPct * 100).toFixed(1)}% (late ETA likely)`,
    );
  } else if (delayRiskPct >= 0.15) {
    reasons.push(
      `Watch ETA: ${(delayRiskPct * 100).toFixed(1)}% delay risk`,
    );
  } else {
    reasons.push(
      `On-time projection looks fine (${(delayRiskPct * 100).toFixed(1)}% risk)`,
    );
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
    },
    orderBy: [{ createdAt: "desc" }],
    take: 25,
  });

  // Normalize data for rendering
  const trips = tripsRaw.map((t) => {
    const marginPct = Number(t.marginPct ?? 0);
    const delayRiskPct = Number(t.delayRiskPct ?? 0);
    const miles = Number(t.miles ?? 0);
    const rpm = t.revenue && t.miles ? Number(t.revenue) / Number(t.miles) : null;

    const verdict = classifyVerdict(marginPct, delayRiskPct, t.status);
    const reasons = buildReasons({
      marginPct,
      delayRiskPct,
      status: t.status,
      driver: t.driver,
      nextCommitmentAt: t.nextCommitmentAt,
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
                      {(t.marginPct * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-white/50">Gross margin</div>
                  </td>

                  {/* Delay Risk */}
                  <td className="py-3 pr-4">
                    <div className={`font-semibold ${riskColor(t.delayRiskPct)} text-[12px]`}>
                      {(t.delayRiskPct * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-white/50">Late risk</div>
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
