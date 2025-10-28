export const metadata = { title: "Fleet Dispatch", description: "Operations dashboard" };

import "./globals.css";
import Link from "next/link";
import React from "react";

import DashboardShell from "@/src/components/navigation/dashboard-shell";
import NavSectionsMenu from "@/src/components/navigation/nav-sections-menu";
import { NAV_SECTIONS, TOP_NAV_LINKS } from "@/src/lib/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0f1729]/80 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-6 px-6">
            <div className="flex flex-1 items-center gap-4">
              <Link href="/" className="text-base font-semibold tracking-tight text-white transition hover:text-white/80">
                Fleet Dispatch
              </Link>
              <NavSectionsMenu sections={NAV_SECTIONS} />
              <nav className="hidden flex-1 items-center gap-5 text-sm font-medium text-white/70 md:flex">
                {TOP_NAV_LINKS.map((item) => (
                  <Link key={item.href} href={item.href} className="transition hover:text-white">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <Link
              href="/book"
              className="inline-flex items-center rounded-md border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 shadow-[0_10px_30px_rgba(16,185,129,0.25)] transition hover:border-emerald-300/60 hover:text-emerald-100"
            >
              Launch Booking Console
            </Link>
          </div>
          <div className="mx-auto block max-w-[1600px] px-6 pb-3 md:hidden">
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-white/70">
              <NavSectionsMenu sections={NAV_SECTIONS} />
              {TOP_NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1 transition hover:border-emerald-400/40 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </header>
        <DashboardShell sections={NAV_SECTIONS}>{children}</DashboardShell>
      </body>
    </html>
  );
}
