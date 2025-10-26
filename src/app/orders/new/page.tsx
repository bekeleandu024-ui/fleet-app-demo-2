import Link from 'next/link';
import { createOrder } from './actions';
import NewOrderForm from './NewOrderForm';

export default function NewOrderPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Order</h1>
        <Link href="/orders" className="text-sm text-blue-600 hover:underline">
          Back to Orders
        </Link>
      </div>
      <NewOrderForm createOrder={createOrder} />
    </div>
  );
}
