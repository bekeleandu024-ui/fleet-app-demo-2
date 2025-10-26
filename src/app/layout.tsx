import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fleet Ops Demo",
  description: "Demo TMS rebuilt with Next.js, Prisma, and Tailwind CSS",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-slate-100">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
              <Link href="/" className="text-lg font-semibold text-slate-900">
                Fleet Ops Demo
              </Link>
              <nav className="flex flex-wrap gap-4 text-sm font-medium text-slate-600">
                <Link href="/orders/new">Orders</Link>
                <Link href="/trips">Trips</Link>
                <Link href="/drivers">Drivers</Link>
                <Link href="/units">Units</Link>
                <Link href="/rates">Rates</Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
