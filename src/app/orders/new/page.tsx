import Link from "next/link";
import NewOrderForm from "./NewOrderForm";
import { createOrder } from "./actions";

export default function NewOrderPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/orders" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Back to orders
        </Link>
      </div>
      <NewOrderForm createOrder={createOrder} />
    </div>
  );
}
