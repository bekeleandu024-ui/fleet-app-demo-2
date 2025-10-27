"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export async function createUnit(formData: FormData) {
  const code = formData.get("code")?.toString().trim();
  const type = formData.get("type")?.toString().trim() || "";
  const homeBase = formData.get("homeBase")?.toString().trim() || "";
  const active = formData.get("active") === "on" || formData.get("active") === "true";
  const weeklyFixedCostInput = formData.get("weeklyFixedCost");

  let weeklyFixedCost = 0;
  if (weeklyFixedCostInput !== null && weeklyFixedCostInput !== "") {
    const parsed = Number(weeklyFixedCostInput);
    if (Number.isNaN(parsed)) {
      throw new Error("Weekly fixed cost must be a number.");
    }
    weeklyFixedCost = parsed;
  }

  if (!code) {
    throw new Error("Unit code is required.");
  }

  await prisma.unit.create({
    data: {
      code,
      type: type || null,
      homeBase: homeBase || null,
      active,
      weeklyFixedCost: new Prisma.Decimal(weeklyFixedCost),
    },
  });

  redirect("/units");
}
