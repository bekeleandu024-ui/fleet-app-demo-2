"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

function toNumber(value: FormDataEntryValue | null) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

function toDate(value: FormDataEntryValue | null) {
  if (!value) return null;
  const parsed = new Date(value.toString());
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export async function createTrip(orderId: string, formData: FormData) {
  const driver = formData.get("driver")?.toString().trim();
  const unit = formData.get("unit")?.toString().trim();
  const miles = toNumber(formData.get("miles"));
  const revenue = toNumber(formData.get("revenue"));

  if (!driver || !unit) {
    throw new Error("Driver and unit are required.");
  }

  if (miles === null) {
    throw new Error("Miles is required.");
  }

  await prisma.trip.create({
    data: {
      orderId,
      driver,
      unit,
      miles,
      revenue,
      tripStart: toDate(formData.get("tripStart")),
      tripEnd: toDate(formData.get("tripEnd")),
      weekStart: toDate(formData.get("weekStart")),
      status: "Created",
    },
  });

  redirect(`/orders/${orderId}`);
}
