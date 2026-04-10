'use server';

import { z } from 'zod';

import { validatedActionWithUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import {
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
