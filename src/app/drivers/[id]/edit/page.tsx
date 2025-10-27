import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DriverForm from "../../driver-form";
import prisma from "@/lib/prisma";

async function updateDriver(id: string, formData: FormData) {
  "use server";

  const name = formData.get("name")?.toString().trim();
  if (!name) {
    throw new Error("Name is required");
  }

  await prisma.driver.update({
    where: { id },
    data: {
      name,
      license: formData.get("license")?.toString().trim() || null,
      homeBase: formData.get("homeBase")?.toString().trim() || null,
      active: formData.get("active") === "on",
    },
  });

  redirect("/drivers");
}

export default async function EditDriverPage({ params }: { params: { id: string } }) {
  const driver = await prisma.driver.findUnique({ where: { id: params.id } });
  if (!driver) {
    notFound();
  }

  async function action(formData: FormData) {
    "use server";
    await updateDriver(params.id, formData);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/drivers" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Back to drivers
        </Link>
      </div>
      <DriverForm
        initialValues={{
          name: driver.name,
          license: driver.license ?? "",
          homeBase: driver.homeBase ?? "",
          active: driver.active,
        }}
        action={action}
        submitLabel="Save Driver"
      />
    </div>
  );
}
