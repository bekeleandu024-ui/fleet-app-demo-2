'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

type BookTripFormProps = {
  createTrip: (formData: FormData) => Promise<void>;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      disabled={pending}
    >
      {pending ? 'Booking...' : 'Book Trip'}
    </button>
  );
}

export default function BookTripForm({ createTrip }: BookTripFormProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (formData) => {
        try {
          setError(null);
          await createTrip(formData);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to book trip');
        }
      }}
      className="grid max-w-xl gap-4"
    >
      {error && <p className="rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-2">
        <label htmlFor="driver" className="text-sm font-medium text-gray-700">
          Driver
        </label>
        <input id="driver" name="driver" type="text" required className="rounded-lg border px-3 py-2" />
      </div>
      <div className="grid gap-2">
        <label htmlFor="unit" className="text-sm font-medium text-gray-700">
          Unit
        </label>
        <input id="unit" name="unit" type="text" required className="rounded-lg border px-3 py-2" />
      </div>
      <div className="grid gap-2">
        <label htmlFor="miles" className="text-sm font-medium text-gray-700">
          Miles
        </label>
        <input id="miles" name="miles" type="number" step="0.1" min="0" required className="rounded-lg border px-3 py-2" />
      </div>
      <div className="grid gap-2">
        <label htmlFor="revenue" className="text-sm font-medium text-gray-700">
          Revenue
        </label>
        <input id="revenue" name="revenue" type="number" step="0.01" min="0" className="rounded-lg border px-3 py-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="tripStart" className="text-sm font-medium text-gray-700">
            Trip Start
          </label>
          <input id="tripStart" name="tripStart" type="datetime-local" className="rounded-lg border px-3 py-2" />
        </div>
        <div className="grid gap-2">
          <label htmlFor="tripEnd" className="text-sm font-medium text-gray-700">
            Trip End
          </label>
          <input id="tripEnd" name="tripEnd" type="datetime-local" className="rounded-lg border px-3 py-2" />
        </div>
      </div>
      <div className="grid gap-2">
        <label htmlFor="weekStart" className="text-sm font-medium text-gray-700">
          Week Start
        </label>
        <input id="weekStart" name="weekStart" type="date" className="rounded-lg border px-3 py-2" />
      </div>
      <SubmitButton />
    </form>
  );
}
