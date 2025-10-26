import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export default async function EditDriverPage({ params }: { params: { id: string } }) {
  const driver = await prisma.driver.findUnique({ where: { id: params.id } });
  if (!driver) {
    notFound();
  }

  async function updateDriver(formData: FormData) {
    "use server";
    const name = (formData.get("name") as string | null)?.trim();
    if (!name) {
      throw new Error("Name is required");
    }
    const homeBase = (formData.get("homeBase") as string | null)?.trim() || null;
    const license = (formData.get("license") as string | null)?.trim() || null;
    const active = formData.get("active") === "on";

    await prisma.driver.update({
      where: { id: params.id },
      data: {
        name,
        homeBase,
        license,
        active,
      },
    });

    revalidatePath("/drivers");
    redirect("/drivers");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Edit driver</h1>
        <Link href="/drivers" className="text-sm text-blue-600 hover:text-blue-700">
          Back to drivers
        </Link>
      </div>
      <form action={updateDriver} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="text-sm font-semibold text-slate-700" htmlFor="name">
            Name<span className="ml-1 text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            defaultValue={driver.name}
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700" htmlFor="homeBase">
              Home base
            </label>
            <input
              id="homeBase"
              name="homeBase"
              defaultValue={driver.homeBase ?? ""}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700" htmlFor="license">
              License
            </label>
            <input
              id="license"
              name="license"
              defaultValue={driver.license ?? ""}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="active"
            defaultChecked={driver.active}
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
