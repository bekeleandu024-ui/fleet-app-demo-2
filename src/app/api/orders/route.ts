import { NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { analyzeOrderForIssues } from "@/server/analyze-order";

const orderSchema = z.object({
  customer: z.string().min(1, "Customer is required"),
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  puWindowStart: z.string().optional().nullable(),
  puWindowEnd: z.string().optional().nullable(),
  delWindowStart: z.string().optional().nullable(),
  delWindowEnd: z.string().optional().nullable(),
  requiredTruck: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
});

function toDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const result = orderSchema.safeParse(json);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const messages = Object.values(fieldErrors)
      .flat()
      .filter((value): value is string => Boolean(value));
    const message = messages.length ? messages.join(", ") : "Validation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const data = result.data;

  const analysis = await analyzeOrderForIssues({
    customer: data.customer,
    origin: data.origin,
    destination: data.destination,
    puWindowStart: data.puWindowStart,
    puWindowEnd: data.puWindowEnd,
    delWindowStart: data.delWindowStart,
    delWindowEnd: data.delWindowEnd,
    requiredTruck: data.requiredTruck,
    notes: data.notes,
  });

  const status = analysis.missingFields.length === 0 ? "Qualified" : "PendingInfo";
  const qualificationNotes = [
    analysis.summary.textSummary,
    analysis.slaWarnings.join("; "),
    analysis.blacklistHits.join("; "),
    analysis.borderWarnings.join("; "),
  ]
    .filter(Boolean)
    .join(" | ");

  const order = await prisma.order.create({
    data: {
      customer: data.customer,
      origin: data.origin,
      destination: data.destination,
      puWindowStart: toDate(data.puWindowStart),
      puWindowEnd: toDate(data.puWindowEnd),
      delWindowStart: toDate(data.delWindowStart),
      delWindowEnd: toDate(data.delWindowEnd),
      requiredTruck: data.requiredTruck?.trim() || null,
      notes: data.notes?.trim() || null,
      status,
      source: data.source?.trim() || null,
      qualificationNotes: qualificationNotes || null,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      orderId: order.id,
      status,
    },
    { status: 201 }
  );
}
