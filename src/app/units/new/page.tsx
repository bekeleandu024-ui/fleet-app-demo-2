import Link from "next/link";
import { redirect } from "next/navigation";
import UnitForm from "../unit-form";
import prisma from "@/lib/prisma";

async function createUnit(formData: FormData) {
  "use server";

  const code = formData.get("code")?.toString().trim();
  if (!code) {
    throw new Error("Code is required");
  }

  await prisma.unit.create({
    data: {
      code,
      type: formData.get("type")?.toString().trim() || null,
      homeBase: formData.get("homeBase")?.toString().trim() || null,
      active: formData.get("active") === "on",
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
