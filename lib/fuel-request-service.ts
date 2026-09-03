import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db/drizzle';
import { createDispatchJobForOrder } from '@/lib/dispatch-service';
import {
  DispatchJobType,
  fuelRequests,
  FuelRequestItemType,
  FuelRequestStatus,
  FuelRequestType,
  type NewFuelRequest,
  type NewOrder,
  type NewOrderItem,
  orders,
  orderItems,
  OrderType,
  serviceSlots,
  ServiceSlotStatus,
  stationStoreItems,
  stations,
  type User,
  vehicles,
  VehicleClass,
  type NewVehicle
} from '@/lib/db/schema';
import { sendFuelOrderConfirmationEmail } from '@/lib/email/order-confirmation';
import { getEffectiveFuelPriceForStationGrade } from '@/lib/fuel-pricing';

const vehicleClassSchema = z.enum([
  VehicleClass.CAR,
  VehicleClass.SUV,
  VehicleClass.TRUCK,
  VehicleClass.LIGHT_TRUCK,
  VehicleClass.HEAVY_DUTY_TRUCK,
  VehicleClass.COMMERCIAL
]);

const fillUpPreAuthCaps: Record<VehicleClass, { gas: number; diesel: number }> = {
  [VehicleClass.CAR]: { gas: 15000, diesel: 20000 },
  [VehicleClass.SUV]: { gas: 22500, diesel: 27500 },
  [VehicleClass.TRUCK]: { gas: 25000, diesel: 30000 },
  [VehicleClass.LIGHT_TRUCK]: { gas: 25000, diesel: 30000 },
  [VehicleClass.HEAVY_DUTY_TRUCK]: { gas: 30000, diesel: 40000 },
  [VehicleClass.COMMERCIAL]: { gas: 0, diesel: 0 }
};

const bookingSelectionSchema = z.object({
  stationStoreItemId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive()
});

const bookingSelectedItemsFieldSchema = z
  .union([z.string(), z.array(bookingSelectionSchema)])
  .optional();

const optionalPositiveIntSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return undefined;
    }

    return Number(trimmedValue);
  }

  return value;
}, z.number().int().positive().optional());

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    });

export const fuelRequestInputSchema = z
  .object({
    stationId: z.coerce.number().int().positive('Choose a partner station.'),
    slotId: z.coerce.number().int().positive('Choose a service slot.'),
    fuelGrade: z.string().min(2).max(30),
    requestType: z.enum([
      FuelRequestType.FILL_TANK,
      FuelRequestType.GALLONS,
      FuelRequestType.DOLLAR_AMOUNT
    ]),
    requestedGallons: optionalPositiveIntSchema,
    requestedDollarAmount: optionalPositiveIntSchema,
    vehicleId: optionalPositiveIntSchema,
    nickname: optionalTrimmedString(100),
    vehicleClass: vehicleClassSchema.optional(),
    make: optionalTrimmedString(100),
    model: optionalTrimmedString(100),
    color: optionalTrimmedString(50),
    licensePlate: optionalTrimmedString(30),
    fuelType: optionalTrimmedString(30),
    vehicleNotes: optionalTrimmedString(500),
    specialInstructions: optionalTrimmedString(1000),
    selectedStoreItems: bookingSelectedItemsFieldSchema
  })
  .superRefine((data, ctx) => {
    if (
      data.requestType === FuelRequestType.GALLONS &&
      !data.requestedGallons
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requestedGallons'],
        message: 'Enter the number of gallons you want.'
      });
    }

    if (
      data.requestType === FuelRequestType.DOLLAR_AMOUNT &&
      !data.requestedDollarAmount
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requestedDollarAmount'],
        message: 'Enter the dollar amount for this stop.'
      });
    }

    if (!data.vehicleId && !data.licensePlate?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['licensePlate'],
        message: 'Choose a saved vehicle or enter a license plate.'
      });
    }
  });

export type FuelRequestInput = z.infer<typeof fuelRequestInputSchema>;

