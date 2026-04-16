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
  createStoreOrderCheckoutSession,
  getStripeClient
} from '@/lib/payments/stripe';
import Stripe from 'stripe';
import {
  createStoreOrderForUser,
  storeOrderInputSchema
} from '@/lib/store-order-service';
import { reconcileStoreOrderPayment } from '@/lib/store-orders';

export const createStoreOrder = validatedActionWithUser(
  storeOrderInputSchema,
  async (data, _, user) => {
    const result = await createStoreOrderForUser(data, user);

    if ('error' in result) {
      return result;
    }

    redirect(`/market?success=${result.orderId}`);
  }
);

export async function submitStoreOrder(formData: FormData) {
  const result = await createStoreOrder({}, formData);

  if (result && typeof result === 'object' && 'error' in result && result.error) {
    redirect(`/market?error=${encodeURIComponent(result.error)}`);
  }
}

const storeCheckoutStartSchema = z.object({
  orderId: z.coerce.number().int().positive()
});

export const beginStoreOrderCheckout = validatedActionWithUser(
  storeCheckoutStartSchema,
  async (data, _, user) => {
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, data.orderId),
        eq(orders.userId, user.id),
        eq(orders.orderType, OrderType.STORE_ONLY)
      ),
      with: {
        orderItems: true
      }
    });

    if (!order) {
      return { error: 'Store order not found.' };
    }

    if (order.orderItems.length === 0) {
      return { error: 'This store order has no items to charge.' };
    }

    await createStoreOrderCheckoutSession({
      order,
      orderItems: order.orderItems
    });
  }
);

export async function submitStoreOrderCheckout(formData: FormData) {
  const result = await beginStoreOrderCheckout({}, formData);

  if (result && typeof result === 'object' && 'error' in result && result.error) {
    redirect(`/market?error=${encodeURIComponent(result.error)}`);
  }
}

export async function syncStoreOrderCheckout({
  orderId,
  sessionId
}: {
  orderId: number;
  sessionId: string;
}) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (
    session.mode !== 'payment' ||
    session.metadata?.orderType !== 'store_only' ||
    Number(session.metadata?.orderId) !== orderId
  ) {
    return { status: 'invalid' as const };
  }

  if (session.payment_status !== 'paid') {
    return { status: 'pending' as const, session };
  }

  const reconciliation = await reconcileStoreOrderPayment(orderId);

  if (reconciliation.status === 'missing') {
    return { status: 'invalid' as const };
  }

  return {
    status: 'paid' as const,
    session: session as Stripe.Checkout.Session
  };
}
