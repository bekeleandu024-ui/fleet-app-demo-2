"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const toDateOrNull = (value: FormDataEntryValue | null) => {
  if (!value) return null;
  const date = new Date(value.toString());
  return Number.isNaN(date.getTime()) ? null : date;
};

export async function createOrder(formData: FormData) {
  const customer = formData.get("customer")?.toString() ?? "";
  const origin = formData.get("origin")?.toString() ?? "";
  const destination = formData.get("destination")?.toString() ?? "";

  await prisma.order.create({
    data: {
      customer,
      origin,
      destination,
      puWindowStart: toDateOrNull(formData.get("puWindowStart")),
      puWindowEnd: toDateOrNull(formData.get("puWindowEnd")),
      delWindowStart: toDateOrNull(formData.get("delWindowStart")),
      delWindowEnd: toDateOrNull(formData.get("delWindowEnd")),
      requiredTruck: formData.get("requiredTruck")?.toString() || null,
      notes: formData.get("notes")?.toString() || null,
    },
  });

  redirect("/orders");
}
