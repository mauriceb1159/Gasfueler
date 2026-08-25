'use server';

import { z } from 'zod';

import { validatedActionWithUser } from '@/lib/auth/middleware';
import { canManageStationOperations } from '@/lib/auth/roles';
import { db } from '@/lib/db/drizzle';
import {
  serviceSlots,
  ServiceSlotStatus,
  stationHours,
  stationStoreItems,
  stationFuelPrices,
  stations,
  StationFuelPriceMode,
  storeCategories,
  storeItems
} from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

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

const EXTRAMILE_97947_NAME = 'EXTRAMILE #97947';

async function ensureStoreCategory({
  name,
  slug,
  sortOrder
}: {
  name: string;
  slug: string;
  sortOrder: number;
}) {
  let [category] = await db
    .select()
    .from(storeCategories)
    .where(eq(storeCategories.slug, slug))
    .limit(1);

  if (!category) {
    [category] = await db
      .insert(storeCategories)
      .values({
        name,
        slug,
        sortOrder,
        active: true
      })
      .returning();
  }

  return category;
}

async function ensureStoreItem({
  categoryId,
  name,
  slug,
  description,
  imageUrl,
  basePriceCents,
  legacySlugs = []
}: {
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  basePriceCents: number;
  legacySlugs?: string[];
}) {
  const candidateSlugs = [slug, ...legacySlugs];
  let [item] = await db
    .select()
    .from(storeItems)
    .where(inArray(storeItems.slug, candidateSlugs))
    .limit(1);

  if (!item) {
    [item] = await db
      .insert(storeItems)
      .values({
        categoryId,
        name,
        slug,
        description,
        imageUrl,
        basePriceCents,
        active: true
      })
      .returning();
  } else {
    [item] = await db
      .update(storeItems)
      .set({
        categoryId,
        name,
        slug,
        description,
        imageUrl,
        basePriceCents,
        active: true,
        updatedAt: new Date()
      })
      .where(eq(storeItems.id, item.id))
      .returning();
  }

  return item;
}

async function ensureStationStoreItem({
  stationId,
  storeItemId,
  priceCents,
  inventoryCount = 24
}: {
  stationId: number;
  storeItemId: number;
  priceCents: number;
  inventoryCount?: number;
}) {
  const [existingStationItem] = await db
    .select()
    .from(stationStoreItems)
    .where(
      and(
        eq(stationStoreItems.stationId, stationId),
        eq(stationStoreItems.storeItemId, storeItemId)
      )
    )
    .limit(1);

  if (!existingStationItem) {
    await db.insert(stationStoreItems).values({
      stationId,
      storeItemId,
      priceCents,
      active: true,
      inventoryCount
    });
    return;
  }

  await db
    .update(stationStoreItems)
    .set({
      priceCents,
      active: true,
      inventoryCount,
      updatedAt: new Date()
    })
    .where(eq(stationStoreItems.id, existingStationItem.id));
}

async function ensureExtraMile97947Catalog(stationId: number) {
  const snacksCategory = await ensureStoreCategory({
    name: 'Snacks',
    slug: 'snacks',
    sortOrder: 1
  });
  const candyCategory = await ensureStoreCategory({
    name: 'Candy',
    slug: 'candy',
    sortOrder: 2
  });
  const bakeryCategory = await ensureStoreCategory({
    name: 'Bakery',
    slug: 'bakery',
    sortOrder: 3
  });
  const gumCategory = await ensureStoreCategory({
    name: 'Gum & Mints',
    slug: 'gum-mints',
    sortOrder: 4
  });

  const catalog = [
    {
      categoryId: snacksCategory.id,
      name: 'Barcel Takis Fuego',
      slug: 'extramile-barcel-takis-fuego',
      description: 'Rolled tortilla chips with a hot chile lime kick.',
      imageUrl: '/store-items/snack-chips.svg',
      basePriceCents: 329
    },
    {
      categoryId: bakeryCategory.id,
      name: 'Bon Appetit Apple Turnover Danish',
      slug: 'extramile-bon-appetit-apple-turnover-danish',
      description: 'Flaky pastry with apple filling for a quick sweet bite.',
      imageUrl: '/store-items/pastry-baked.svg',
      basePriceCents: 349
    },
    {
      categoryId: bakeryCategory.id,
      name: 'Bon Appetit Banana Bread',
      slug: 'extramile-bon-appetit-banana-bread',
      description: 'Soft banana bread loaf for an easy grab-and-go breakfast.',
      imageUrl: '/store-items/pastry-baked.svg',
      basePriceCents: 329
    },
    {
      categoryId: bakeryCategory.id,
      name: 'Bon Appetit Cheese Croissant Danish',
      slug: 'extramile-bon-appetit-cheese-croissant-danish',
      description: 'Buttery pastry with a sweet cheese center.',
      imageUrl: '/store-items/pastry-baked.svg',
      basePriceCents: 369
    },
    {
      categoryId: bakeryCategory.id,
      name: 'Bon Appetit Cheese Danish',
      slug: 'extramile-bon-appetit-cheese-danish',
      description: 'Classic cheese danish for a quick bakery pick.',
      imageUrl: '/store-items/pastry-baked.svg',
      basePriceCents: 349
    },
    {
      categoryId: snacksCategory.id,
      name: 'Cheetos Flamin Hot',
      slug: 'extramile-cheetos-flamin-hot',
      description: 'Spicy crunchy cheese snacks with classic heat.',
      imageUrl: '/store-items/snack-chips.svg',
      basePriceCents: 289
    },
    {
      categoryId: snacksCategory.id,
      name: 'Cheetos Flamin Hot Lime',
      slug: 'extramile-cheetos-flamin-hot-lime',
      description: 'Flamin Hot crunch with a bright lime finish.',
      imageUrl: '/store-items/snack-chips.svg',
      basePriceCents: 289
    },
    {
      categoryId: snacksCategory.id,
      name: "Chester's Flamin' Hot Fries",
      slug: 'extramile-chesters-flamin-hot-fries',
      description: 'Crunchy spicy fries for a quick snack stop.',
      imageUrl: '/store-items/snack-chips.svg',
      basePriceCents: 289
    },
    {
      categoryId: snacksCategory.id,
      name: 'Doritos Nacho Cheese',
      slug: 'extramile-doritos-nacho-cheese',
      description: 'Bold nacho tortilla chips in a shareable bag.',
      imageUrl: '/store-items/doritos-nacho.jpg',
      basePriceCents: 299,
      legacySlugs: ['doritos-nacho-cheese']
    },
    {
      categoryId: gumCategory.id,
      name: 'Extra Polar Ice',
      slug: 'extramile-extra-polar-ice',
      description: 'Mint gum for a fresh finish on the road.',
      imageUrl: '/store-items/gum-pack.svg',
      basePriceCents: 219
    },
    {
      categoryId: candyCategory.id,
      name: 'Life Savers Gummies',
      slug: 'extramile-life-savers-gummies',
      description: 'Fruity gummy candy in a resealable share-size bag.',
      imageUrl: '/store-items/candy-share.svg',
      basePriceCents: 329
    },
    {
      categoryId: candyCategory.id,
      name: 'Skittles Share Size',
      slug: 'extramile-skittles-share-size',
      description: 'Fruit candy share bag for the ride.',
      imageUrl: '/store-items/candy-share.svg',
      basePriceCents: 329
    },
    {
      categoryId: candyCategory.id,
      name: 'Twix Share Size',
      slug: 'extramile-twix-share-size',
      description: 'Cookie bar share bag with caramel and chocolate.',
      imageUrl: '/store-items/candy-share.svg',
      basePriceCents: 349
    }
  ];

  for (const catalogItem of catalog) {
    const item = await ensureStoreItem(catalogItem);
    await ensureStationStoreItem({
      stationId,
      storeItemId: item.id,
      priceCents: item.basePriceCents
    });
  }
}

export const saveStationFuelPrices = validatedActionWithUser(
  fuelPriceSchema,
  async (data, _, user) => {
    if (!canManageStationOperations(user.role)) {
      return { error: 'Only station attendants and admins can update partner fuel prices.' };
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
    if (!canManageStationOperations(user.role)) {
      return { error: 'Only station attendants and admins can update fuel price source settings.' };
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
    if (!canManageStationOperations(user.role)) {
      return { error: 'Only station attendants and admins can add partner stations.' };
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
      if (normalizedInput.name === EXTRAMILE_97947_NAME) {
        await ensureExtraMile97947Catalog(existingStation.id);
      }

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

    if (normalizedInput.name === EXTRAMILE_97947_NAME) {
      await ensureExtraMile97947Catalog(station.id);
    }

    return {
      success: `${station.name} is now added as a partner station.`
    };
  }
);
