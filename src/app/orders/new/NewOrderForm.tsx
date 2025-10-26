'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

type NewOrderFormProps = {
  createOrder: (formData: FormData) => Promise<void>;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      disabled={pending}
    >
      {pending ? 'Creating...' : 'Create Order'}
    </button>
  );
}

export default function NewOrderForm({ createOrder }: NewOrderFormProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (formData) => {
        try {
          setError(null);
          await createOrder(formData);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to create order');
        }
      }}
      className="grid max-w-xl gap-4"
    >
      {error && <p className="rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-2">
        <label htmlFor="customer" className="text-sm font-medium text-gray-700">
          Customer
        </label>
        <input
          id="customer"
          name="customer"
          type="text"
          required
          className="rounded-lg border px-3 py-2"
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="origin" className="text-sm font-medium text-gray-700">
          Origin
        </label>
        <input id="origin" name="origin" type="text" required className="rounded-lg border px-3 py-2" />
      </div>
      <div className="grid gap-2">
        <label htmlFor="destination" className="text-sm font-medium text-gray-700">
          Destination
        </label>
        <input
          id="destination"
          name="destination"
          type="text"
          required
          className="rounded-lg border px-3 py-2"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="puWindowStart" className="text-sm font-medium text-gray-700">
            Pickup Window Start
          </label>
          <input id="puWindowStart" name="puWindowStart" type="datetime-local" className="rounded-lg border px-3 py-2" />
        </div>
        <div className="grid gap-2">
          <label htmlFor="puWindowEnd" className="text-sm font-medium text-gray-700">
            Pickup Window End
          </label>
          <input id="puWindowEnd" name="puWindowEnd" type="datetime-local" className="rounded-lg border px-3 py-2" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="delWindowStart" className="text-sm font-medium text-gray-700">
            Delivery Window Start
          </label>
          <input id="delWindowStart" name="delWindowStart" type="datetime-local" className="rounded-lg border px-3 py-2" />
        </div>
        <div className="grid gap-2">
          <label htmlFor="delWindowEnd" className="text-sm font-medium text-gray-700">
            Delivery Window End
          </label>
          <input id="delWindowEnd" name="delWindowEnd" type="datetime-local" className="rounded-lg border px-3 py-2" />
        </div>
      </div>
      <div className="grid gap-2">
        <label htmlFor="requiredTruck" className="text-sm font-medium text-gray-700">
          Required Truck
        </label>
        <input id="requiredTruck" name="requiredTruck" type="text" className="rounded-lg border px-3 py-2" />
      </div>
      <div className="grid gap-2">
        <label htmlFor="notes" className="text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={4} className="rounded-lg border px-3 py-2" />
      </div>
      <SubmitButton />
    </form>
  );
}
