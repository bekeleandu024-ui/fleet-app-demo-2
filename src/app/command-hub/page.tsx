import { PageShell } from "@/src/components/PageShell";

export default function CommandHubDemoPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl space-y-8">
        <section>
          <h1 className="text-3xl font-semibold">Command Hub Demo</h1>
          <p className="mt-3 text-base text-white/70">
            Toggle the sidebar to explore how operations, planning, insights, and governance tools stay one click away while
            main content remains readable. This placeholder area can contain dashboards, maps, or workflow-specific views.
          </p>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          {["Live Dispatch", "Load Planning", "Margin Insights", "Compliance"].map((title) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_40px_-25px_rgba(15,23,42,0.9)]"
            >
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm text-white/60">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec ullamcorper ligula at velit bibendum posuere.
              </p>
            </div>
          ))}
        </section>
      </div>
    </PageShell>
  );
}
