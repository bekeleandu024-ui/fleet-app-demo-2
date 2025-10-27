// Acceptance criteria:
// - Lists trips needing attention (delay risk, missing check-ins, commitments).
// - Each card shows why it is flagged and provides quick navigation links.
// - Data is computed server-side and Prisma Decimal values converted before render.

import Link from "next/link";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
}

export default async function ExceptionsPage() {
  const trips = await prisma.trip.findMany({
    where: {
      OR: [
        { delayRiskPct: { gt: new Prisma.Decimal(0.3) } },
        { lastCheckInAt: null },
        { nextCommitmentAt: { lte: new Date(Date.now() + 60 * 60 * 1000) } },
      ],
    },
    include: {
      order: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows = trips.map((trip) => {
    const reasons: string[] = [];
    const risk = toNumber(trip.delayRiskPct);
    if (risk >= 0.3) {
      reasons.push(`Delay risk ${(risk * 100).toFixed(0)}%`);
    }
    if (!trip.lastCheckInAt) {
      reasons.push("No recent check-in");
    }
    if (trip.nextCommitmentAt && trip.nextCommitmentAt.getTime() < Date.now() + 60 * 60 * 1000) {
      reasons.push("Commitment due <60 min");
    }
    return {
      id: trip.id,
      order: trip.order?.customer ?? "Unknown",
      lane: `${trip.order?.origin ?? "?"} → ${trip.order?.destination ?? "?"}`,
      updated: trip.updatedAt.toLocaleString(),
      reasons,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Exception board</h1>
        <Link href="/fleet/map" className="text-sm text-sky-300 hover:text-sky-200">
          View fleet map →
        </Link>
      </div>
      <div className="grid gap-4">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{row.order}</p>
                <p className="text-xs text-amber-200">{row.lane}</p>
              </div>
              <Link
                href={`/trips/${row.id}/track`}
                className="rounded-lg border border-amber-400/40 px-4 py-2 text-xs uppercase tracking-wide text-amber-200 hover:bg-amber-500/10"
              >
                Open trip
              </Link>
            </div>
            <p className="mt-3 text-xs text-amber-200">Updated {row.updated}</p>
            <ul className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-amber-200">
              {row.reasons.map((reason) => (
                <li key={reason} className="rounded-full border border-amber-400/40 px-3 py-1">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm text-zinc-400">No exceptions.</div>
        )}
      </div>
    </div>
  );
}
