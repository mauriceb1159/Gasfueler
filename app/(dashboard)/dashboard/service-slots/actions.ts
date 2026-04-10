'use server';

import { and, eq, gt, lt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { validatedActionWithUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import {
  serviceSlots,
  ServiceSlotStatus,
  stations
} from '@/lib/db/schema';

const createSlotSchema = z.object({
  stationId: z.coerce.number().int().positive(),
  slotDate: z.string().min(1, 'Choose a slot date.'),
  startTime: z.string().min(1, 'Choose a start time.'),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  capacity: z.coerce.number().int().min(1).max(10)
});

const updateSlotStatusSchema = z.object({
  slotId: z.coerce.number().int().positive(),
  status: z.enum([
    ServiceSlotStatus.OPEN,
    ServiceSlotStatus.FULL,
    ServiceSlotStatus.CLOSED
  ])
});

export const createServiceSlot = validatedActionWithUser(
  createSlotSchema,
  async (data, _, user) => {
    if (user.role !== 'owner') {
      return { error: 'Only owners can create service slots.' };
    }

    const [station] = await db
      .select({ id: stations.id, name: stations.name })
      .from(stations)
      .where(eq(stations.id, data.stationId))
      .limit(1);

    if (!station) {
      return { error: 'That station could not be found.' };
    }

    const startAt = parseLocalSlotDateTime(data.slotDate, data.startTime);

    if (Number.isNaN(startAt.getTime())) {
      return { error: 'Enter a valid slot date and time.' };
    }

    if (startAt <= new Date()) {
      return { error: 'Service slots must be scheduled in the future.' };
    }

    const endAt = new Date(startAt);
    endAt.setMinutes(endAt.getMinutes() + data.durationMinutes);

    const [conflictingSlot] = await db
      .select({ id: serviceSlots.id })
      .from(serviceSlots)
      .where(
        and(
          eq(serviceSlots.stationId, station.id),
          lt(serviceSlots.startAt, endAt),
          gt(serviceSlots.endAt, startAt)
        )
      )
      .limit(1);

    if (conflictingSlot) {
      return {
        error:
          'That time overlaps an existing service slot for this station.'
      };
    }

    await db.insert(serviceSlots).values({
      stationId: station.id,
      startAt,
      endAt,
      capacity: data.capacity,
      bookedCount: 0,
      status: ServiceSlotStatus.OPEN
    });

    revalidatePath('/dashboard/service-slots');
    revalidatePath('/book');

    return {
      success: `Created a ${data.durationMinutes}-minute slot for ${station.name}.`
    };
  }
);

export const updateServiceSlotStatus = validatedActionWithUser(
  updateSlotStatusSchema,
  async (data, _, user) => {
    if (user.role !== 'owner') {
      return { error: 'Only owners can update service slots.' };
    }

    const [slot] = await db
      .select({
        id: serviceSlots.id,
        stationId: serviceSlots.stationId
      })
      .from(serviceSlots)
      .where(eq(serviceSlots.id, data.slotId))
      .limit(1);

    if (!slot) {
      return { error: 'That service slot could not be found.' };
    }

    await db
      .update(serviceSlots)
      .set({
        status: data.status,
        updatedAt: new Date()
      })
      .where(eq(serviceSlots.id, slot.id));

    revalidatePath('/dashboard/service-slots');
    revalidatePath('/book');

    return { success: 'Service slot updated.' };
  }
);

function parseLocalSlotDateTime(slotDate: string, startTime: string) {
  const [year, month, day] = slotDate.split('-').map(Number);
  const [hours, minutes] = startTime.split(':').map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return new Date(Number.NaN);
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}
