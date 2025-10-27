import Link from "next/link";
import { redirect } from "next/navigation";
import DriverForm from "../driver-form";
import prisma from "@/lib/prisma";

async function createDriver(formData: FormData) {
  "use server";

  const name = formData.get("name")?.toString().trim();
  if (!name) {
    throw new Error("Name is required");
  }

  await prisma.driver.create({
    data: {
      name,
      type: formData.get("type")?.toString().trim() || null,
      license: formData.get("license")?.toString().trim() || null,
      homeBase: formData.get("homeBase")?.toString().trim() || null,
      active: formData.get("active") === "on",
    },
  });

  redirect("/drivers");
}

export default function NewDriverPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/drivers" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Back to drivers
        </Link>
      </div>
      <DriverForm action={createDriver} submitLabel="Create Driver" />
    </div>
  );
}
