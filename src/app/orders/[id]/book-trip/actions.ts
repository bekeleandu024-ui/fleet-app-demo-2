"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const toNumberOrNull = (value: FormDataEntryValue | null) => {
  if (!value) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const toDateOrNull = (value: FormDataEntryValue | null) => {
  if (!value) return null;
  const date = new Date(value.toString());
  return Number.isNaN(date.getTime()) ? null : date;
};

export async function createTrip(orderId: string, formData: FormData) {
  const driver = formData.get("driver")?.toString() ?? "";
  const unit = formData.get("unit")?.toString() ?? "";
  const miles = toNumberOrNull(formData.get("miles"));
  const revenue = toNumberOrNull(formData.get("revenue"));

  if (miles === null) {
    throw new Error("Miles is required");
  }

  await prisma.trip.create({
    data: {
      orderId,
      driver,
      unit,
      miles,
      revenue,
      tripStart: toDateOrNull(formData.get("tripStart")),
      tripEnd: toDateOrNull(formData.get("tripEnd")),
      weekStart: toDateOrNull(formData.get("weekStart")),
    },
  });

  redirect(`/orders/${orderId}`);
}
