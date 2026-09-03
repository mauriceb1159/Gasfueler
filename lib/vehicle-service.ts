import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db/drizzle';
import {
  type NewVehicle,
  type User,
  vehicles,
  VehicleClass
} from '@/lib/db/schema';

const vehicleClassSchema = z.enum([
  VehicleClass.CAR,
  VehicleClass.SUV,
  VehicleClass.TRUCK,
  VehicleClass.LIGHT_TRUCK,
  VehicleClass.HEAVY_DUTY_TRUCK,
  VehicleClass.COMMERCIAL
]);

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    });

export const createVehicleInputSchema = z.object({
  nickname: optionalTrimmedString(100),
  vehicleClass: vehicleClassSchema,
  make: optionalTrimmedString(100),
  model: optionalTrimmedString(100),
  color: optionalTrimmedString(50),
  licensePlate: z.string().trim().min(1).max(30),
  fuelType: optionalTrimmedString(30),
  notes: optionalTrimmedString(500)
});

export const updateVehicleInputSchema = z
  .object({
    nickname: optionalTrimmedString(100),
    vehicleClass: vehicleClassSchema.optional(),
    make: optionalTrimmedString(100),
    model: optionalTrimmedString(100),
    color: optionalTrimmedString(50),
    licensePlate: z.string().trim().min(1).max(30).optional(),
    fuelType: optionalTrimmedString(30),
    notes: optionalTrimmedString(500)
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    'Provide at least one field to update.'
  );

export async function listVehiclesForUser(user: User) {
  return db
    .select()
    .from(vehicles)
    .where(eq(vehicles.userId, user.id))
    .orderBy(desc(vehicles.updatedAt));
}

export async function createVehicleForUser(
  input: z.infer<typeof createVehicleInputSchema>,
  user: User
) {
  const newVehicle: NewVehicle = {
    userId: user.id,
    nickname: input.nickname ?? null,
    vehicleClass: input.vehicleClass,
    make: input.make ?? null,
    model: input.model ?? null,
    color: input.color ?? null,
    licensePlate: input.licensePlate.trim(),
    fuelType: input.fuelType ?? null,
    notes: input.notes ?? null
  };

  const [createdVehicle] = await db
    .insert(vehicles)
    .values(newVehicle)
    .returning();

  return createdVehicle;
}

export async function updateVehicleForUser(
  vehicleId: number,
  input: z.infer<typeof updateVehicleInputSchema>,
  user: User
) {
  const existingVehicle = await db.query.vehicles.findFirst({
    where: and(eq(vehicles.id, vehicleId), eq(vehicles.userId, user.id))
  });

  if (!existingVehicle) {
    return null;
  }

  const [updatedVehicle] = await db
    .update(vehicles)
    .set({
      nickname: input.nickname ?? existingVehicle.nickname,
      vehicleClass: input.vehicleClass ?? existingVehicle.vehicleClass,
      make: input.make ?? existingVehicle.make,
      model: input.model ?? existingVehicle.model,
      color: input.color ?? existingVehicle.color,
      licensePlate: input.licensePlate?.trim() ?? existingVehicle.licensePlate,
      fuelType: input.fuelType ?? existingVehicle.fuelType,
      notes: input.notes ?? existingVehicle.notes,
      updatedAt: new Date()
    })
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, user.id)))
    .returning();

  return updatedVehicle;
}
