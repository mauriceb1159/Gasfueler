'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { validatedActionWithUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import {
  fuelRequests,
  FuelRequestStatus,
  FuelRequestType,
  type NewFuelRequest,
  serviceSlots,
  ServiceSlotStatus,
  stations,
  vehicles,
  type NewVehicle
} from '@/lib/db/schema';

const bookingSchema = z
  .object({
    stationId: z.coerce.number().int().positive(),
    slotId: z.coerce.number().int().positive(),
    fuelGrade: z.string().min(2).max(30),
    requestType: z.enum([
      FuelRequestType.FILL_TANK,
      FuelRequestType.GALLONS,
      FuelRequestType.DOLLAR_AMOUNT
    ]),
    requestedGallons: z
      .union([z.coerce.number().int().positive(), z.literal('')])
      .optional(),
    requestedDollarAmount: z
      .union([z.coerce.number().int().positive(), z.literal('')])
      .optional(),
    vehicleId: z
      .union([z.coerce.number().int().positive(), z.literal('')])
      .optional(),
    nickname: z.string().max(100).optional(),
    make: z.string().max(100).optional(),
    model: z.string().max(100).optional(),
    color: z.string().max(50).optional(),
    licensePlate: z.string().max(30).optional(),
    fuelType: z.string().max(30).optional(),
    vehicleNotes: z.string().max(500).optional(),
    specialInstructions: z.string().max(1000).optional()
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

    const requestedGallons =
      typeof data.requestedGallons === 'number' ? data.requestedGallons : null;
    const requestedDollarAmount =
      typeof data.requestedDollarAmount === 'number'
        ? data.requestedDollarAmount
        : null;

    const serviceFee = 500;
    const fuelEstimate =
      data.requestType === FuelRequestType.DOLLAR_AMOUNT
        ? requestedDollarAmount
        : null;

    const newRequest: NewFuelRequest = {
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
      addonTotal: 0,
      totalEstimate: (fuelEstimate ?? 0) + serviceFee,
      status: FuelRequestStatus.PENDING_PAYMENT,
      specialInstructions: data.specialInstructions?.trim() || null
    };

    const [createdRequest] = await db
      .insert(fuelRequests)
      .values(newRequest)
      .returning({ id: fuelRequests.id });

    redirect(`/dashboard?request=${createdRequest.id}`);
  }
);

export async function submitFuelRequest(formData: FormData) {
  const result = await createFuelRequest({}, formData);

  if (result && typeof result === 'object' && 'error' in result && result.error) {
    redirect(`/book?error=${encodeURIComponent(result.error)}`);
  }
}
