"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

function toDateOrNull(value: FormDataEntryValue | null) {
  if (!value) return null;
  const parsed = new Date(value.toString());
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export async function createOrder(formData: FormData) {
  const customer = formData.get("customer")?.toString().trim();
  const origin = formData.get("origin")?.toString().trim();
  const destination = formData.get("destination")?.toString().trim();

  if (!customer || !origin || !destination) {
    throw new Error("Customer, origin, and destination are required.");
  }

  await prisma.order.create({
    data: {
      customer,
      origin,
      destination,
      puWindowStart: toDateOrNull(formData.get("puWindowStart")),
      puWindowEnd: toDateOrNull(formData.get("puWindowEnd")),
      delWindowStart: toDateOrNull(formData.get("delWindowStart")),
      delWindowEnd: toDateOrNull(formData.get("delWindowEnd")),
      requiredTruck: formData.get("requiredTruck")?.toString().trim() || null,
      notes: formData.get("notes")?.toString().trim() || null,
    },
  });

  redirect("/orders");
}
