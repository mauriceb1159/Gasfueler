'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { validatedActionWithUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import {
  type NewOrder,
  type NewOrderItem,
  orderItems,
  orders,
  OrderFulfillmentStatus,
  OrderType,
  PickupMode,
  stationStoreItems,
  stations,
} from '@/lib/db/schema';

const storeCheckoutSchema = z
  .object({
    stationId: parseRequiredPositiveInt('Choose a pickup station.'),
    pickupMode: z.enum([PickupMode.ASAP, PickupMode.SCHEDULED, PickupMode.ON_ARRIVAL]),
    pickupWindowStart: z.string().optional(),
    pickupWindowEnd: z.string().optional(),
    customerNotes: z.string().max(1000).optional(),
    selectedStoreItems: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const selectedItems = parseSelectedStoreItems(data.selectedStoreItems);

    if (selectedItems.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedStoreItems'],
        message: 'Add at least one market item to continue.',
      });
    }

    if (data.pickupMode === PickupMode.SCHEDULED) {
      if (!data.pickupWindowStart?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pickupWindowStart'],
          message: 'Choose a pickup window start time.',
        });
      }

      if (!data.pickupWindowEnd?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pickupWindowEnd'],
          message: 'Choose a pickup window end time.',
        });
      }
    }
  });

export const createStoreOrder = validatedActionWithUser(
  storeCheckoutSchema,
  async (data, _, user) => {
    const [station] = await db
      .select()
      .from(stations)
      .where(and(eq(stations.id, data.stationId), eq(stations.active, true)))
      .limit(1);

    if (!station) {
      return { error: 'Selected station could not be found.' };
    }

    const selectedItems = parseSelectedStoreItems(data.selectedStoreItems);

    const availableItems = await db.query.stationStoreItems.findMany({
      where: and(
        eq(stationStoreItems.stationId, station.id),
        eq(stationStoreItems.active, true)
      ),
      with: {
        storeItem: true,
      },
    });

    const availableItemMap = new Map(
      availableItems.map((item) => [item.id, item] as const)
    );

    const resolvedItems = selectedItems.flatMap((item) => {
      const stationItem = availableItemMap.get(item.stationStoreItemId);

      if (!stationItem) {
        return [];
      }

      return [
        {
          stationStoreItemId: stationItem.id,
          storeItemId: stationItem.storeItemId,
          itemName: stationItem.storeItem.name,
          quantity: item.quantity,
          unitPrice: stationItem.priceCents,
          subtotalPrice: stationItem.priceCents * item.quantity,
        },
      ];
    });

    if (resolvedItems.length === 0) {
      return { error: 'Those market items are no longer available.' };
    }

    const pickupWindowStart = parseOptionalDate(data.pickupWindowStart);
    const pickupWindowEnd = parseOptionalDate(data.pickupWindowEnd);

    if (
      data.pickupMode === PickupMode.SCHEDULED &&
      pickupWindowStart &&
      pickupWindowEnd &&
      pickupWindowEnd <= pickupWindowStart
    ) {
      return { error: 'Pickup window end must be after the start time.' };
    }

    const storeSubtotal = resolvedItems.reduce(
      (sum, item) => sum + item.subtotalPrice,
      0
    );

    const newOrder: NewOrder = {
      userId: user.id,
      stationId: station.id,
      orderType: OrderType.STORE_ONLY,
      status: OrderFulfillmentStatus.PENDING_PAYMENT,
      pickupMode: data.pickupMode,
      pickupWindowStart,
      pickupWindowEnd,
      customerNotes: data.customerNotes?.trim() || null,
      fulfillmentStatus: OrderFulfillmentStatus.DRAFT,
      fuelSubtotal: 0,
      storeSubtotal,
      serviceFee: 0,
      taxTotal: 0,
      totalAmount: storeSubtotal,
      readyAt: null,
      fulfilledAt: null,
      cancelReason: null,
    };

    const [createdOrder] = await db
      .insert(orders)
      .values(newOrder)
      .returning({ id: orders.id });

    const newOrderItems: NewOrderItem[] = resolvedItems.map((item) => ({
      orderId: createdOrder.id,
      itemType: 'store_item',
      storeItemId: item.storeItemId,
      stationStoreItemId: item.stationStoreItemId,
      itemName: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotalPrice: item.subtotalPrice,
    }));

    await db.insert(orderItems).values(newOrderItems);

    redirect(`/market?success=${createdOrder.id}`);
  }
);

export async function submitStoreOrder(formData: FormData) {
  const result = await createStoreOrder({}, formData);

  if (result && typeof result === 'object' && 'error' in result && result.error) {
    redirect(`/market?error=${encodeURIComponent(result.error)}`);
  }
}

function parseRequiredPositiveInt(message: string) {
  return z.preprocess((value) => {
    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      if (!trimmedValue) {
        return undefined;
      }

      return Number(trimmedValue);
    }

    return value;
  }, z.number({ message }).int().positive(message));
}

function parseSelectedStoreItems(value: string | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map((item) => ({
        stationStoreItemId: Number(item?.stationStoreItemId),
        quantity: Number(item?.quantity),
      }))
      .filter(
        (item) =>
          Number.isInteger(item.stationStoreItemId) &&
          item.stationStoreItemId > 0 &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0
      );
  } catch {
    return [];
  }
}

function parseOptionalDate(value: string | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}
