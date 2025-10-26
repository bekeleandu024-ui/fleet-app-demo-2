import prisma from "@/lib/prisma";

function formatNumber(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function RatesPage() {
  const [rates, settings] = await Promise.all([
    prisma.rate.findMany({ orderBy: [{ type: "asc" }, { zone: "asc" }] }),
    prisma.rateSetting.findMany({ orderBy: [{ rateKey: "asc" }, { category: "asc" }] }),
  ]);

  const safeRates = rates.map((rate) => ({
    ...rate,
    fixedCPM: Number(rate.fixedCPM),
    wageCPM: Number(rate.wageCPM),
    addOnsCPM: Number(rate.addOnsCPM),
    rollingCPM: Number(rate.rollingCPM),
    label: [rate.type, rate.zone].filter(Boolean).join(" • "),
  }));

  const safeSettings = settings.map((setting) => ({
    ...setting,
    value: Number(setting.value),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Rate programs</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review base cents-per-mile programs and configurable settings used to price trips. Decimal
          values are normalized before rendering to avoid client serialization issues.
        </p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Rates</h2>
          <span className="text-xs text-slate-500">{safeRates.length} programs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Label</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Fixed CPM</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Wage CPM</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Add-ons CPM</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Rolling CPM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {safeRates.map((rate) => (
                <tr key={rate.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-800">{rate.label || "General"}</td>
                  <td className="px-4 py-2 text-slate-700">${formatNumber(rate.fixedCPM)}</td>
                  <td className="px-4 py-2 text-slate-700">${formatNumber(rate.wageCPM)}</td>
                  <td className="px-4 py-2 text-slate-700">${formatNumber(rate.addOnsCPM)}</td>
                  <td className="px-4 py-2 text-slate-700">${formatNumber(rate.rollingCPM)}</td>
                </tr>
              ))}
              {safeRates.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-center text-slate-500" colSpan={5}>
                    No rate programs defined yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Rate settings</h2>
          <span className="text-xs text-slate-500">{safeSettings.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Rate key</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Category</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Value</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Unit</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {safeSettings.map((setting) => (
                <tr key={setting.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-800">{setting.rateKey}</td>
                  <td className="px-4 py-2 text-slate-700">{setting.category}</td>
                  <td className="px-4 py-2 text-slate-700">{formatNumber(setting.value)}</td>
                  <td className="px-4 py-2 text-slate-700">{setting.unit}</td>
                  <td className="px-4 py-2 text-slate-600">{setting.note ?? "—"}</td>
                </tr>
              ))}
              {safeSettings.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-center text-slate-500" colSpan={5}>
                    No settings configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