export async function createFuelRequestForUser(
  input: FuelRequestInput,
  user: User
) {
  const [station] = await db
    .select()
    .from(stations)
    .where(eq(stations.id, input.stationId))
    .limit(1);

  if (!station) {
    return { error: 'Selected station could not be found.' as const };
  }

  const [slot] = await db
    .select()
    .from(serviceSlots)
    .where(
      and(
        eq(serviceSlots.id, input.slotId),
        eq(serviceSlots.stationId, input.stationId),
        eq(serviceSlots.status, ServiceSlotStatus.OPEN)
      )
    )
    .limit(1);

  if (!slot) {
    return { error: 'That time slot is no longer available.' as const };
  }

  let vehicleId = typeof input.vehicleId === 'number' ? input.vehicleId : null;

  if (!vehicleId) {
    const newVehicle: NewVehicle = {
      userId: user.id,
      nickname: input.nickname || null,
      vehicleClass: input.vehicleClass || VehicleClass.SUV,
      make: input.make || null,
      model: input.model || null,
      color: input.color || null,
      licensePlate: input.licensePlate!,
      fuelType: input.fuelType || null,
      notes: input.vehicleNotes || null
    };

    const [createdVehicle] = await db
      .insert(vehicles)
      .values(newVehicle)
      .returning({ id: vehicles.id });

    vehicleId = createdVehicle.id;
  }

  let vehicleClass = input.vehicleClass || VehicleClass.SUV;
  let vehicleDetails: {
    nickname: string | null;
    make: string | null;
    model: string | null;
    color: string | null;
    licensePlate: string | null;
  } | null = null;

  if (vehicleId) {
    const [vehicleRecord] = await db
      .select({
        vehicleClass: vehicles.vehicleClass,
        nickname: vehicles.nickname,
        make: vehicles.make,
        model: vehicles.model,
        color: vehicles.color,
        licensePlate: vehicles.licensePlate,
        fuelType: vehicles.fuelType,
        notes: vehicles.notes
      })
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    const requestedVehicleClass =
      input.vehicleClass ||
      parseVehicleClass(vehicleRecord?.vehicleClass) ||
      VehicleClass.SUV;
    const vehicleUpdates = {
      nickname: input.nickname ?? vehicleRecord?.nickname ?? null,
      vehicleClass: requestedVehicleClass,
      make: input.make ?? vehicleRecord?.make ?? null,
      model: input.model ?? vehicleRecord?.model ?? null,
      color: input.color ?? vehicleRecord?.color ?? null,
      licensePlate: input.licensePlate ?? vehicleRecord?.licensePlate ?? null,
      fuelType: input.fuelType ?? vehicleRecord?.fuelType ?? null,
      notes: input.vehicleNotes ?? vehicleRecord?.notes ?? null,
      updatedAt: new Date()
    };

    if (vehicleRecord) {
      await db
        .update(vehicles)
        .set(vehicleUpdates)
        .where(eq(vehicles.id, vehicleId));
    }

    vehicleClass = requestedVehicleClass;
    vehicleDetails = vehicleRecord
      ? {
          nickname: vehicleUpdates.nickname,
          make: vehicleUpdates.make,
          model: vehicleUpdates.model,
          color: vehicleUpdates.color,
          licensePlate: vehicleUpdates.licensePlate
        }
      : null;
  }

  const requestedGallons =
    typeof input.requestedGallons === 'number' ? input.requestedGallons : null;
  const requestedDollarAmount =
    typeof input.requestedDollarAmount === 'number'
      ? input.requestedDollarAmount
      : null;

  const serviceFee = getServiceFeeForVehicleClass(vehicleClass);

  if (
    vehicleClass === VehicleClass.COMMERCIAL &&
    input.requestType === FuelRequestType.FILL_TANK
  ) {
    return {
      error:
        'Fill-up is unavailable for commercial and oversized vehicles. Choose exact gallons or a dollar amount.' as const
    };
  }

  const selectedStoreItems = parseSelectedStoreItems(input.selectedStoreItems);
  let latestPrice: { priceCents: number } | null = null;

  try {
    latestPrice = await getEffectiveFuelPriceForStationGrade(
      station,
      input.fuelGrade
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.toLowerCase().includes('station_fuel_prices')
    ) {
      throw error;
    }
  }

  let resolvedStoreItems: {
    stationStoreItemId: number;
    storeItemId: number | null;
    itemName: string;
    quantity: number;
    unitPrice: number;
    subtotalPrice: number;
  }[] = [];

  if (selectedStoreItems.length > 0) {
    const stationItems = await db.query.stationStoreItems.findMany({
      where: and(
        eq(stationStoreItems.stationId, station.id),
        eq(stationStoreItems.active, true)
      ),
      with: {
        storeItem: true
      }
    });

    const stationItemMap = new Map(
      stationItems.map((item) => [item.id, item] as const)
    );

    resolvedStoreItems = selectedStoreItems.flatMap((item) => {
      const stationItem = stationItemMap.get(item.stationStoreItemId);

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
  }

  const addonTotal = resolvedStoreItems.reduce(
    (sum, item) => sum + item.subtotalPrice,
    0
  );

  const fuelEstimate =
    input.requestType === FuelRequestType.DOLLAR_AMOUNT
      ? requestedDollarAmount
        ? requestedDollarAmount * 100
        : null
      : input.requestType === FuelRequestType.GALLONS &&
          requestedGallons &&
          latestPrice?.priceCents
        ? requestedGallons * latestPrice.priceCents
        : input.requestType === FuelRequestType.FILL_TANK
        ? getFillUpPreAuthCents(vehicleClass, input.fuelGrade)
        : null;

  const newRequest: NewFuelRequest = {
    orderId: null,
    userId: user.id,
    stationId: station.id,
    vehicleId,
    slotId: slot.id,
    fuelGrade: input.fuelGrade,
    requestType: input.requestType,
    requestedGallons,
    requestedDollarAmount,
    fuelEstimate,
    serviceFee,
    addonTotal,
    totalEstimate: (fuelEstimate ?? 0) + serviceFee + addonTotal,
    status: FuelRequestStatus.PENDING_PAYMENT,
    specialInstructions: input.specialInstructions?.trim() || null
  };

  const newOrder: NewOrder = {
    userId: user.id,
    stationId: station.id,
    orderType: addonTotal > 0 ? OrderType.MIXED : OrderType.FUEL_SERVICE,
    status: FuelRequestStatus.PENDING_PAYMENT,
    fuelSubtotal: fuelEstimate ?? 0,
    storeSubtotal: addonTotal,
    serviceFee,
    taxTotal: 0,
    totalAmount: (fuelEstimate ?? 0) + serviceFee + addonTotal
  };

  const [createdOrder] = await db
    .insert(orders)
    .values(newOrder)
    .returning({ id: orders.id });

  newRequest.orderId = createdOrder.id;

  const [createdRequest] = await db
    .insert(fuelRequests)
    .values(newRequest)
    .returning({ id: fuelRequests.id });

  if (resolvedStoreItems.length > 0) {
    const newOrderItems: NewOrderItem[] = resolvedStoreItems.map((item) => ({
      orderId: createdOrder.id,
      itemType: FuelRequestItemType.STORE_ITEM,
      storeItemId: item.storeItemId,
      stationStoreItemId: item.stationStoreItemId,
      itemName: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotalPrice: item.subtotalPrice
    }));

    await db.insert(orderItems).values(newOrderItems);
  }

  try {
    await createDispatchJobForOrder({
      fuelRequestId: createdRequest.id,
      orderId: createdOrder.id,
      jobType: addonTotal > 0 ? DispatchJobType.COMBO : DispatchJobType.FUEL,
      customerUserId: user.id,
      stationId: station.id,
      scheduledStartAt: slot.startAt,
      scheduledEndAt: slot.endAt,
      dispatcherNotes: 'Auto-created from fuel booking.',
    });
  } catch (error) {
    console.error('Dispatch job auto-creation failed:', error);
  }

  try {
    await sendFuelOrderConfirmationEmail({
      email: user.email,
      customerName: user.name,
      orderId: createdOrder.id,
      requestId: createdRequest.id,
      stationName: station.name,
      stationAddress: [station.address, station.city, station.state, station.zip]
        .filter(Boolean)
        .join(', '),
      slotStart: slot.startAt,
      slotEnd: slot.endAt,
      vehicleLabel: formatFuelVehicleLabel(
        vehicleDetails ?? {
          nickname: input.nickname || null,
          make: input.make || null,
          model: input.model || null,
          color: input.color || null,
          licensePlate: input.licensePlate || null
        }
      ),
      fuelGrade: input.fuelGrade,
      requestTypeLabel: formatRequestTypeLabel(input.requestType),
      requestedAmountLabel: formatRequestedAmountLabel(
        input.requestType,
        requestedGallons,
        requestedDollarAmount
      ),
      specialInstructions: input.specialInstructions?.trim() || null,
      fuelEstimate,
      serviceFee,
      addonTotal,
      totalEstimate: (fuelEstimate ?? 0) + serviceFee + addonTotal,
      storeItems: resolvedStoreItems.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        subtotalPrice: item.subtotalPrice
      }))
    });
  } catch (error) {
    console.error('Fuel booking confirmation email failed:', error);
  }

  return {
    requestId: createdRequest.id,
    orderId: createdOrder.id,
    totalEstimate: (fuelEstimate ?? 0) + serviceFee + addonTotal,
    fuelEstimate,
    addonTotal,
    serviceFee
  };
}

