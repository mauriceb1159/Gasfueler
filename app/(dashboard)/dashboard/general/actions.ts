'use server';

import { z } from 'zod';

import { validatedActionWithUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import {
  serviceSlots,
  ServiceSlotStatus,
  stationHours,
  stationFuelPrices,
  stations,
  StationFuelPriceMode
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const fuelPriceSchema = z
  .object({
    stationId: z.coerce.number().int().positive(),
    regularPrice: z.string().optional(),
    midgradePrice: z.string().optional(),
    premiumPrice: z.string().optional(),
    dieselPrice: z.string().optional()
  })
  .superRefine((data, ctx) => {
    const hasAnyPrice = [
      data.regularPrice,
      data.midgradePrice,
      data.premiumPrice,
      data.dieselPrice
    ].some((value) => value && value.trim().length > 0);

    if (!hasAnyPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter at least one fuel price before saving.'
      });
    }
  });

function parsePriceToCents(value?: string) {
  if (!value?.trim()) {
    return null;
  }

  const numericValue = Number(value.trim());

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return Math.round(numericValue * 100);
}

const fuelPriceModeSchema = z.object({
  stationId: z.coerce.number().int().positive(),
  fuelPriceMode: z.enum([
    StationFuelPriceMode.MANUAL_FIRST,
    StationFuelPriceMode.GOOGLE_FIRST
  ])
});

const createPartnerStationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(255),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(50),
  zip: z.string().trim().min(5).max(20)
});

export const saveStationFuelPrices = validatedActionWithUser(
  fuelPriceSchema,
  async (data, _, user) => {
    if (user.role !== 'owner') {
      return { error: 'Only owners can update partner fuel prices.' };
    }

    const [station] = await db
      .select({ id: stations.id, name: stations.name })
      .from(stations)
      .where(eq(stations.id, data.stationId))
      .limit(1);

    if (!station) {
      return { error: 'That station could not be found.' };
    }

    const entries = [
      ['regular', parsePriceToCents(data.regularPrice)],
      ['midgrade', parsePriceToCents(data.midgradePrice)],
      ['premium', parsePriceToCents(data.premiumPrice)],
      ['diesel', parsePriceToCents(data.dieselPrice)]
    ].filter((entry): entry is [string, number] => entry[1] !== null);

    if (entries.length === 0) {
      return { error: 'Enter at least one valid fuel price above zero.' };
    }

    await db.insert(stationFuelPrices).values(
      entries.map(([fuelGrade, priceCents]) => ({
        stationId: station.id,
        fuelGrade,
        priceCents,
        source: 'manual'
      }))
    );

    return {
      success: `Saved ${entries.length} fuel price${
        entries.length === 1 ? '' : 's'
      } for ${station.name}.`
    };
  }
);

export const saveStationFuelPriceMode = validatedActionWithUser(
  fuelPriceModeSchema,
  async (data, _, user) => {
    if (user.role !== 'owner') {
      return { error: 'Only owners can update fuel price source settings.' };
    }

    const [station] = await db
      .select({ id: stations.id, name: stations.name })
      .from(stations)
      .where(eq(stations.id, data.stationId))
      .limit(1);

    if (!station) {
      return { error: 'That station could not be found.' };
    }

    await db
      .update(stations)
      .set({
        fuelPriceMode: data.fuelPriceMode,
        updatedAt: new Date()
      })
      .where(eq(stations.id, station.id));

    return {
      success: `${station.name} now uses ${
        data.fuelPriceMode === StationFuelPriceMode.GOOGLE_FIRST
          ? 'Google-first'
          : 'manual-first'
      } fuel pricing.`
    };
  }
);

export const createPartnerStation = validatedActionWithUser(
  createPartnerStationSchema,
  async (data, _, user) => {
    if (user.role !== 'owner') {
      return { error: 'Only owners can add partner stations.' };
    }

    const normalizedInput = {
      name: data.name.trim(),
      address: data.address.trim(),
      city: data.city.trim(),
      state: data.state.trim().toUpperCase(),
      zip: data.zip.trim()
    };

    const [existingStation] = await db
      .select({ id: stations.id, name: stations.name })
      .from(stations)
      .where(eq(stations.name, normalizedInput.name))
      .limit(1);

    if (existingStation) {
      return {
        success: `${existingStation.name} already exists.`
      };
    }

    const [station] = await db
      .insert(stations)
      .values({
        ...normalizedInput,
        active: true,
        supportsSnacks: true,
        fuelPriceMode: StationFuelPriceMode.MANUAL_FIRST
      })
      .returning({ id: stations.id, name: stations.name });

    await db.insert(stationHours).values(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        stationId: station.id,
        dayOfWeek,
        openTime: '07:00',
        closeTime: '21:00'
      }))
    );

    await db.insert(stationFuelPrices).values([
      {
        stationId: station.id,
        fuelGrade: 'regular',
        priceCents: 459,
        source: 'manual'
      },
      {
        stationId: station.id,
        fuelGrade: 'midgrade',
        priceCents: 489,
        source: 'manual'
      },
      {
        stationId: station.id,
        fuelGrade: 'premium',
        priceCents: 519,
        source: 'manual'
      }
    ]);

    const nextMorning = new Date();
    nextMorning.setDate(nextMorning.getDate() + 1);
    nextMorning.setHours(9, 0, 0, 0);

    await db.insert(serviceSlots).values(
      Array.from({ length: 6 }, (_, index) => {
        const startAt = new Date(nextMorning);
        startAt.setHours(nextMorning.getHours() + index * 2);

        const endAt = new Date(startAt);
        endAt.setMinutes(endAt.getMinutes() + 45);

        return {
          stationId: station.id,
          startAt,
          endAt,
          capacity: 2,
          bookedCount: 0,
          status: ServiceSlotStatus.OPEN
        };
      })
    );

    return {
      success: `${station.name} is now added as a partner station.`
    };
  }
);
