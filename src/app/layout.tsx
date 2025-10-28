export const metadata = { title: "Fleet Dispatch", description: "Operations dashboard" };

import "./globals.css";
import Link from "next/link";
import React from "react";

import CollapsibleNavPanel from "@/src/components/navigation/collapsible-side-panel";
import { NAV_SECTIONS, TOP_NAV_LINKS } from "@/src/lib/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(30,41,59,0.35),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(30,41,59,0.25),_transparent_60%)]">
          <header className="sticky top-0 z-40 w-full border-b border-slate-800/70 bg-slate-950/85 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
              <Link
                href="/"
                className="text-base font-semibold tracking-tight text-slate-100 transition hover:text-white"
              >
                Fleet Dispatch
              </Link>
              <nav className="hidden items-center gap-5 text-sm font-medium text-slate-300 md:flex">
                {TOP_NAV_LINKS.map((item) => (
                  <Link key={item.href} href={item.href} className="transition hover:text-white">
                    {item.label}
                  </Link>
                ))}
              </nav>
              <Link
                href="/book"
                className="inline-flex items-center rounded-full border border-emerald-500/80 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 shadow-lg shadow-emerald-500/10 transition hover:border-emerald-400 hover:bg-emerald-500/20"
              >
                Launch Booking Console
              </Link>
            </div>
            <div className="mx-auto block max-w-7xl px-4 pb-3 md:hidden">
              <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-300">
                {TOP_NAV_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full border border-slate-800/80 px-3 py-1 transition hover:border-emerald-500/60 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </header>
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
            <CollapsibleNavPanel sections={NAV_SECTIONS} />
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
