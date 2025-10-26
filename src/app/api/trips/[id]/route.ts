import { NextResponse } from "next/server";
import { Prisma, type Trip } from "@prisma/client";
import { z } from "zod";
import { format } from "date-fns";
import prisma from "@/lib/prisma";

const tripSchema = z.object({
  driver: z.string().min(1),
  unit: z.string().min(1),
  miles: z.number().min(0),
  revenue: z.number().nullable().optional(),
  fixedCPM: z.number().nullable().optional(),
  wageCPM: z.number().nullable().optional(),
  addOnsCPM: z.number().nullable().optional(),
  rollingCPM: z.number().nullable().optional(),
  totalCPM: z.number().nullable().optional(),
  totalCost: z.number().nullable().optional(),
  profit: z.number().nullable().optional(),
  marginPct: z.number().nullable().optional(),
  type: z.string().nullable().optional(),
  zone: z.string().nullable().optional(),
  status: z.string().min(1),
  driverId: z.string().nullable().optional(),
  unitId: z.string().nullable().optional(),
  rateId: z.string().nullable().optional(),
  tripStart: z.string().nullable().optional(),
  tripEnd: z.string().nullable().optional(),
});

const toDecimal = (value: number | null | undefined) =>
  value === null || value === undefined ? null : new Prisma.Decimal(value);

const toDate = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const toIsoInput = (value: Date | null | undefined) =>
  value ? format(value, "yyyy-MM-dd'T'HH:mm") : null;

const serializeTrip = (trip: Trip) => ({
  id: trip.id,
  driver: trip.driver,
  unit: trip.unit,
  miles: Number(trip.miles),
  revenue: trip.revenue ? Number(trip.revenue) : null,
  fixedCPM: trip.fixedCPM ? Number(trip.fixedCPM) : null,
  wageCPM: trip.wageCPM ? Number(trip.wageCPM) : null,
  addOnsCPM: trip.addOnsCPM ? Number(trip.addOnsCPM) : null,
  rollingCPM: trip.rollingCPM ? Number(trip.rollingCPM) : null,
  totalCPM: trip.totalCPM ? Number(trip.totalCPM) : null,
  totalCost: trip.totalCost ? Number(trip.totalCost) : null,
  profit: trip.profit ? Number(trip.profit) : null,
  marginPct: trip.marginPct ? Number(trip.marginPct) : null,
  type: trip.type,
  zone: trip.zone,
  status: trip.status,
  createdAt: trip.createdAt.toISOString(),
  updatedAt: trip.updatedAt.toISOString(),
  driverId: trip.driverId,
  unitId: trip.unitId,
  rateId: trip.rateId,
  tripStart: toIsoInput(trip.tripStart),
  tripEnd: toIsoInput(trip.tripEnd),
});

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const json = await request.json();
    const payload = tripSchema.parse(json);

    const trip = await prisma.trip.update({
      where: { id: params.id },
      data: {
        driver: payload.driver,
        unit: payload.unit,
        miles: toDecimal(payload.miles),
        revenue: toDecimal(payload.revenue ?? null),
        fixedCPM: toDecimal(payload.fixedCPM ?? null),
        wageCPM: toDecimal(payload.wageCPM ?? null),
        addOnsCPM: toDecimal(payload.addOnsCPM ?? null),
        rollingCPM: toDecimal(payload.rollingCPM ?? null),
        totalCPM: toDecimal(payload.totalCPM ?? null),
        totalCost: toDecimal(payload.totalCost ?? null),
        profit: toDecimal(payload.profit ?? null),
        marginPct: toDecimal(payload.marginPct ?? null),
        type: payload.type ?? null,
        zone: payload.zone ?? null,
        status: payload.status,
        driverId: payload.driverId ?? null,
        unitId: payload.unitId ?? null,
        rateId: payload.rateId ?? null,
        tripStart: toDate(payload.tripStart),
        tripEnd: toDate(payload.tripEnd),
      },
    });

    return NextResponse.json({ trip: serializeTrip(trip) });
  } catch (error: any) {
    const message = error?.message ?? "Unable to update trip";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
