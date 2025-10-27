import Link from "next/link";
import prisma from "@/lib/prisma";
import DriverForm from "../../driver-form";
import { updateDriver } from "./actions";

export default async function EditDriverPage({ params }: { params: { id: string } }) {
  const driver = await prisma.driver.findUnique({ where: { id: params.id } });

  if (!driver) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm text-zinc-400">Driver not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/drivers" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Back to drivers
      </Link>
      <h1 className="text-2xl font-semibold text-white">Edit Driver</h1>
      <DriverForm
        initialValues={{
          name: driver.name,
          license: driver.license ?? "",
          homeBase: driver.homeBase ?? "",
          active: driver.active,
        }}
        action={updateDriver.bind(null, driver.id)}
        submitLabel="Save Driver"
      />
    </div>
  );
}
