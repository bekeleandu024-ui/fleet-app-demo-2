export const metadata = { title: "Fleet Dispatch", description: "Operations dashboard" };

import "./globals.css";
import Link from "next/link";
import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(30,41,59,0.35),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(30,41,59,0.25),_transparent_60%)]">
          <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <Link href="/" className="text-sm font-semibold text-slate-100 transition hover:text-white">
                Fleet Dispatch
              </Link>
              <nav className="flex items-center gap-1">
                <Link className="nav-link" href="/">
                  Dashboard
                </Link>
                <Link className="nav-link" href="/orders">
                  Orders
                </Link>
                <Link className="nav-link" href="/drivers">
                  Drivers
                </Link>
                <Link className="nav-link" href="/units">
                  Units
                </Link>
                <Link className="nav-link" href="/rates">
                  Rates
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
