'use server';

import { and, desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { validatedActionWithUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import {
  fuelRequests,
  FuelRequestItemType,
  FuelRequestStatus,
  FuelRequestType,
  type NewOrder,
  type NewOrderItem,
  type NewFuelRequest,
  orderItems,
  orders,
  OrderType,
  serviceSlots,
  ServiceSlotStatus,
  stationStoreItems,
  stationFuelPrices,
  stations,
  VehicleClass,
  vehicles,
  type NewVehicle
} from '@/lib/db/schema';

const bookingSchema = z
  .object({
    stationId: parseRequiredPositiveInt('Choose a partner station.'),
    slotId: parseRequiredPositiveInt('Choose a service slot.'),
    fuelGrade: z.string().min(2).max(30),
    requestType: z.enum([
      FuelRequestType.FILL_TANK,
      FuelRequestType.GALLONS,
      FuelRequestType.DOLLAR_AMOUNT
    ]),
    requestedGallons: parseOptionalPositiveInt(),
    requestedDollarAmount: parseOptionalPositiveInt(),
    vehicleId: parseOptionalPositiveInt(),
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
    selectedStoreItems: z.string().optional()
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

export const createFuelRequest = validatedActionWithUser(
  bookingSchema,
  async (data, _, user) => {
    const [station] = await db
      .select()
      .from(stations)
      .where(eq(stations.id, data.stationId))
      .limit(1);

    if (!station) {
      return { error: 'Selected station could not be found.' };
    }

    const [slot] = await db
      .select()
      .from(serviceSlots)
      .where(
        and(
          eq(serviceSlots.id, data.slotId),
          eq(serviceSlots.stationId, data.stationId),
          eq(serviceSlots.status, ServiceSlotStatus.OPEN)
        )
      )
      .limit(1);

    if (!slot) {
      return { error: 'That time slot is no longer available.' };
    }

    let vehicleId = typeof data.vehicleId === 'number' ? data.vehicleId : null;

    if (!vehicleId) {
      const newVehicle: NewVehicle = {
        userId: user.id,
        nickname: data.nickname?.trim() || null,
        vehicleClass: data.vehicleClass || VehicleClass.SUV,
        make: data.make?.trim() || null,
        model: data.model?.trim() || null,
        color: data.color?.trim() || null,
        licensePlate: data.licensePlate!.trim(),
        fuelType: data.fuelType?.trim() || null,
        notes: data.vehicleNotes?.trim() || null
      };

      const [createdVehicle] = await db
        .insert(vehicles)
        .values(newVehicle)
        .returning({ id: vehicles.id });

      vehicleId = createdVehicle.id;
    }

    let vehicleClass = data.vehicleClass || VehicleClass.SUV;

    if (vehicleId) {
      const [vehicleRecord] = await db
        .select({
          vehicleClass: vehicles.vehicleClass
        })
        .from(vehicles)
        .where(eq(vehicles.id, vehicleId))
        .limit(1);

      const requestedVehicleClass = data.vehicleClass || VehicleClass.SUV;

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
    }

    const requestedGallons =
      typeof data.requestedGallons === 'number' ? data.requestedGallons : null;
    const requestedDollarAmount =
      typeof data.requestedDollarAmount === 'number'
        ? data.requestedDollarAmount
        : null;

    const serviceFee = getServiceFeeForVehicleClass(vehicleClass);
    const selectedStoreItems = parseSelectedStoreItems(data.selectedStoreItems);
    let latestPrice:
      | {
          priceCents: number;
        }
      | undefined;

    try {
      [latestPrice] = await db
        .select({
          priceCents: stationFuelPrices.priceCents
        })
        .from(stationFuelPrices)
        .where(
          and(
            eq(stationFuelPrices.stationId, station.id),
            eq(stationFuelPrices.fuelGrade, data.fuelGrade)
          )
        )
        .orderBy(desc(stationFuelPrices.recordedAt))
        .limit(1);
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
      data.requestType === FuelRequestType.DOLLAR_AMOUNT
        ? requestedDollarAmount
          ? requestedDollarAmount * 100
          : null
        : data.requestType === FuelRequestType.GALLONS &&
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
      fuelGrade: data.fuelGrade,
      requestType: data.requestType,
      requestedGallons,
      requestedDollarAmount,
      fuelEstimate,
      serviceFee,
      addonTotal,
      totalEstimate: (fuelEstimate ?? 0) + serviceFee + addonTotal,
      status: FuelRequestStatus.PENDING_PAYMENT,
      specialInstructions: data.specialInstructions?.trim() || null
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

    redirect(`/requests/${createdRequest.id}`);
  }
);

export async function submitFuelRequest(formData: FormData) {
  const result = await createFuelRequest({}, formData);

  if (result && typeof result === 'object' && 'error' in result && result.error) {
    redirect(`/book?error=${encodeURIComponent(result.error)}`);
  }
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

function parseOptionalPositiveInt() {
  return z.preprocess((value) => {
    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      if (!trimmedValue) {
        return undefined;
      }

      return Number(trimmedValue);
    }

    return value;
  }, z.number().int().positive().optional());
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
