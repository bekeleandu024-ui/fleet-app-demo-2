import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

const formatDate = (date: Date | null | undefined) => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const toNumber = (value: Prisma.Decimal | number | null | undefined) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const number = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(number)) {
    return undefined;
  }

  return number;
};

const formatCurrency = (value: Prisma.Decimal | number | null | undefined) => {
  const number = toNumber(value);
  if (number === undefined) return '—';
  if (Number.isNaN(number)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(number);
};

const formatMiles = (value: Prisma.Decimal | number | null | undefined) => {
  const number = toNumber(value);
  if (number === undefined) return '—';
  return `${number.toFixed(1)} mi`;
};

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { trips: true },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Order Details</h1>
          <p className="text-sm text-gray-500">Created {formatDate(order.createdAt)}</p>
        </div>
        <Link
          href={`/orders/${order.id}/book-trip`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Book Trip
        </Link>
      </div>

      <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium text-gray-500">Customer</h2>
          <p className="text-lg font-semibold">{order.customer}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500">Required Truck</h2>
          <p className="text-lg font-semibold">{order.requiredTruck ?? '—'}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500">Origin</h2>
          <p className="text-lg font-semibold">{order.origin}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500">Destination</h2>
          <p className="text-lg font-semibold">{order.destination}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500">Pickup Window</h2>
          <p className="text-lg font-semibold">
            {formatDate(order.puWindowStart)} – {formatDate(order.puWindowEnd)}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500">Delivery Window</h2>
          <p className="text-lg font-semibold">
            {formatDate(order.delWindowStart)} – {formatDate(order.delWindowEnd)}
          </p>
        </div>
        {order.notes && (
          <div className="md:col-span-2">
            <h2 className="text-sm font-medium text-gray-500">Notes</h2>
            <p className="text-lg">{order.notes}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Trips</h2>
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Driver</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Unit</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Miles</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {order.trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{trip.driver}</td>
                  <td className="px-4 py-3">{trip.unit}</td>
                  <td className="px-4 py-3">{formatMiles(trip.miles)}</td>
                  <td className="px-4 py-3">{formatCurrency(trip.revenue)}</td>
                </tr>
              ))}
              {order.trips.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={4}>
                    No trips booked yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
