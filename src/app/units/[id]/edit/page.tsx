import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export default async function EditUnitPage({ params }: { params: { id: string } }) {
  const unit = await prisma.unit.findUnique({ where: { id: params.id } });
  if (!unit) {
    notFound();
  }

  async function updateUnit(formData: FormData) {
    "use server";
    const code = (formData.get("code") as string | null)?.trim();
    if (!code) {
      throw new Error("Code is required");
    }
    const type = (formData.get("type") as string | null)?.trim() || null;
    const homeBase = (formData.get("homeBase") as string | null)?.trim() || null;
    const active = formData.get("active") === "on";

    await prisma.unit.update({
      where: { id: params.id },
      data: {
        code,
        type,
        homeBase,
        active,
      },
    });

    revalidatePath("/units");
    redirect("/units");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Edit unit</h1>
        <Link href="/units" className="text-sm text-blue-600 hover:text-blue-700">
          Back to units
        </Link>
      </div>
      <form action={updateUnit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="text-sm font-semibold text-slate-700" htmlFor="code">
            Code<span className="ml-1 text-red-500">*</span>
          </label>
          <input
            id="code"
            name="code"
            defaultValue={unit.code}
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700" htmlFor="type">
              Type
            </label>
            <input
              id="type"
              name="type"
              defaultValue={unit.type ?? ""}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700" htmlFor="homeBase">
              Home base
            </label>
            <input
              id="homeBase"
              name="homeBase"
              defaultValue={unit.homeBase ?? ""}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="active"
            defaultChecked={unit.active}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Active
        </label>
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
