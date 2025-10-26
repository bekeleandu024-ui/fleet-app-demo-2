'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

const parseDate = (value: FormDataEntryValue | null) => {
  if (!value) return undefined;
  const date = new Date(value.toString());
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export async function createOrder(formData: FormData) {
  const customer = formData.get('customer')?.toString() ?? '';
  const origin = formData.get('origin')?.toString() ?? '';
  const destination = formData.get('destination')?.toString() ?? '';

  if (!customer || !origin || !destination) {
    throw new Error('Customer, origin, and destination are required.');
  }

  await prisma.order.create({
    data: {
      customer,
      origin,
      destination,
      puWindowStart: parseDate(formData.get('puWindowStart')),
      puWindowEnd: parseDate(formData.get('puWindowEnd')),
      delWindowStart: parseDate(formData.get('delWindowStart')),
      delWindowEnd: parseDate(formData.get('delWindowEnd')),
      requiredTruck: formData.get('requiredTruck')?.toString() || undefined,
      notes: formData.get('notes')?.toString() || undefined,
    },
  });

  revalidatePath('/orders');
  redirect('/orders');
}
