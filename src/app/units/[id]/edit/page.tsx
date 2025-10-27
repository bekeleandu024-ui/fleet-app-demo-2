import Link from "next/link";
import prisma from "@/lib/prisma";
import UnitForm from "../../unit-form";
import { updateUnit } from "./actions";

export default async function EditUnitPage({ params }: { params: { id: string } }) {
  const unit = await prisma.unit.findUnique({ where: { id: params.id } });

  if (!unit) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm text-zinc-400">Unit not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/units" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Back to units
      </Link>
      <h1 className="text-2xl font-semibold text-white">Edit Unit</h1>
      <UnitForm
        initialValues={{
          code: unit.code,
          type: unit.type ?? "",
          homeBase: unit.homeBase ?? "",
          active: unit.active,
        }}
        action={updateUnit.bind(null, unit.id)}
        submitLabel="Save Unit"
      />
    </div>
  );
}
