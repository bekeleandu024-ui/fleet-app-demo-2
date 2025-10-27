import prisma from "@/lib/prisma";

function pctColor(pctNum: number | null | undefined) {
  if (pctNum == null || isNaN(pctNum)) return "text-neutral-400";
  if (pctNum >= 0.12) return "text-emerald-400";
  if (pctNum >= 0.08) return "text-yellow-300";
  return "text-red-400";
}

function riskColor(riskNum: number | null | undefined) {
  if (riskNum == null || isNaN(riskNum)) return "text-neutral-400";
  if (riskNum >= 0.3) return "text-red-400";
  if (riskNum >= 0.15) return "text-yellow-300";
  return "text-emerald-400";
}

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
      toneClass:
        "bg-red-600/20 border border-red-600/40 text-red-300 shadow-[0_0_20px_rgba(220,38,38,0.2)]",
    } as const;
  }

  const lowMarginSoft = marginPct < 0.08; // <8%
  const highDelaySoft = delayRiskPct >= 0.15; // 15%+

  if (lowMarginSoft || highDelaySoft) {
    return {
      label: "Caution",
      toneClass:
        "bg-yellow-500/20 border border-yellow-500/40 text-yellow-200 shadow-[0_0_20px_rgba(250,204,21,0.15)]",
    } as const;
  }

  return {
    label: "OK",
    toneClass:
      "bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
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
    <main className="min-h-screen bg-[#0a0f1c] text-neutral-100 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Trips</h1>
          <p className="text-sm text-neutral-400">
            Live dispatch health, AI-style risk assessment, and profit watch.
          </p>
        </header>

        {/* KPI Row */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg shadow-black/40">
            <div className="text-[11px] text-neutral-400">Active Trips (not Completed)</div>
            <div className="text-2xl font-semibold text-neutral-100">{activeTrips.length}</div>
            <div className="text-[10px] text-neutral-500">
              Monitoring status, timing, and margin drift.
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg shadow-black/40">
            <div className="text-[11px] text-neutral-400">Needs Intervention</div>
            <div className="text-2xl font-semibold text-red-400">{needsInterventionCount}</div>
            <div className="text-[10px] text-neutral-500">
              Margin &lt;5%, delay risk &gt;30%, or missing dispatch status.
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg shadow-black/40">
            <div className="text-[11px] text-neutral-400">Caution</div>
            <div className="text-2xl font-semibold text-yellow-300">{cautionCount}</div>
            <div className="text-[10px] text-neutral-500">
              Thin margin (&lt;8%) or ETA slippage risk.
            </div>
          </div>
        </section>

        {/* Trips Table */}
        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-lg shadow-black/40 overflow-hidden">
          <div className="border-b border-neutral-800 p-5 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-200">Recent / Active Trips</div>
              <div className="mt-1 text-xs text-neutral-400">
                AI verdict explains why a trip is risky (late, unprofitable, incomplete).
              </div>
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">showing {trips.length} latest</div>
          </div>

          <div className="p-5 overflow-x-auto">
            <table className="min-w-full text-left text-[11px] text-neutral-300">
              <thead className="text-neutral-500">
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

              <tbody className="text-neutral-200">
                {trips.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-neutral-800/80 hover:bg-neutral-800/30 align-top"
                  >
                    {/* Trip ID + status */}
                    <td className="py-2 pr-4">
                      <div className="font-semibold text-neutral-100">{t.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-[10px] text-neutral-500">{t.status}</div>
                      <div className="text-[10px] text-neutral-500">
                        {t.createdAt.toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Driver / Unit */}
                    <td className="py-2 pr-4">
                      <div className="text-neutral-200 font-medium">{t.driver || "—"}</div>
                      <div className="text-[10px] text-neutral-400">{t.unit || "—"}</div>
                    </td>

                    {/* Lane */}
                    <td className="py-2 pr-4">
                      <div className="text-neutral-200">
                        {t.origin || "—"} <span className="text-neutral-500">→</span> {t.destination || "—"}
                      </div>
                      <div className="text-[10px] text-neutral-500">{t.miles} mi</div>
                    </td>

                    {/* Miles / RPM */}
                    <td className="py-2 pr-4">
                      <div className="text-neutral-200">{t.miles} mi</div>
                      <div className="text-[10px] text-neutral-500">
                        {t.rpm != null ? `${t.rpm.toFixed(2)} $/mi` : "—"}
                      </div>
                    </td>

                    {/* Margin */}
                    <td className="py-2 pr-4">
                      <div className={`font-semibold ${pctColor(t.marginPct)} text-[12px]`}>
                        {(t.marginPct * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-neutral-500">Gross margin</div>
                    </td>

                    {/* Delay Risk */}
                    <td className="py-2 pr-4">
                      <div className={`font-semibold ${riskColor(t.delayRiskPct)} text-[12px]`}>
                        {(t.delayRiskPct * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-neutral-500">Late risk</div>
                    </td>

                    {/* Verdict */}
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-block rounded-md px-2 py-1 text-[10px] font-semibold whitespace-nowrap ${t.verdict.toneClass}`}
                      >
                        {t.verdict.label}
                      </span>
                    </td>

                    {/* Notes / Reasons */}
                    <td className="py-2 pr-4 w-[220px] max-w-[220px]">
                      <ul className="text-[10px] text-neutral-400 leading-relaxed list-disc pl-4 space-y-1">
                        {t.reasons.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}

                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-[11px] text-neutral-500">
                      No trips have been booked yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
