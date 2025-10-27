import Link from "next/link";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import UnitForm from "../unit-form";
import prisma from "@/lib/prisma";

async function createUnit(formData: FormData) {
  "use server";

  const code = formData.get("code")?.toString().trim();
  if (!code) {
    throw new Error("Code is required");
  }

  const weeklyFixedCostInput = formData.get("weeklyFixedCost");
  let weeklyFixedCost = 0;
  if (weeklyFixedCostInput !== null && weeklyFixedCostInput !== "") {
    const parsed = Number(weeklyFixedCostInput);
    if (Number.isNaN(parsed)) {
      throw new Error("Weekly fixed cost must be a number");
    }
    weeklyFixedCost = parsed;
  }

  await prisma.unit.create({
    data: {
      code,
      type: formData.get("type")?.toString().trim() || null,
      homeBase: formData.get("homeBase")?.toString().trim() || null,
      active: formData.get("active") === "on",
      weeklyFixedCost: new Prisma.Decimal(weeklyFixedCost),
    },
  });

  redirect("/units");
}

export default function NewUnitPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/units" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Back to units
        </Link>
      </div>
      <UnitForm action={createUnit} submitLabel="Create Unit" />
    </div>
  );
}
