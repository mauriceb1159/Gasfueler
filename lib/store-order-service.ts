import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db/drizzle';
import { createDispatchJobForOrder } from '@/lib/dispatch-service';
import {
  DispatchJobType,
  type NewOrder,
  type NewOrderItem,
  orderItems,
  orders,
  OrderFulfillmentStatus,
  OrderType,
  PickupMode,
  stationStoreItems,
  stations,
  type User
} from '@/lib/db/schema';
import { sendStoreOrderConfirmationEmail } from '@/lib/email/order-confirmation';

const storeOrderSelectionSchema = z.object({
  stationStoreItemId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive()
});

const storeOrderSelectedItemsFieldSchema = z
  .union([z.string(), z.array(storeOrderSelectionSchema)])
  .optional();

export const storeOrderInputSchema = z
  .object({
    stationId: z.coerce.number().int().positive('Choose a pickup station.'),
    pickupMode: z.enum([
      PickupMode.ASAP,
      PickupMode.SCHEDULED,
      PickupMode.ON_ARRIVAL
    ]),
    pickupWindowStart: z.string().optional(),
    pickupWindowEnd: z.string().optional(),
    customerNotes: z.string().max(1000).optional(),
    storeVehicleMake: z.string().trim().min(1, 'Enter the vehicle make.'),
    storeVehicleModel: z.string().trim().min(1, 'Enter the vehicle model.'),
    storeVehicleColor: z.string().trim().min(1, 'Enter the vehicle color.'),
    storeVehicleLicensePlate: z
      .string()
      .trim()
      .min(1, 'Enter the license plate.'),
    selectedStoreItems: storeOrderSelectedItemsFieldSchema
  })
  .superRefine((data, ctx) => {
    const selectedItems = parseSelectedStoreItems(data.selectedStoreItems);

    if (selectedItems.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedStoreItems'],
        message: 'Add at least one market item to continue.'
      });
    }

    if (data.pickupMode === PickupMode.SCHEDULED) {
      if (!data.pickupWindowStart?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pickupWindowStart'],
          message: 'Choose a pickup window start time.'
        });
      }

      if (!data.pickupWindowEnd?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pickupWindowEnd'],
          message: 'Choose a pickup window end time.'
        });
      }
    }
  });

export type StoreOrderInput = z.infer<typeof storeOrderInputSchema>;

