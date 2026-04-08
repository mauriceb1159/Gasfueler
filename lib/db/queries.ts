import { desc, and, eq, isNull, asc, gt } from 'drizzle-orm';
import { db } from './drizzle';
import {
  activityLogs,
  fuelRequests,
  stationStoreItems,
  serviceSlots,
  stationFuelPrices,
  stations,
  teamMembers,
  teams,
  users,
  vehicles
} from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  return result?.team || null;
}

export async function getVehiclesForUser(userId: number) {
  return db
    .select()
    .from(vehicles)
    .where(eq(vehicles.userId, userId))
    .orderBy(desc(vehicles.updatedAt));
}

export async function getBookableStations() {
  try {
    return await db.query.stations.findMany({
      where: eq(stations.active, true),
      with: {
        fuelPrices: {
          orderBy: (fuelPrices, { desc }) => [desc(fuelPrices.recordedAt)]
        },
        stationStoreItems: {
          where: eq(stationStoreItems.active, true),
          with: {
            storeItem: {
              with: {
                category: true
              }
            }
          },
          orderBy: asc(stationStoreItems.id)
        },
        serviceSlots: {
          where: and(
            eq(serviceSlots.status, 'open'),
            gt(serviceSlots.startAt, new Date())
          ),
          orderBy: asc(serviceSlots.startAt)
        }
      },
      orderBy: asc(stations.name)
    });
  } catch (error) {
    if (!isMissingFuelPricesTableError(error)) {
      throw error;
    }

    const fallbackStations = await db.query.stations.findMany({
      where: eq(stations.active, true),
      with: {
        stationStoreItems: {
          where: eq(stationStoreItems.active, true),
          with: {
            storeItem: {
              with: {
                category: true
              }
            }
          },
          orderBy: asc(stationStoreItems.id)
        },
        serviceSlots: {
          where: and(
            eq(serviceSlots.status, 'open'),
            gt(serviceSlots.startAt, new Date())
          ),
          orderBy: asc(serviceSlots.startAt)
        }
      },
      orderBy: asc(stations.name)
    });

    return fallbackStations.map((station) => ({
      ...station,
      fuelPrices: []
    }));
  }
}

export async function getStationsForPricing() {
  try {
    return await db.query.stations.findMany({
      where: eq(stations.active, true),
      with: {
        fuelPrices: {
          orderBy: (fuelPrices, { desc }) => [desc(fuelPrices.recordedAt)]
        }
      },
      orderBy: asc(stations.name)
    });
  } catch (error) {
    if (!isMissingFuelPricesTableError(error)) {
      throw error;
    }

    const fallbackStations = await db.query.stations.findMany({
      where: eq(stations.active, true),
      orderBy: asc(stations.name)
    });

    return fallbackStations.map((station) => ({
      ...station,
      fuelPrices: []
    }));
  }
}

export async function getFuelRequestsForUser(userId: number) {
  return db.query.fuelRequests.findMany({
    where: eq(fuelRequests.userId, userId),
    with: {
      order: true,
      station: true,
      vehicle: true,
      slot: true,
      items: true
    },
    orderBy: desc(fuelRequests.createdAt)
  });
}

export async function getFuelRequestsForFulfillment() {
  return db.query.fuelRequests.findMany({
    with: {
      order: {
        with: {
          orderItems: true
        }
      },
      user: {
        columns: {
          id: true,
          name: true,
          email: true
        }
      },
      station: true,
      vehicle: true,
      slot: true,
      items: true
    },
    orderBy: desc(fuelRequests.createdAt),
    limit: 20
  });
}

export async function getFuelRequestById(requestId: number) {
  return db.query.fuelRequests.findFirst({
    where: eq(fuelRequests.id, requestId),
    with: {
      order: {
        with: {
          orderItems: true
        }
      },
      user: {
        columns: {
          id: true,
          name: true,
          email: true
        }
      },
      station: true,
      vehicle: true,
      slot: true,
      items: true,
      statusEvents: {
        with: {
          createdByUser: {
            columns: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: (statusEvents, { desc }) => [desc(statusEvents.createdAt)]
      }
    }
  });
}

function isMissingFuelPricesTableError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes('station_fuel_prices')
  );
}
