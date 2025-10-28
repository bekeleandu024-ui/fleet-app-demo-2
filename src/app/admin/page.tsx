import Link from "next/link";

const governanceToggles = [
  {
    id: "priority-lanes",
    name: "Priority lanes",
    description: "Lock high-margin lanes behind director approval when market spread narrows.",
    enabled: true,
  },
  {
    id: "auto-audit",
    name: "Automated audits",
    description: "Nightly audit of lumper receipts and detention reimbursement discrepancies.",
    enabled: true,
  },
  {
    id: "carrier-thresholds",
    name: "Carrier safety thresholds",
    description: "Block dispatch if SaferWatch score drops below 80 or COI expires in 15 days.",
    enabled: false,
  },
  {
    id: "spot-offers",
    name: "Spot offer guardrails",
    description: "Require live market justification for spot offers outside contracted lanes.",
    enabled: true,
  },
];

const accessPolicies = [
  {
    name: "Network Director",
    scopes: ["Dispatch overrides", "Carrier onboarding", "Finance exports"],
    owners: "2 members",
  },
  {
    name: "Regional Manager",
    scopes: ["Driver compliance", "Trip editing", "Rate adjustments"],
    owners: "6 members",
  },
  {
    name: "Back office",
    scopes: ["Billing queue", "Document audit", "Analytics read"],
    owners: "9 members",
  },
];

const automationRuns = [
  {
    name: "Nightly compliance sweep",
    cadence: "01:30 EST",
    lastRun: "Success · 4h ago",
    notes: "Flagged 3 expiring medical cards",
  },
  {
    name: "Carrier insurance sync",
    cadence: "Hourly",
    lastRun: "Success · 32m ago",
    notes: "2 policies renewed",
  },
  {
    name: "Load board publishing",
    cadence: "On demand",
    lastRun: "Pending",
    notes: "Awaiting approval",
  },
];

export default function AdminControlsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-lg shadow-black/40">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Admin controls</h1>
            <p className="text-sm text-neutral-400">
              Govern overrides, compliance automations, and sensitive configuration from a single console.
            </p>
          </div>
          <Link
            href="/admin/rules"
            className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/20"
          >
            Manage rules
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-6 shadow-inner shadow-black/40">
            <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Governance toggles</h2>
                <p className="text-sm text-neutral-400">
                  Flip mission-critical controls without leaving breadcrumbs in spreadsheets.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-neutral-400">
                Last change logged · 17m ago
              </div>
            </header>
            <div className="mt-6 space-y-4">
              {governanceToggles.map((toggle) => (
                <div
                  key={toggle.id}
                  className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-black/40 p-4 transition hover:border-sky-700/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-100">{toggle.name}</p>
                      <p className="text-xs text-neutral-400">{toggle.description}</p>
                    </div>
                    <span
                      className={
                        "inline-flex h-6 w-12 items-center rounded-full border border-neutral-700 bg-neutral-900 p-1 text-[0.65rem] font-semibold uppercase tracking-wide" +
                        (toggle.enabled
                          ? " justify-end border-emerald-500/60 bg-emerald-500/20 text-emerald-200"
                          : " justify-start text-neutral-500")
                      }
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/90 text-[0.6rem] text-neutral-900">
                        {toggle.enabled ? "ON" : "OFF"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[0.7rem] uppercase tracking-wide text-neutral-500">
                    <span>Requires change log</span>
                    <span>{toggle.enabled ? "Active" : "Disabled"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-6">
            <h2 className="text-lg font-semibold text-white">Automation runs</h2>
            <p className="text-sm text-neutral-400">
              Scheduled processes keep your compliance and finance queues ahead of regulators.
            </p>
            <div className="mt-4 divide-y divide-neutral-900/80 text-sm">
              {automationRuns.map((run) => (
                <div key={run.name} className="flex flex-col gap-2 py-4 first:pt-2 last:pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-neutral-100">{run.name}</p>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                      {run.cadence}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                    <span>{run.lastRun}</span>
                    <span className="hidden h-1 w-1 rounded-full bg-neutral-700 md:inline-block" aria-hidden />
                    <span>{run.notes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-6">
            <h2 className="text-lg font-semibold text-white">Access policies</h2>
            <p className="text-sm text-neutral-400">
              Gate risky actions to explicit owners. Every change routes to audit trails and Slack alerts.
            </p>
            <div className="mt-4 space-y-4 text-sm">
              {accessPolicies.map((policy) => (
                <div key={policy.name} className="rounded-lg border border-neutral-800 bg-black/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-neutral-100">{policy.name}</p>
                    <span className="text-xs text-neutral-500">{policy.owners}</span>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-neutral-400">
                    {policy.scopes.map((scope) => (
                      <li key={scope} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-500/60" aria-hidden />
                        {scope}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-6 text-sm text-sky-100">
            <p className="font-semibold">Need tighter guardrails?</p>
            <p className="mt-2 text-sky-100/80">
              Pipe new business logic into <span className="font-semibold text-sky-200">Rules Engine</span> and tie approvals to
              workflow automation without code deploys.
            </p>
            <Link
              href="/admin/rules"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-sky-400/50 bg-sky-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sky-100 hover:bg-sky-400/20"
            >
              Open rules engine
              <span aria-hidden>↗</span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
