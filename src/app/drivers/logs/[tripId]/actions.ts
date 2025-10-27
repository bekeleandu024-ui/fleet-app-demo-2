"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { recalcTripCosting } from "@/server/recalcTripCosting";

export async function logDriverEvent({
  tripId,
  eventType,
}: {
  tripId: string;
  eventType: string;
}) {
  await prisma.event.create({
    data: {
      tripId,
      type: eventType,
      at: new Date(),
    },
  });

  await recalcTripCosting(tripId);

  revalidatePath(`/drivers/logs/${tripId}`);
}
