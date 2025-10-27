import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import prisma from "@/src/lib/prisma";

const stopSchema = z.object({
  stopType: z.enum(["PICKUP", "DELIVERY", "DROP_HOOK", "BORDER", "OTHER"]),
  name: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postal: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lon: z.number().optional().nullable(),
});

const bookingSchema = z.object({
  orderId: z.string().min(1),
  driverId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  rateId: z.string().optional().nullable(),
  driverName: z.string().min(1),
  unitCode: z.string().min(1),
  tripType: z.string().optional().nullable(),
  tripZone: z.string().optional().nullable(),
  miles: z.number().positive(),
  rpm: z.number().nonnegative(),
  fuelSurcharge: z.number().nonnegative(),
  addOns: z.number().nonnegative(),
  totalCpm: z.number().nonnegative().optional().nullable(),
  total: z.number().nonnegative(),
  aiReason: z.string().optional().nullable(),
  aiHighlights: z.array(z.string()).optional().nullable(),
  aiDiagnostics: z.unknown().optional().nullable(),
  stops: z.array(stopSchema).min(1),
});

function toDecimal(value: number | null | undefined) {
  return value == null ? null : new Prisma.Decimal(value);
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const messages = Object.values(fieldErrors)
      .flat()
      .filter((value): value is string => Boolean(value));
    const message = messages.length ? messages.join(", ") : "Validation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const data = parsed.data;

  const driverName = data.driverName.trim();
  const unitCode = data.unitCode.trim();
  const suggestionContext = data.aiDiagnostics
    ? { diagnostics: data.aiDiagnostics, highlights: data.aiHighlights ?? [] }
    : data.aiHighlights
      ? { diagnostics: null, highlights: data.aiHighlights }
      : null;
  const suggestionJson = suggestionContext ? JSON.stringify(suggestionContext) : null;
  const reason = data.aiReason?.trim() || null;

  const stopsPayload = data.stops.map((stop) => {
    const scheduledAt = stop.scheduledAt ? new Date(stop.scheduledAt) : null;
    const scheduledAtValue = scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt : null;
    return {
      stopType: stop.stopType,
      name: stop.name?.trim() || null,
      street: stop.street?.trim() || null,
      city: stop.city?.trim() || null,
      state: stop.state?.trim() || null,
      country: stop.country?.trim() || null,
      postal: stop.postal?.trim() || null,
      scheduledAt: scheduledAtValue,
      lat: typeof stop.lat === "number" && Number.isFinite(stop.lat) ? stop.lat : null,
      lon: typeof stop.lon === "number" && Number.isFinite(stop.lon) ? stop.lon : null,
    };
  });

  const trip = await prisma.$transaction(async (tx) => {
    const createdTrip = await tx.trip.create({
      data: {
        orderId: data.orderId,
        driverId: data.driverId ?? null,
        unitId: data.unitId ?? null,
        rateId: data.rateId ?? null,
        driver: driverName,
        unit: unitCode,
        type: data.tripType?.trim() || null,
        zone: data.tripZone?.trim() || null,
        miles: new Prisma.Decimal(data.miles),
        marketRPM: new Prisma.Decimal(data.rpm),
        fuelSurcharge: new Prisma.Decimal(data.fuelSurcharge),
        addOnsCPM: new Prisma.Decimal(data.addOns),
        totalCPM: toDecimal(data.totalCpm ?? null),
        revenue: new Prisma.Decimal(data.total),
        status: "Booked",
        lastSuggestedDriverId: data.driverId ?? null,
        lastSuggestedUnitId: data.unitId ?? null,
        lastSuggestedRateId: data.rateId ?? null,
        lastSuggestedPlan: suggestionJson,
        lastSuggestionReason: reason,
        lastSuggestedBy: "AI Dispatcher",
        lastSuggestionAt: new Date(),
      },
      include: {
        order: { select: { id: true, customer: true, origin: true, destination: true } },
      },
    });

    if (stopsPayload.length > 0) {
      await tx.tripStop.createMany({
        data: stopsPayload.map((stop, index) => ({
          tripId: createdTrip.id,
          seq: index + 1,
          stopType: stop.stopType,
          name: stop.name,
          street: stop.street,
          city: stop.city,
          state: stop.state,
          country: stop.country,
          postal: stop.postal,
          scheduledAt: stop.scheduledAt,
          lat: stop.lat,
          lon: stop.lon,
        })),
      });
    }

    await tx.order.update({
      where: { id: data.orderId },
      data: {
        status: "Booked",
        lastSuggestedDriverId: data.driverId ?? null,
        lastSuggestedUnitId: data.unitId ?? null,
        lastSuggestedRateId: data.rateId ?? null,
        lastSuggestedPlan: suggestionJson,
        lastSuggestionReason: reason,
        lastSuggestedBy: "AI Dispatcher",
        lastSuggestionAt: new Date(),
      },
    });

    return createdTrip;
  });

  const response = {
    id: trip.id,
    orderId: trip.orderId,
    driver: trip.driver,
    unit: trip.unit,
    type: trip.type,
    zone: trip.zone,
    status: trip.status,
    miles: Number(trip.miles),
    rpm: trip.marketRPM ? Number(trip.marketRPM) : null,
    fuelSurcharge: trip.fuelSurcharge ? Number(trip.fuelSurcharge) : null,
    addOns: trip.addOnsCPM ? Number(trip.addOnsCPM) : null,
    totalCpm: trip.totalCPM ? Number(trip.totalCPM) : null,
    revenue: trip.revenue ? Number(trip.revenue) : null,
    order: trip.order,
  };

  return NextResponse.json({ ok: true, trip: response });
}