function formatFuelVehicleLabel(vehicle: {
  nickname: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  licensePlate: string | null;
}) {
  const primaryLabel =
    vehicle.nickname?.trim() ||
    [vehicle.color, vehicle.make, vehicle.model].filter(Boolean).join(' ').trim() ||
    vehicle.licensePlate?.trim() ||
    'Saved vehicle';

  if (vehicle.licensePlate?.trim() && primaryLabel !== vehicle.licensePlate.trim()) {
    return `${primaryLabel} (${vehicle.licensePlate.trim()})`;
  }

  return primaryLabel;
}

function formatRequestTypeLabel(requestType: FuelRequestType) {
  switch (requestType) {
    case FuelRequestType.FILL_TANK:
      return 'Fill tank';
    case FuelRequestType.GALLONS:
      return 'Specific gallons';
    case FuelRequestType.DOLLAR_AMOUNT:
      return 'Specific dollar amount';
    default:
      return requestType;
  }
}

function formatRequestedAmountLabel(
  requestType: FuelRequestType,
  requestedGallons: number | null,
  requestedDollarAmount: number | null
) {
  if (requestType === FuelRequestType.GALLONS && requestedGallons) {
    return `${requestedGallons} gallon${requestedGallons === 1 ? '' : 's'}`;
  }

  if (requestType === FuelRequestType.DOLLAR_AMOUNT && requestedDollarAmount) {
    return `$${requestedDollarAmount}`;
  }

  return null;
}

function getServiceFeeForVehicleClass(vehicleClass: VehicleClass) {
  switch (vehicleClass) {
    case VehicleClass.CAR:
      return 699;
    case VehicleClass.LIGHT_TRUCK:
      return 1099;
    case VehicleClass.TRUCK:
    case VehicleClass.HEAVY_DUTY_TRUCK:
    case VehicleClass.COMMERCIAL:
      return 1099;
    case VehicleClass.SUV:
    default:
      return 899;
  }
}

function parseVehicleClass(value: string | null | undefined) {
  if (
    value === VehicleClass.CAR ||
    value === VehicleClass.SUV ||
    value === VehicleClass.TRUCK ||
    value === VehicleClass.LIGHT_TRUCK ||
    value === VehicleClass.HEAVY_DUTY_TRUCK ||
    value === VehicleClass.COMMERCIAL
  ) {
    return value;
  }

  return null;
}

function getFillUpPreAuthCents(vehicleClass: VehicleClass, fuelGrade: string) {
  const fuelFamily = fuelGrade.toLowerCase().includes('diesel') ? 'diesel' : 'gas';

  return fillUpPreAuthCaps[vehicleClass][fuelFamily];
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
