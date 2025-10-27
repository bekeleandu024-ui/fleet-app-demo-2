import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";

const numericField = z.number().nullable();

const bodySchema = z.object({
  driverId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  rateId: z.string().optional().nullable(),
  driver: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  status: z.string().min(1),
  miles: z.number(),
  revenue: numericField,
  fixedCPM: numericField,
  wageCPM: numericField,
  addOnsCPM: numericField,
  rollingCPM: numericField,
  totalCPM: numericField,
  totalCost: numericField,
  profit: numericField,
  marginPct: numericField,
});

function toDecimal(value: number | null) {
  return value === null || value === undefined ? null : new Prisma.Decimal(value);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  const paramsOrPromise = context.params;
  const params = paramsOrPromise instanceof Promise ? await paramsOrPromise : paramsOrPromise;
  const { id } = params ?? {};
  if (!id) {
    return NextResponse.json({ error: "Trip id is required" }, { status: 400 });
  }
  const json = await request.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const messages = Object.values(fieldErrors)
      .flat()
      .filter((value): value is string => Boolean(value));
    const message = messages.length ? messages.join(", ") : "Validation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const data = parsed.data;

  let driverName = data.driver?.trim() || null;
  if (!driverName && data.driverId) {
    const driver = await prisma.driver.findUnique({ where: { id: data.driverId }, select: { name: true } });
    driverName = driver?.name ?? null;
  }

  let unitCode = data.unit?.trim() || null;
  if (!unitCode && data.unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: data.unitId }, select: { code: true } });
    unitCode = unit?.code ?? null;
  }

  if (!driverName) {
    driverName = "Unassigned";
  }
  if (!unitCode) {
    unitCode = "Unassigned";
  }

  const updated = await prisma.trip.update({
    where: { id },
    data: {
      driverId: data.driverId ?? null,
      unitId: data.unitId ?? null,
      rateId: data.rateId ?? null,
      driver: driverName,
      unit: unitCode,
      type: data.type?.trim() || null,
      zone: data.zone?.trim() || null,
      status: data.status,
      miles: new Prisma.Decimal(data.miles),
      revenue: toDecimal(data.revenue),
      fixedCPM: toDecimal(data.fixedCPM),
      wageCPM: toDecimal(data.wageCPM),
      addOnsCPM: toDecimal(data.addOnsCPM),
      rollingCPM: toDecimal(data.rollingCPM),
      totalCPM: toDecimal(data.totalCPM),
      totalCost: toDecimal(data.totalCost),
      profit: toDecimal(data.profit),
      marginPct: toDecimal(data.marginPct),
    },
    include: {
      driverRef: { select: { id: true, name: true, type: true } },
      unitRef: { select: { id: true, code: true, weeklyFixedCost: true } },
      rateRef: { select: { id: true, type: true, zone: true } },
    },
  });

  const safeTrip = {
    id: updated.id,
    driver: updated.driver,
    unit: updated.unit,
    status: updated.status,
    type: updated.type,
    zone: updated.zone,
    miles: Number(updated.miles),
    revenue: updated.revenue ? Number(updated.revenue) : null,
    fixedCPM: updated.fixedCPM ? Number(updated.fixedCPM) : null,
    wageCPM: updated.wageCPM ? Number(updated.wageCPM) : null,
    addOnsCPM: updated.addOnsCPM ? Number(updated.addOnsCPM) : null,
    rollingCPM: updated.rollingCPM ? Number(updated.rollingCPM) : null,
    totalCPM: updated.totalCPM ? Number(updated.totalCPM) : null,
    totalCost: updated.totalCost ? Number(updated.totalCost) : null,
    profit: updated.profit ? Number(updated.profit) : null,
    marginPct: updated.marginPct ? Number(updated.marginPct) : null,
    driverRef: updated.driverRef,
    unitRef: updated.unitRef
      ? {
          ...updated.unitRef,
          weeklyFixedCost: updated.unitRef.weeklyFixedCost
            ? Number(updated.unitRef.weeklyFixedCost)
            : null,
        }
      : null,
    rateRef: updated.rateRef,
    driverType: updated.driverRef?.type ?? null,
    unitWeeklyFixedCost: updated.unitRef?.weeklyFixedCost
      ? Number(updated.unitRef.weeklyFixedCost)
      : null,
  };

  return NextResponse.json({ ok: true, trip: safeTrip });
}
