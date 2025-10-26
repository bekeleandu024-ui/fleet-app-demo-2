import Link from "next/link";

import { createTrip } from "./actions";

export default function BookTripPage({ params }: { params: { id: string } }) {
  const createTripForOrder = createTrip.bind(null, params.id);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Book Trip</h1>
          <Link
            href={`/orders/${params.id}`}
            className="text-sm text-zinc-300 hover:text-white"
          >
            Back to Order
          </Link>
        </div>

        <form action={createTripForOrder} className="grid gap-4 rounded-lg border border-zinc-800 p-4 text-sm">
          <div className="grid gap-1">
            <label htmlFor="driver" className="font-medium text-zinc-300">
              Driver
            </label>
            <input
              id="driver"
              name="driver"
              required
              className="rounded border border-zinc-800 bg-black p-2 text-white"
              placeholder="Driver name"
            />
          </div>

          <div className="grid gap-1">
            <label htmlFor="unit" className="font-medium text-zinc-300">
              Unit
            </label>
            <input
              id="unit"
              name="unit"
              required
              className="rounded border border-zinc-800 bg-black p-2 text-white"
              placeholder="Truck / trailer"
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-1">
              <label htmlFor="miles" className="font-medium text-zinc-300">
                Miles
              </label>
              <input
                id="miles"
                name="miles"
                type="number"
                step="0.1"
                required
                className="rounded border border-zinc-800 bg-black p-2 text-white"
              />
            </div>
            <div className="grid gap-1">
              <label htmlFor="revenue" className="font-medium text-zinc-300">
                Revenue
              </label>
              <input
                id="revenue"
                name="revenue"
                type="number"
                step="0.01"
                className="rounded border border-zinc-800 bg-black p-2 text-white"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-1">
              <label htmlFor="tripStart" className="font-medium text-zinc-300">
                Trip Start
              </label>
              <input
                id="tripStart"
                name="tripStart"
                type="datetime-local"
                className="rounded border border-zinc-800 bg-black p-2 text-white"
              />
            </div>
            <div className="grid gap-1">
              <label htmlFor="tripEnd" className="font-medium text-zinc-300">
                Trip End
              </label>
              <input
                id="tripEnd"
                name="tripEnd"
                type="datetime-local"
                className="rounded border border-zinc-800 bg-black p-2 text-white"
              />
            </div>
          </div>

          <div className="grid gap-1">
            <label htmlFor="weekStart" className="font-medium text-zinc-300">
              Week Start
            </label>
            <input
              id="weekStart"
              name="weekStart"
              type="date"
              className="rounded border border-zinc-800 bg-black p-2 text-white"
            />
          </div>

          <button
            type="submit"
            className="mt-2 inline-flex w-fit items-center justify-center rounded border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-black"
          >
            Save Trip
          </button>
        </form>
      </div>
    </div>
  );
}
