import prisma from "@/lib/prisma";

function pctColor(pctNum: number | null | undefined) {
  if (pctNum == null || Number.isNaN(pctNum)) return "text-neutral-400";
  if (pctNum >= 0.12) return "text-emerald-400";
  if (pctNum >= 0.08) return "text-yellow-300";
  return "text-red-400";
}

function riskColor(riskNum: number | null | undefined) {
  if (riskNum == null || Number.isNaN(riskNum)) return "text-neutral-400";
  if (riskNum >= 0.3) return "text-red-400";
  if (riskNum >= 0.15) return "text-yellow-300";
  return "text-emerald-400";
}

export default async function InsightsPage() {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const recentTrips = await prisma.trip.findMany({
    where: { createdAt: { gte: since } },
    include: { order: true },
    orderBy: [{ createdAt: "desc" }],
    take: 10,
  });

  const avgMarginPct =
    recentTrips.length > 0
      ? recentTrips.reduce((acc, t) => acc + Number(t.marginPct || 0), 0) /
        recentTrips.length
      : 0;

  const avgDelayRisk =
    recentTrips.length > 0
      ? recentTrips.reduce((acc, t) => acc + Number(t.delayRiskPct || 0), 0) /
        recentTrips.length
      : 0;

  return (
    <main className="min-h-screen bg-[#0a0f1c] text-neutral-100 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Insights</h1>
          <p className="text-sm text-neutral-400">
            Margin, dwell, guardrails. Early warning for risk and erosion.
          </p>
        </header>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-lg shadow-black/40">
          <div className="border-b border-neutral-800 p-5">
            <div className="text-sm font-semibold text-neutral-200">
              Margin / dwell / guardrails
            </div>
            <div className="mt-1 text-xs text-neutral-400">
              Snapshot of recent performance and operational stress.
            </div>
          </div>

          <div className="p-5 grid gap-4 md:grid-cols-3 text-[11px]">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4 shadow-inner shadow-black/50">
              <div className="text-neutral-400 text-[11px]">Avg Margin (7d)</div>
              <div className={`text-xl font-semibold ${pctColor(avgMarginPct)}`}>
                {(avgMarginPct * 100).toFixed(1)}%
              </div>
              <div className="mt-1 text-[10px] text-neutral-500">Target floor: 12%+</div>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4 shadow-inner shadow-black/50">
              <div className="text-neutral-400 text-[11px]">Avg Delay Risk (7d)</div>
              <div className={`text-xl font-semibold ${riskColor(avgDelayRisk)}`}>
                {(avgDelayRisk * 100).toFixed(1)}%
              </div>
              <div className="mt-1 text-[10px] text-neutral-500">
                &gt;30% = high alert (notify customer proactively)
              </div>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4 shadow-inner shadow-black/50">
              <div className="text-neutral-400 text-[11px]">Dwell &amp; Guardrails</div>
              <div className="text-xl font-semibold text-neutral-100">Coming Soon</div>
              <div className="mt-1 text-[10px] text-neutral-500">
                We’ll surface detention time, long border waits, and SLA breaches here.
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-lg shadow-black/40 overflow-hidden">
          <div className="border-b border-neutral-800 p-5">
            <div className="text-sm font-semibold text-neutral-200">Analytics</div>
            <div className="mt-1 text-xs text-neutral-400">
              Last 10 trips, basic health signals.
            </div>
          </div>

          <div className="p-5 overflow-x-auto">
            <table className="min-w-full text-left text-[11px] text-neutral-300">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-2 pr-4 font-normal uppercase tracking-wide">Trip</th>
                  <th className="py-2 pr-4 font-normal uppercase tracking-wide">Driver / Unit</th>
                  <th className="py-2 pr-4 font-normal uppercase tracking-wide">Lane</th>
                  <th className="py-2 pr-4 font-normal uppercase tracking-wide">Margin</th>
                  <th className="py-2 pr-4 font-normal uppercase tracking-wide">Delay Risk</th>
                </tr>
              </thead>
              <tbody className="text-neutral-200">
                {recentTrips.map((t) => {
                  const marginNum = Number(t.marginPct || 0);
                  const delayNum = Number(t.delayRiskPct || 0);
                  return (
                    <tr
                      key={t.id}
                      className="border-t border-neutral-800/80 hover:bg-neutral-800/30"
                    >
                      <td className="py-2 pr-4 align-top">
                        <div className="font-semibold text-neutral-100">
                          {t.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {t.status || "Created"}
                        </div>
                      </td>

                      <td className="py-2 pr-4 align-top text-[11px]">
                        <div className="text-neutral-200">{t.driver || "—"}</div>
                        <div className="text-neutral-400 text-[10px]">
                          {t.unit || "—"}
                        </div>
                      </td>

                      <td className="py-2 pr-4 align-top text-[11px]">
                        <div className="text-neutral-200">
                          {t.order?.origin || "—"}{" "}
                          <span className="text-neutral-500">→</span>{" "}
                          {t.order?.destination || "—"}
                        </div>
                        <div className="text-neutral-500 text-[10px]">
                          {t.type || "Type?"} / {t.zone || "Zone?"}
                        </div>
                      </td>

                      <td className="py-2 pr-4 align-top text-[11px]">
                        <div className={`font-semibold ${pctColor(marginNum)}`}>
                          {(marginNum * 100).toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          CPM {t.totalCPM ? `$${Number(t.totalCPM).toFixed(2)}` : "—"}
                        </div>
                      </td>

                      <td className="py-2 pr-4 align-top text-[11px]">
                        <div className={`font-semibold ${riskColor(delayNum)}`}>
                          {(delayNum * 100).toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {delayNum >= 0.3
                            ? "High risk: notify"
                            : delayNum >= 0.15
                            ? "Watch closely"
                            : "Healthy"}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {recentTrips.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-[11px] text-neutral-500"
                    >
                      No recent trips in the last 7 days.
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
