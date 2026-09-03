'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { validatedActionWithUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import {
  orders,
  OrderType,
} from '@/lib/db/schema';
import {
  createFuelRequestForUser,
  fuelRequestInputSchema
} from '@/lib/fuel-request-service';
import {
  createStoreOrderForUser,
  storeOrderInputSchema
} from '@/lib/store-order-service';

export const createFuelRequest = validatedActionWithUser(
  fuelRequestInputSchema,
  async (data, _, user) => {
    const result = await createFuelRequestForUser(data, user);

    if ('error' in result) {
      return result;
    }

    redirect(`/requests/${result.requestId}/demo-payment`);
  }
);

export async function submitFuelRequest(formData: FormData) {
  const result = await createFuelRequest({}, formData);

  if (result && typeof result === 'object' && 'error' in result && result.error) {
    redirect(`/book?error=${encodeURIComponent(result.error)}`);
  }
}

export const createStoreFirstOrder = validatedActionWithUser(
  storeOrderInputSchema,
  async (data, _, user) => {
    const result = await createStoreOrderForUser(data, user);

    if ('error' in result) {
      return result;
    }

    redirect(`/book?success=${result.orderId}`);
  }
);

export async function submitStoreFirstOrder(formData: FormData) {
  const result = await createStoreFirstOrder({}, formData);

  if (result && typeof result === 'object' && 'error' in result && result.error) {
    redirect(`/book?error=${encodeURIComponent(result.error)}`);
  }
}
