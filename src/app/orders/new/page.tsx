import Link from "next/link";

import { createOrder } from "./actions";

export default function NewOrderPage() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">New Order</h1>
          <Link
            href="/orders"
            className="text-sm text-zinc-300 hover:text-white"
          >
            Cancel
          </Link>
        </div>

        <form action={createOrder} className="grid gap-4 rounded-lg border border-zinc-800 p-4 text-sm">
          <div className="grid gap-1">
            <label htmlFor="customer" className="font-medium text-zinc-300">
              Customer
            </label>
            <input
              id="customer"
              name="customer"
              required
              className="rounded border border-zinc-800 bg-black p-2 text-white"
              placeholder="Acme Logistics"
            />
          </div>

          <div className="grid gap-1">
            <label htmlFor="origin" className="font-medium text-zinc-300">
              Origin
            </label>
            <input
              id="origin"
              name="origin"
              required
              className="rounded border border-zinc-800 bg-black p-2 text-white"
              placeholder="Chicago, IL"
            />
          </div>

          <div className="grid gap-1">
            <label htmlFor="destination" className="font-medium text-zinc-300">
              Destination
            </label>
            <input
              id="destination"
              name="destination"
              required
              className="rounded border border-zinc-800 bg-black p-2 text-white"
              placeholder="Dallas, TX"
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-1">
              <label htmlFor="puWindowStart" className="font-medium text-zinc-300">
                Pickup Window Start
              </label>
              <input
                id="puWindowStart"
                name="puWindowStart"
                type="datetime-local"
                className="rounded border border-zinc-800 bg-black p-2 text-white"
              />
            </div>
            <div className="grid gap-1">
              <label htmlFor="puWindowEnd" className="font-medium text-zinc-300">
                Pickup Window End
              </label>
              <input
                id="puWindowEnd"
                name="puWindowEnd"
                type="datetime-local"
                className="rounded border border-zinc-800 bg-black p-2 text-white"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-1">
              <label htmlFor="delWindowStart" className="font-medium text-zinc-300">
                Delivery Window Start
              </label>
              <input
                id="delWindowStart"
                name="delWindowStart"
                type="datetime-local"
                className="rounded border border-zinc-800 bg-black p-2 text-white"
              />
            </div>
            <div className="grid gap-1">
              <label htmlFor="delWindowEnd" className="font-medium text-zinc-300">
                Delivery Window End
              </label>
              <input
                id="delWindowEnd"
                name="delWindowEnd"
                type="datetime-local"
                className="rounded border border-zinc-800 bg-black p-2 text-white"
              />
            </div>
          </div>

          <div className="grid gap-1">
            <label htmlFor="requiredTruck" className="font-medium text-zinc-300">
              Required Truck
            </label>
            <input
              id="requiredTruck"
              name="requiredTruck"
              className="rounded border border-zinc-800 bg-black p-2 text-white"
              placeholder="53' Dry Van"
            />
          </div>

          <div className="grid gap-1">
            <label htmlFor="notes" className="font-medium text-zinc-300">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="rounded border border-zinc-800 bg-black p-2 text-white"
            />
          </div>

          <button
            type="submit"
            className="mt-2 inline-flex w-fit items-center justify-center rounded border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-black"
          >
            Create Order
          </button>
        </form>
      </div>
    </div>
  );
}
