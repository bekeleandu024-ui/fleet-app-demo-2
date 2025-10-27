"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { recalcTripCosting } from "@/server/recalcTripCosting";

export async function logDriverEvent({
  tripId,
  eventType,
  stopId,
  lat,
  lon,
  odometer,
}: {
  tripId: string;
  eventType: string;
  stopId?: string | null;
  lat?: number | null;
  lon?: number | null;
  odometer?: number | null;
}) {
  await prisma.event.create({
    data: {
      tripId,
      type: eventType,
      at: new Date(),
      stopId: stopId ?? null,
      lat: typeof lat === "number" && Number.isFinite(lat) ? lat : null,
      lon: typeof lon === "number" && Number.isFinite(lon) ? lon : null,
      notes:
        typeof odometer === "number" && Number.isFinite(odometer)
          ? `Odometer: ${odometer.toFixed(1)} mi`
          : null,
    },
  });

  await recalcTripCosting(tripId);

  revalidatePath(`/drivers/logs/${tripId}`);
}
