import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import {
  orders,
  OrderFulfillmentStatus,
  OrderType,
  stationStoreItems
} from '@/lib/db/schema';

const paidLikeStatuses = new Set([
  OrderFulfillmentStatus.PAID,
  OrderFulfillmentStatus.PREPARING,
  OrderFulfillmentStatus.READY_FOR_PICKUP,
  OrderFulfillmentStatus.COMPLETED
]);

export async function reconcileStoreOrderPayment(orderId: number) {
  return db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.orderType, OrderType.STORE_ONLY)),
      with: {
        orderItems: true
      }
    });

    if (!order) {
      return { status: 'missing' as const };
    }

    if (paidLikeStatuses.has(order.fulfillmentStatus as OrderFulfillmentStatus)) {
      return { status: 'already_paid' as const, orderId: order.id };
    }

    for (const item of order.orderItems) {
      if (!item.stationStoreItemId) {
        continue;
      }

      const stationItem = await tx.query.stationStoreItems.findFirst({
        where: eq(stationStoreItems.id, item.stationStoreItemId),
        columns: {
          id: true,
          inventoryCount: true
        }
      });

      if (!stationItem || stationItem.inventoryCount === null) {
        continue;
      }

      await tx
        .update(stationStoreItems)
        .set({
          inventoryCount: Math.max(stationItem.inventoryCount - item.quantity, 0),
          updatedAt: new Date()
        })
        .where(eq(stationStoreItems.id, stationItem.id));
    }

    await tx
      .update(orders)
      .set({
        status: OrderFulfillmentStatus.PAID,
        fulfillmentStatus: OrderFulfillmentStatus.PAID,
        updatedAt: new Date()
      })
      .where(eq(orders.id, order.id));

    return { status: 'paid' as const, orderId: order.id };
  });
}
