import Link from "next/link";
import DriverForm from "../driver-form";
import { createDriver } from "./actions";

export default function NewDriverPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/drivers" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Back to drivers
      </Link>
      <h1 className="text-2xl font-semibold text-white">New Driver</h1>
      <DriverForm action={createDriver} submitLabel="Create Driver" />
    </div>
  );
}
