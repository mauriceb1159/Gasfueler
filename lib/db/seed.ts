import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users, teams, teamMembers } from './schema';
import { hashPassword } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';

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

async function seed() {
  const email = 'test@test.com';
  const password = 'admin123';
  let [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    const passwordHash = await hashPassword(password);

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
    console.log('Initial user already exists. Reusing existing user.');
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