export async function createStoreOrderForUser(
  input: StoreOrderInput,
  user: User
) {
  const [station] = await db
    .select()
    .from(stations)
    .where(and(eq(stations.id, input.stationId), eq(stations.active, true)))
    .limit(1);

  if (!station) {
    return { error: 'Selected station could not be found.' as const };
  }

  const selectedItems = parseSelectedStoreItems(input.selectedStoreItems);

  const availableItems = await db.query.stationStoreItems.findMany({
    where: and(
      eq(stationStoreItems.stationId, station.id),
      eq(stationStoreItems.active, true)
    ),
    with: {
      storeItem: true
    }
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
        subtotalPrice: stationItem.priceCents * item.quantity
      }
    ];
  });

  if (resolvedItems.length === 0) {
    return { error: 'Those market items are no longer available.' as const };
  }

  const pickupWindowStart = parseOptionalDate(input.pickupWindowStart);
  const pickupWindowEnd = parseOptionalDate(input.pickupWindowEnd);

  if (
    input.pickupMode === PickupMode.SCHEDULED &&
    pickupWindowStart &&
    pickupWindowEnd &&
    pickupWindowEnd <= pickupWindowStart
  ) {
    return { error: 'Pickup window end must be after the start time.' as const };
  }

  const storeSubtotal = resolvedItems.reduce(
    (sum, item) => sum + item.subtotalPrice,
    0
  );

  const vehicleSummary = [
    input.storeVehicleMake,
    input.storeVehicleModel,
    input.storeVehicleColor
  ]
    .filter(Boolean)
    .join(' ');
  const vehiclePlate = input.storeVehicleLicensePlate?.trim();
  const baseNotes = input.customerNotes?.trim() || '';
  const vehicleNotes = `Vehicle: ${vehicleSummary}${vehiclePlate ? `, Plate ${vehiclePlate}` : ''}.`;
  const mergedNotes = [vehicleNotes, baseNotes].filter(Boolean).join(' ');

  const newOrder: NewOrder = {
    userId: user.id,
    stationId: station.id,
    orderType: OrderType.STORE_ONLY,
    status: OrderFulfillmentStatus.PENDING_PAYMENT,
    pickupMode: input.pickupMode,
    pickupWindowStart,
    pickupWindowEnd,
    customerNotes: mergedNotes || null,
    fulfillmentStatus: OrderFulfillmentStatus.DRAFT,
    fuelSubtotal: 0,
    storeSubtotal,
    serviceFee: 0,
    taxTotal: 0,
    totalAmount: storeSubtotal,
    readyAt: null,
    fulfilledAt: null,
    cancelReason: null
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
    subtotalPrice: item.subtotalPrice
  }));

  await db.insert(orderItems).values(newOrderItems);

  try {
    await createDispatchJobForOrder({
      orderId: createdOrder.id,
      jobType: DispatchJobType.STORE,
      customerUserId: user.id,
      stationId: station.id,
      scheduledStartAt: pickupWindowStart,
      scheduledEndAt: pickupWindowEnd,
      dispatcherNotes: 'Auto-created from store order.',
    });
  } catch (error) {
    console.error('Dispatch job auto-creation failed:', error);
  }

  try {
    await sendStoreOrderConfirmationEmail({
      email: user.email,
      customerName: user.name,
      orderId: createdOrder.id,
      stationName: station.name,
      stationAddress: [station.address, station.city, station.state, station.zip]
        .filter(Boolean)
        .join(', '),
      pickupModeLabel: formatPickupModeLabel(input.pickupMode),
      pickupWindowLabel: formatPickupWindowLabel(
        input.pickupMode,
        pickupWindowStart,
        pickupWindowEnd
      ),
      vehicleLabel: formatStoreVehicleLabel({
        make: input.storeVehicleMake,
        model: input.storeVehicleModel,
        color: input.storeVehicleColor,
        licensePlate: input.storeVehicleLicensePlate
      }),
      customerNotes: baseNotes || null,
      totalAmount: storeSubtotal,
      items: resolvedItems.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        subtotalPrice: item.subtotalPrice
      }))
    });
  } catch (error) {
    console.error('Store order confirmation email failed:', error);
  }

  return {
    orderId: createdOrder.id,
    totalAmount: storeSubtotal,
    itemCount: resolvedItems.reduce((sum, item) => sum + item.quantity, 0)
  };
}

function formatStoreVehicleLabel(vehicle: {
  make: string;
  model: string;
  color: string;
  licensePlate: string;
}) {
  const baseLabel = [vehicle.color, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(' ')
    .trim();

  return vehicle.licensePlate?.trim()
    ? `${baseLabel} (${vehicle.licensePlate.trim()})`
    : baseLabel || 'Vehicle on arrival';
}

function formatPickupModeLabel(pickupMode: PickupMode) {
  switch (pickupMode) {
    case PickupMode.ASAP:
      return 'ASAP';
    case PickupMode.SCHEDULED:
      return 'Scheduled';
    case PickupMode.ON_ARRIVAL:
      return 'On arrival';
    default:
      return pickupMode;
  }
}

function formatPickupWindowLabel(
  pickupMode: PickupMode,
  pickupWindowStart: Date | null,
  pickupWindowEnd: Date | null
) {
  if (pickupMode === PickupMode.SCHEDULED && pickupWindowStart && pickupWindowEnd) {
    return `${formatStoreDateTime(pickupWindowStart)} - ${formatStoreDateTime(pickupWindowEnd)}`;
  }

  if (pickupMode === PickupMode.ON_ARRIVAL) {
    return 'Ready when you arrive at the station';
  }

  return 'As soon as possible';
}

function formatStoreDateTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(value);
}

function parseSelectedStoreItems(
  value: string | { stationStoreItemId: number; quantity: number }[] | undefined
) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsedValue = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map((item) => ({
        stationStoreItemId: Number(item?.stationStoreItemId),
        quantity: Number(item?.quantity)
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
