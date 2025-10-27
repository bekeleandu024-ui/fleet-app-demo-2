import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fleet Dispatch Console",
  description: "Internal dispatch workflow for orders, trips, drivers, units, and rates.",
};

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/drivers", label: "Drivers" },
  { href: "/units", label: "Units" },
  { href: "/rates", label: "Rates" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col bg-black text-zinc-100">
          <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-semibold text-zinc-100">
                Fleet Dispatch
              </Link>
              <nav className="flex items-center gap-6 text-sm uppercase tracking-wide text-zinc-400">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="hover:text-sky-400">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
