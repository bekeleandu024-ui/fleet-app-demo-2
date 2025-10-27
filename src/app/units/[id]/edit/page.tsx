import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import UnitForm from "../../unit-form";
import prisma from "@/lib/prisma";

async function updateUnit(id: string, formData: FormData) {
  "use server";

  const code = formData.get("code")?.toString().trim();
  if (!code) {
    throw new Error("Code is required");
  }

  await prisma.unit.update({
    where: { id },
    data: {
      code,
      type: formData.get("type")?.toString().trim() || null,
      homeBase: formData.get("homeBase")?.toString().trim() || null,
      active: formData.get("active") === "on",
    },
  });

  redirect("/units");
}

export default async function EditUnitPage({ params }: { params: { id: string } }) {
  const unit = await prisma.unit.findUnique({ where: { id: params.id } });
  if (!unit) {
    notFound();
  }

  async function action(formData: FormData) {
    "use server";
    await updateUnit(params.id, formData);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/units" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Back to units
        </Link>
      </div>
      <UnitForm
        initialValues={{
          code: unit.code,
          type: unit.type ?? "",
          homeBase: unit.homeBase ?? "",
          active: unit.active,
        }}
        action={action}
        submitLabel="Save Unit"
      />
    </div>
  );
}
