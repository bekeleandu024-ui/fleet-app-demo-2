"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export async function createDriver(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  const type = formData.get("type")?.toString().trim() || "";
  const license = formData.get("license")?.toString().trim() || "";
  const homeBase = formData.get("homeBase")?.toString().trim() || "";
  const active = formData.get("active") === "on" || formData.get("active") === "true";

  if (!name) {
    throw new Error("Driver name is required.");
  }

  await prisma.driver.create({
    data: {
      name,
      type: type || null,
      license: license || null,
      homeBase: homeBase || null,
      active,
    },
  });

  redirect("/drivers");
}
