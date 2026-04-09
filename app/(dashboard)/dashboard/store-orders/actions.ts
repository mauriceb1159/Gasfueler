'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { validatedActionWithUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { orders, OrderFulfillmentStatus } from '@/lib/db/schema';

const storeOrderStatusSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  fulfillmentStatus: z.enum([
    OrderFulfillmentStatus.DRAFT,
    OrderFulfillmentStatus.PENDING_PAYMENT,
    OrderFulfillmentStatus.PAID,
    OrderFulfillmentStatus.PREPARING,
    OrderFulfillmentStatus.READY_FOR_PICKUP,
    OrderFulfillmentStatus.COMPLETED,
    OrderFulfillmentStatus.CANCELLED
  ])
});

export const updateStoreOrderStatus = validatedActionWithUser(
  storeOrderStatusSchema,
  async (data) => {
    const nextState =
      data.fulfillmentStatus === OrderFulfillmentStatus.READY_FOR_PICKUP
        ? { readyAt: new Date(), fulfilledAt: null, cancelReason: null }
        : data.fulfillmentStatus === OrderFulfillmentStatus.COMPLETED
        ? { fulfilledAt: new Date(), cancelReason: null }
        : data.fulfillmentStatus === OrderFulfillmentStatus.CANCELLED
        ? {
            cancelReason: 'Canceled from dashboard queue',
            readyAt: null,
            fulfilledAt: null
          }
        : { readyAt: null, fulfilledAt: null, cancelReason: null };

    await db
      .update(orders)
      .set({
        fulfillmentStatus: data.fulfillmentStatus,
        status: data.fulfillmentStatus,
        updatedAt: new Date(),
        ...nextState
      })
      .where(eq(orders.id, data.orderId));

    revalidatePath('/dashboard/store-orders');
    redirect('/dashboard/store-orders');
  }
);

export async function submitStoreOrderStatus(formData: FormData) {
  await updateStoreOrderStatus({}, formData);
}
