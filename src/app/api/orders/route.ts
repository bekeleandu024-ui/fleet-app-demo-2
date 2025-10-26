import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const orderSchema = z.object({
  customer: z.string().trim().min(1, "Customer is required"),
  origin: z.string().trim().min(1, "Origin is required"),
  destination: z.string().trim().min(1, "Destination is required"),
  puWindowStart: z.string().optional().nullable(),
  puWindowEnd: z.string().optional().nullable(),
  delWindowStart: z.string().optional().nullable(),
  delWindowEnd: z.string().optional().nullable(),
  requiredTruck: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = orderSchema.parse(json);

    const order = await prisma.order.create({
      data: {
        customer: payload.customer,
        origin: payload.origin,
        destination: payload.destination,
        puWindowStart: toDate(payload.puWindowStart),
        puWindowEnd: toDate(payload.puWindowEnd),
        delWindowStart: toDate(payload.delWindowStart),
        delWindowEnd: toDate(payload.delWindowEnd),
        requiredTruck: payload.requiredTruck?.trim() || null,
        notes: payload.notes?.trim() || null,
      },
    });

    return NextResponse.json({ order });
  } catch (error: any) {
    const message = error?.message ?? "Unable to create order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
