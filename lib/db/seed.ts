import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import {
  serviceSlots,
  ServiceSlotStatus,
  stationFuelPrices,
  stationHours,
  stationStoreItems,
  stations,
  storeCategories,
  storeItems,
  teams,
  teamMembers,
  users
} from './schema';
import { hashPassword } from '@/lib/auth/session';
import { eq, and, gte } from 'drizzle-orm';

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...');

  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Base subscription plan',
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800, // $8 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200, // $12 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  console.log('Stripe products and prices created successfully.');
}

function shouldSkipStripeSeed() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  return (
    !stripeKey ||
    stripeKey.includes('replace_me') ||
    stripeKey.trim().length === 0
  );
}

async function ensureDemoStation({
  name,
  address,
  city,
  state,
  zip,
  latitude = null,
  longitude = null,
  supportsSnacks = true
}: {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude?: string | null;
  longitude?: string | null;
  supportsSnacks?: boolean;
}) {
  let [station] = await db
    .select()
    .from(stations)
    .where(eq(stations.name, name))
    .limit(1);

  if (!station) {
    [station] = await db
      .insert(stations)
      .values({
        name,
        address,
        city,
        state,
        zip,
        latitude,
        longitude,
        active: true,
        supportsSnacks
      })
      .returning();

    console.log(`${name} created.`);
  } else {
    console.log(`${name} already exists. Reusing existing station.`);
  }

  const existingHours = await db
    .select()
    .from(stationHours)
    .where(eq(stationHours.stationId, station.id));

  if (existingHours.length === 0) {
    await db.insert(stationHours).values(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        stationId: station.id,
        dayOfWeek,
        openTime: '07:00',
        closeTime: '21:00'
      }))
    );

    console.log(`${name} hours created.`);
  }

  const fuelGrades = [
    { fuelGrade: 'regular', priceCents: 459 },
    { fuelGrade: 'midgrade', priceCents: 489 },
    { fuelGrade: 'premium', priceCents: 519 }
  ];

  for (const fuelGrade of fuelGrades) {
    const [existingPrice] = await db
      .select()
      .from(stationFuelPrices)
      .where(
        and(
          eq(stationFuelPrices.stationId, station.id),
          eq(stationFuelPrices.fuelGrade, fuelGrade.fuelGrade)
        )
      )
      .limit(1);

    if (!existingPrice) {
      await db.insert(stationFuelPrices).values({
        stationId: station.id,
        fuelGrade: fuelGrade.fuelGrade,
        priceCents: fuelGrade.priceCents,
        source: 'manual'
      });
    }
  }

  const now = new Date();
  const nextMorning = new Date(now);
  nextMorning.setDate(nextMorning.getDate() + 1);
  nextMorning.setHours(9, 0, 0, 0);

  const existingUpcomingSlots = await db
    .select()
    .from(serviceSlots)
    .where(
      and(
        eq(serviceSlots.stationId, station.id),
        gte(serviceSlots.startAt, now)
      )
    );

  if (existingUpcomingSlots.length === 0) {
    const demoSlots = Array.from({ length: 6 }, (_, index) => {
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
    });

    await db.insert(serviceSlots).values(demoSlots);
    console.log(`${name} service slots created.`);
  }
}

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
  basePriceCents
}: {
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  basePriceCents: number;
}) {
  let [item] = await db
    .select()
    .from(storeItems)
    .where(eq(storeItems.slug, slug))
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

async function ensureStationStoreCatalog() {
  const snackCategory = await ensureStoreCategory({
    name: 'Snacks',
    slug: 'snacks',
    sortOrder: 1
  });
  const drinksCategory = await ensureStoreCategory({
    name: 'Drinks',
    slug: 'drinks',
    sortOrder: 2
  });
  const essentialsCategory = await ensureStoreCategory({
    name: 'Essentials',
    slug: 'essentials',
    sortOrder: 3
  });

  const catalog = [
    {
      categoryId: snackCategory.id,
      name: 'Kettle Chips',
      slug: 'kettle-chips',
      description: 'Sea salt kettle chips for a quick road snack.',
      imageUrl: '/store-items/kettle-chips.svg',
      basePriceCents: 279
    },
    {
      categoryId: snackCategory.id,
      name: 'Protein Bar',
      slug: 'protein-bar',
      description: 'Chocolate peanut butter protein bar.',
      imageUrl: '/store-items/protein-bar.svg',
      basePriceCents: 349
    },
    {
      categoryId: drinksCategory.id,
      name: 'Cold Brew Coffee',
      slug: 'cold-brew-coffee',
      description: 'Ready-to-drink cold brew over ice.',
      imageUrl: '/store-items/cold-brew-coffee.svg',
      basePriceCents: 429
    },
    {
      categoryId: drinksCategory.id,
      name: 'Sparkling Water',
      slug: 'sparkling-water',
      description: 'Lime sparkling water, chilled and ready.',
      imageUrl: '/store-items/sparkling-water.svg',
      basePriceCents: 219
    },
    {
      categoryId: essentialsCategory.id,
      name: 'Windshield Wipes',
      slug: 'windshield-wipes',
      description: 'Travel pack for quick glass cleanup.',
      imageUrl: '/store-items/windshield-wipes.svg',
      basePriceCents: 599
    },
    {
      categoryId: essentialsCategory.id,
      name: 'Phone Charger',
      slug: 'phone-charger',
      description: 'Universal USB-C charging cable.',
      imageUrl: '/store-items/phone-charger.svg',
      basePriceCents: 1299
    }
  ];

  const stationsResult = await db
    .select({
      id: stations.id,
      name: stations.name
    })
    .from(stations)
    .where(eq(stations.active, true));

  for (const station of stationsResult) {
    for (const catalogItem of catalog) {
      const item = await ensureStoreItem(catalogItem);

      const [existingStationItem] = await db
        .select()
        .from(stationStoreItems)
        .where(
          and(
            eq(stationStoreItems.stationId, station.id),
            eq(stationStoreItems.storeItemId, item.id)
          )
        )
        .limit(1);

      if (!existingStationItem) {
        await db.insert(stationStoreItems).values({
          stationId: station.id,
          storeItemId: item.id,
          priceCents: item.basePriceCents,
          active: true,
          inventoryCount: 24
        });
      }
    }

    console.log(`${station.name} store catalog ensured.`);
  }
}

async function ensureStationSpecificCatalogs() {
  const [extraMileStation] = await db
    .select({
      id: stations.id
    })
    .from(stations)
    .where(eq(stations.name, 'EXTRAMILE #97947'))
    .limit(1);

  if (!extraMileStation) {
    return;
  }

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

  const extraMileCatalog = [
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
      imageUrl: '/store-items/snack-chips.svg',
      basePriceCents: 299
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

  for (const catalogItem of extraMileCatalog) {
    const item = await ensureStoreItem(catalogItem);

    const [existingStationItem] = await db
      .select()
      .from(stationStoreItems)
      .where(
        and(
          eq(stationStoreItems.stationId, extraMileStation.id),
          eq(stationStoreItems.storeItemId, item.id)
        )
      )
      .limit(1);

    if (!existingStationItem) {
      await db.insert(stationStoreItems).values({
        stationId: extraMileStation.id,
        storeItemId: item.id,
        priceCents: item.basePriceCents,
        active: true,
        inventoryCount: 24
      });
    } else {
      await db
        .update(stationStoreItems)
        .set({
          priceCents: item.basePriceCents,
          active: true,
          inventoryCount: 24,
          updatedAt: new Date()
        })
        .where(eq(stationStoreItems.id, existingStationItem.id));
    }
  }

  console.log('EXTRAMILE #97947 catalog ensured.');
}

async function seed() {
  const email = 'test@test.com';
  const password = 'Fuelup2026!';
  const passwordHash = await hashPassword(password);
  let [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    [user] = await db
      .insert(users)
      .values([
        {
          email: email,
          passwordHash: passwordHash,
          role: 'owner',
        },
      ])
      .returning();

    console.log('Initial user created.');
  } else {
    [user] = await db
      .update(users)
      .set({
        passwordHash,
      })
      .where(eq(users.id, user.id))
      .returning();

    console.log('Initial user already exists. Password reset for local demo.');
  }

  let [team] = await db.select().from(teams).where(eq(teams.name, 'Test Team'));

  if (!team) {
    [team] = await db
      .insert(teams)
      .values({
        name: 'Test Team',
      })
      .returning();

    console.log('Test team created.');
  } else {
    console.log('Test team already exists. Reusing existing team.');
  }

  const [existingMembership] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, user.id)));

  if (!existingMembership) {
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: 'owner',
    });

    console.log('Team membership created.');
  } else {
    console.log('Team membership already exists. Skipping.');
  }

  await ensureDemoStation({
    name: 'FuelUp Downtown Demo',
    address: '245 Market Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94105',
    latitude: '37.7937',
    longitude: '-122.3950'
  });

  await ensureDemoStation({
    name: 'Shell El Dorado Hills',
    address: '1021 Saratoga Way',
    city: 'El Dorado Hills',
    state: 'CA',
    zip: '95762',
    latitude: '38.6857',
    longitude: '-121.0822'
  });

  await ensureDemoStation({
    name: 'EXTRAMILE #97947',
    address: '3381 COACH LN',
    city: 'CAMERON PARK',
    state: 'CA',
    zip: '95682-8455'
  });

  await ensureStationStoreCatalog();
  await ensureStationSpecificCatalogs();

  if (shouldSkipStripeSeed()) {
    console.log(
      'Skipping Stripe product seed because STRIPE_SECRET_KEY is missing or using a placeholder value.'
    );
    return;
  }

  await createStripeProducts();
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });
