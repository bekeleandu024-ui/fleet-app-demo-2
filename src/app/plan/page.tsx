import prisma from "@/lib/prisma";
import QuickPlanner from "./QuickPlanner";

export default async function PlanPage() {
  const rateSettings = await prisma.rateSetting.findMany({
    orderBy: [{ category: "asc" }, { rateKey: "asc" }],
  });

  const marginFloor = rateSettings.find((r) =>
    r.rateKey.toUpperCase().includes("MARGIN_FLOOR")
  );

  return (
    <main className="min-h-screen bg-[#0a0f1c] text-neutral-100 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Plan &amp; Price
          </h1>
          <p className="text-sm text-neutral-400">
            Rate lookup, margin guardrails, and dispatch guidance before you
            commit a load.
          </p>
        </header>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-lg shadow-black/40">
          <div className="border-b border-neutral-800 p-5">
            <div className="text-sm font-semibold text-neutral-200">
              Rate &amp; Margin Planning
            </div>
            <div className="mt-1 text-xs text-neutral-400">
              Estimate CPM cost, target RPM, and projected margin before booking
              a trip.
            </div>
          </div>
          <div className="p-5">
            <QuickPlanner />
          </div>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-lg shadow-black/40">
          <div className="border-b border-neutral-800 p-5 flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-200">
                Guardrails / Rules
              </div>
              <div className="mt-1 text-xs text-neutral-400">
                Pricing floors, add-on policies, fuel surcharge logic, etc.
              </div>
            </div>
            {marginFloor ? (
              <div className="rounded-md bg-red-600/20 border border-red-500/40 px-3 py-2 text-[11px] text-red-300 font-semibold leading-tight">
                <div>Margin Floor</div>
                <div className="text-red-200">
                  {marginFloor.value.toString()} {marginFloor.unit} min
                </div>
                {marginFloor.note ? (
                  <div className="text-[10px] text-red-400 mt-1">
                    {marginFloor.note}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="p-5 text-xs text-neutral-300 space-y-4">
            <table className="w-full text-left text-[11px] md:text-xs">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-2 pr-3 font-normal uppercase tracking-wide">
                    Category
                  </th>
                  <th className="py-2 pr-3 font-normal uppercase tracking-wide">
                    Key
                  </th>
                  <th className="py-2 pr-3 font-normal uppercase tracking-wide">
                    Value
                  </th>
                  <th className="py-2 pr-3 font-normal uppercase tracking-wide">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="text-neutral-200">
                {rateSettings.map((rs) => (
                  <tr
                    key={rs.id}
                    className="border-t border-neutral-800/80 hover:bg-neutral-800/30"
                  >
                    <td className="py-2 pr-3 text-[11px] text-neutral-400">
                      {rs.category}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-neutral-300">
                      {rs.rateKey}
                    </td>
                    <td className="py-2 pr-3 text-[11px] text-neutral-100">
                      {rs.value.toString()} {rs.unit}
                    </td>
                    <td className="py-2 pr-3 text-[11px] text-neutral-400">
                      {rs.note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="text-[11px] text-neutral-500 leading-relaxed">
              These guardrails are used in the Book console and AI suggestions.
              Anything outside these rules should require manual approval.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
