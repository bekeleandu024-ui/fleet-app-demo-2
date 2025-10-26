import Link from 'next/link';
import { createTrip } from './actions';
import BookTripForm from './BookTripForm';

export default function BookTripPage({ params }: { params: { id: string } }) {
  const createTripForOrder = createTrip.bind(null, params.id);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Book Trip</h1>
        <Link href={`/orders/${params.id}`} className="text-sm text-blue-600 hover:underline">
          Back to Order
        </Link>
      </div>
      <BookTripForm createTrip={createTripForOrder} />
    </div>
  );
}
