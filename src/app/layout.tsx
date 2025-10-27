import type { Metadata } from "next";
import Link from "next/link";
import { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Fleet Dispatch Console",
  description: "Internal dispatch workflow for orders, trips, drivers, units, and rates.",
};

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/trips", label: "Trips" },
  { href: "/drivers", label: "Drivers" },
  { href: "/units", label: "Units" },
  { href: "/rates", label: "Rates" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="bg-neutral-950 text-neutral-100 antialiased">
      <body className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
        <header className="sticky top-0 z-40 border-b border-neutral-900/80 bg-neutral-950/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight text-neutral-100">
              Fleet Dispatch
            </Link>
            <div className="flex flex-1 items-center justify-end gap-4">
              <nav className="-mr-2 flex w-full max-w-xl justify-end overflow-x-auto px-2 text-sm text-neutral-400">
                <div className="flex items-center gap-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="relative rounded-full px-3 py-1.5 font-medium transition-colors duration-200 hover:text-neutral-100 aria-[current=page]:text-neutral-100 aria-[current=page]:before:absolute aria-[current=page]:before:inset-x-1 aria-[current=page]:before:-bottom-px aria-[current=page]:before:h-px aria-[current=page]:before:rounded-full aria-[current=page]:before:bg-neutral-100/40"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </nav>
              <div className="h-9 w-9 shrink-0 rounded-full bg-neutral-800" aria-hidden />
            </div>
          </div>
        </header>
        <main className="flex-1 w-full">
          <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
