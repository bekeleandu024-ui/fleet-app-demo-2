"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export async function updateUnit(unitId: string, formData: FormData) {
  const code = formData.get("code")?.toString().trim();
  const type = formData.get("type")?.toString().trim() || "";
  const homeBase = formData.get("homeBase")?.toString().trim() || "";
  const active = formData.get("active") === "on" || formData.get("active") === "true";

  if (!code) {
    throw new Error("Unit code is required.");
  }

  await prisma.unit.update({
    where: { id: unitId },
    data: {
      code,
      type: type || null,
      homeBase: homeBase || null,
      active,
    },
  });

  redirect("/units");
}
