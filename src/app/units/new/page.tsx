import Link from "next/link";
import UnitForm from "../unit-form";
import { createUnit } from "./actions";

export default function NewUnitPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/units" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Back to units
      </Link>
      <h1 className="text-2xl font-semibold text-white">New Unit</h1>
      <UnitForm action={createUnit} submitLabel="Create Unit" />
    </div>
  );
}
