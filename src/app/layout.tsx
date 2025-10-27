export const metadata = { title: "Fleet Dispatch", description: "Operations dashboard" };

import "./globals.css";
import Link from "next/link";
import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold text-slate-200 hover:text-white">Fleet Dispatch</Link>
            <nav className="flex items-center gap-1">
              <Link className="nav-link" href="/">Dashboard</Link>
              <Link className="nav-link" href="/orders">Orders</Link>
              <Link className="nav-link" href="/drivers">Drivers</Link>
              <Link className="nav-link" href="/units">Units</Link>
              <Link className="nav-link" href="/rates">Rates</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </body>
    </html>
  );
}
