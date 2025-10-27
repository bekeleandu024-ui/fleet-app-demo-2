"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

function parseNumber(value: FormDataEntryValue | null) {
  if (value === null || value === undefined) return null;
  const asString = value.toString().trim();
  if (!asString) return null;
  const number = Number(asString);
  return Number.isNaN(number) ? null : number;
}

function parseDateTime(value: FormDataEntryValue | null) {
  if (!value) return null;
  const parsed = new Date(value.toString());
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export async function updateTrip(tripId: string, formData: FormData) {
  const driver = formData.get("driver")?.toString().trim() ?? "";
  const unit = formData.get("unit")?.toString().trim() ?? "";
  const driverId = formData.get("driverId")?.toString().trim() || null;
  const unitId = formData.get("unitId")?.toString().trim() || null;
  const rateId = formData.get("rateId")?.toString().trim() || null;
  const status = formData.get("status")?.toString().trim() || "Created";
  const orderId = formData.get("orderId")?.toString().trim() || null;

  const miles = parseNumber(formData.get("miles"));
  if (miles === null) {
    throw new Error("Miles is required.");
  }

  const revenue = parseNumber(formData.get("revenue"));
  const fixedCPM = parseNumber(formData.get("fixedCPM"));
  const wageCPM = parseNumber(formData.get("wageCPM"));
  const addOnsCPM = parseNumber(formData.get("addOnsCPM"));
  const rollingCPM = parseNumber(formData.get("rollingCPM"));
  const totalCPM = parseNumber(formData.get("totalCPM"));
  const totalCost = parseNumber(formData.get("totalCost"));
  const profit = parseNumber(formData.get("profit"));
  const marginPct = parseNumber(formData.get("marginPct"));

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      driver,
      unit,
      driverId,
      unitId,
      rateId,
      status,
      miles,
      revenue,
      fixedCPM,
      wageCPM,
      addOnsCPM,
      rollingCPM,
      totalCPM,
      totalCost,
      profit,
      marginPct,
      tripStart: parseDateTime(formData.get("tripStart")),
      tripEnd: parseDateTime(formData.get("tripEnd")),
      weekStart: parseDateTime(formData.get("weekStart")),
    },
  });

  if (orderId) {
    redirect(`/orders/${orderId}`);
  }

  redirect("/orders");
}
