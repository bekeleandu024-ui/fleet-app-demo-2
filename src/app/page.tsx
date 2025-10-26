import Link from "next/link";

const links = [
  { href: "/orders/new", label: "Create Order" },
  { href: "/trips", label: "Trips" },
  { href: "/drivers", label: "Drivers" },
  { href: "/units", label: "Units" },
  { href: "/rates", label: "Rates" },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Fleet Ops Control Center</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          This demo rebuild showcases a streamlined transportation management workflow with OCR order
          capture, trip costing, and basic fleet management. Use the sections below to get started.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-lg border border-slate-200 p-4 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">OCR & Orders</h2>
          <p className="mt-2 text-sm text-slate-600">
            Drop an order screenshot into the OCR box to extract customer, lane, and timing details.
            Select the fields you want and apply them directly into the order form.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Trips & Costing</h2>
          <p className="mt-2 text-sm text-slate-600">
            Update trips, apply rates, and recompute profitability in one place. Driver and unit rosters
            keep your fleet data organized from the same interface.
          </p>
        </div>
      </section>
    </div>
  );
}
