import prisma from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";

export default async function FleetPage() {
  const units = await prisma.unit.findMany({
    where: { active: true },
    orderBy: [{ code: "asc" }],
  });

  return (
    <main className="min-h-screen bg-[#0a0f1c] text-neutral-100 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Fleet</h1>
          <p className="text-sm text-neutral-400">
            Live map and unit availability snapshot.
          </p>
        </header>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-lg shadow-black/40">
          <div className="border-b border-neutral-800 p-5">
            <div className="text-sm font-semibold text-neutral-200">Live Map</div>
            <div className="mt-1 text-xs text-neutral-400">
              Real-time truck GPS, current lane, and ETA risk overlays.
              (placeholder for telematics / routing integration)
            </div>
          </div>
          <div className="p-5">
            <div className="rounded-md border border-neutral-800 bg-neutral-950/30 text-[11px] text-neutral-500 p-10 text-center">
              Interactive map UI goes here (truck pins, origin→destination arc,
              traffic/weather layers).
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-lg shadow-black/40">
          <div className="border-b border-neutral-800 p-5 flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-200">
                Available units &amp; active lanes
              </div>
              <div className="mt-1 text-xs text-neutral-400">
                Who’s free, where they’re based, and whether they’re on hold.
              </div>
            </div>
            <div className="rounded-md bg-neutral-800/40 border border-neutral-700/40 px-3 py-2 text-[10px] text-neutral-300 leading-tight">
              <div className="font-semibold text-neutral-200">
                {units.length} active units
              </div>
              <div className="text-neutral-400 text-[10px]">Filtered to active=true</div>
            </div>
          </div>

          <div className="p-5 text-xs text-neutral-300 space-y-4">
            {units.length === 0 ? (
              <div className="text-[11px] text-neutral-500">
                No active units are currently available.
              </div>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {units.map((u) => (
                  <li
                    key={u.id}
                    className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-4 shadow-inner shadow-black/50 text-[11px]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-neutral-100">
                          {u.code}{" "}
                          {u.isOnHold ? (
                            <span className="ml-2 rounded bg-yellow-600/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-300 border border-yellow-600/40">
                              HOLD
                            </span>
                          ) : null}
                        </div>
                        <div className="text-neutral-400 text-[11px]">
                          {u.type || "—"} @ {u.homeBase || "—"}
                        </div>
                        <div className="mt-1 text-neutral-300">
                          Status:{" "}
                          <span className="text-neutral-100 font-medium">
                            {u.status || "Available"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-neutral-500">
                        {u.lastKnownAt ? (
                          <>
                            <div>last ping</div>
                            <div className="text-neutral-300">
                              {formatDistanceToNow(u.lastKnownAt, {
                                addSuffix: true,
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="text-neutral-600">no ping</div>
                        )}
                      </div>
                    </div>

                    {u.lastKnownLat != null && u.lastKnownLon != null ? (
                      <div className="mt-2 text-[10px] text-neutral-500">
                        LAT {u.lastKnownLat?.toFixed(3)}, LON {u.lastKnownLon?.toFixed(3)}
                      </div>
                    ) : null}

                    {u.lastMarginPct != null ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                        <span className="text-neutral-400">Recent margin</span>
                        <span
                          className={
                            Number(u.lastMarginPct) >= 0.12
                              ? "text-emerald-400 font-semibold"
                              : Number(u.lastMarginPct) >= 0.08
                              ? "text-yellow-300 font-semibold"
                              : "text-red-400 font-semibold"
                          }
                        >
                          {(Number(u.lastMarginPct) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-[10px] text-neutral-500 leading-relaxed">
              This view will evolve into the live dispatch board: which tractors
              are free, which lanes they're covering, and which ones are best
              positioned for new tenders.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
