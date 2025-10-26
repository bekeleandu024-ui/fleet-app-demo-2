'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

const parseDate = (value: FormDataEntryValue | null) => {
  if (!value) return undefined;
  const date = new Date(value.toString());
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseDecimal = (value: FormDataEntryValue | null) => {
  if (!value) return undefined;
  const str = value.toString();
  if (!str) return undefined;
  const number = Number(str);
  if (Number.isNaN(number)) return undefined;
  return new Prisma.Decimal(str);
};

export async function createTrip(orderId: string, formData: FormData) {
  const driver = formData.get('driver')?.toString() ?? '';
  const unit = formData.get('unit')?.toString() ?? '';
  const miles = parseDecimal(formData.get('miles'));

  if (!driver || !unit || !miles) {
    throw new Error('Driver, unit, and miles are required.');
  }

  await prisma.trip.create({
    data: {
      orderId,
      driver,
      unit,
      miles,
      revenue: parseDecimal(formData.get('revenue')),
      tripStart: parseDate(formData.get('tripStart')),
      tripEnd: parseDate(formData.get('tripEnd')),
      weekStart: parseDate(formData.get('weekStart')),
    },
  });

  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}
