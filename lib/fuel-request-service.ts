import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db/drizzle';
import {
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
    nickname: z.string().max(100).optional(),
    vehicleClass: z
      .enum([VehicleClass.CAR, VehicleClass.SUV, VehicleClass.TRUCK])
      .optional(),
    make: z.string().max(100).optional(),
    model: z.string().max(100).optional(),
    color: z.string().max(50).optional(),
    licensePlate: z.string().max(30).optional(),
    fuelType: z.string().max(30).optional(),
    vehicleNotes: z.string().max(500).optional(),
    specialInstructions: z.string().max(1000).optional(),
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
      nickname: input.nickname?.trim() || null,
      vehicleClass: input.vehicleClass || VehicleClass.SUV,
      make: input.make?.trim() || null,
      model: input.model?.trim() || null,
      color: input.color?.trim() || null,
      licensePlate: input.licensePlate!.trim(),
      fuelType: input.fuelType?.trim() || null,
      notes: input.vehicleNotes?.trim() || null
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
        licensePlate: vehicles.licensePlate
      })
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    const requestedVehicleClass = input.vehicleClass || VehicleClass.SUV;

    if (vehicleRecord?.vehicleClass !== requestedVehicleClass) {
      await db
        .update(vehicles)
        .set({
          vehicleClass: requestedVehicleClass,
          updatedAt: new Date()
        })
        .where(eq(vehicles.id, vehicleId));
    }

    vehicleClass = requestedVehicleClass;
    vehicleDetails = vehicleRecord
      ? {
          nickname: vehicleRecord.nickname,
          make: vehicleRecord.make,
          model: vehicleRecord.model,
          color: vehicleRecord.color,
          licensePlate: vehicleRecord.licensePlate
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
          nickname: input.nickname?.trim() || null,
          make: input.make?.trim() || null,
          model: input.model?.trim() || null,
          color: input.color?.trim() || null,
          licensePlate: input.licensePlate?.trim() || null
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
    case VehicleClass.TRUCK:
      return 1099;
    case VehicleClass.SUV:
    default:
      return 899;
  }
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
