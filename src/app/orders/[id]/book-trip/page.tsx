import Link from "next/link";
import prisma from "@/lib/prisma";
import BookTripForm from "./BookTripForm";
import { createTrip } from "./actions";

export default async function BookTripPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({ where: { id: params.id } });

  if (!order) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm text-zinc-400">Order not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={`/orders/${order.id}`} className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Back to order
        </Link>
        <h1 className="text-2xl font-semibold text-white">Book Trip for {order.customer}</h1>
        <p className="text-sm text-zinc-400">
          {order.origin} → {order.destination}
        </p>
      </div>
      <BookTripForm createTrip={createTrip.bind(null, order.id)} />
    </div>
  );
}
