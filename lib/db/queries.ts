import { desc, and, eq, isNull, asc, gt } from 'drizzle-orm';
import { db } from './drizzle';
import {
  activityLogs,
  fuelRequests,
  orders,
  stationHours,
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
import { getEffectiveFuelPricesForStation } from '@/lib/fuel-pricing';

const MIN_OPEN_SERVICE_SLOTS = 6;
const SLOT_DURATION_MINUTES = 45;
const SLOT_INTERVAL_MINUTES = 120;
const SLOT_GENERATION_DAYS = 7;

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  let sessionData;

  try {
    sessionData = await verifyToken(sessionCookie.value);
  } catch {
    return null;
  }

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
  await ensureUpcomingServiceSlotsForActiveStations();

  try {
    const stationsResult = await db.query.stations.findMany({
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

    return await Promise.all(
      stationsResult.map(async (station) => ({
        ...station,
        fuelPrices: await getEffectiveFuelPricesForStation(station)
      }))
    );
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

    return await Promise.all(
      fallbackStations.map(async (station) => ({
        ...station,
        fuelPrices: await getEffectiveFuelPricesForStation(station)
      }))
    );
  }
}

export async function getStationsForPricing() {
  try {
    const stationsResult = await db.query.stations.findMany({
      where: eq(stations.active, true),
      with: {
        fuelPrices: {
          orderBy: (fuelPrices, { desc }) => [desc(fuelPrices.recordedAt)]
        }
      },
      orderBy: asc(stations.name)
    });

    return await Promise.all(
      stationsResult.map(async (station) => ({
        ...station,
        fuelPrices: await getEffectiveFuelPricesForStation(station)
      }))
    );
  } catch (error) {
    if (!isMissingFuelPricesTableError(error)) {
      throw error;
    }

    const fallbackStations = await db.query.stations.findMany({
      where: eq(stations.active, true),
      orderBy: asc(stations.name)
    });

    return await Promise.all(
      fallbackStations.map(async (station) => ({
        ...station,
        fuelPrices: await getEffectiveFuelPricesForStation(station)
      }))
    );
  }
}

export async function getStoreStations() {
  const stationsResult = await db.query.stations.findMany({
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
      }
    },
    orderBy: asc(stations.name)
  });

  return stationsResult.filter((station) => station.stationStoreItems.length > 0);
}

export async function getStoreOrdersForUser(userId: number) {
  return db.query.orders.findMany({
    where: and(eq(orders.userId, userId), eq(orders.orderType, 'store_only')),
    with: {
      station: true,
      orderItems: true
    },
    orderBy: desc(orders.createdAt)
  });
}

export async function getStoreOrderById(orderId: number, userId: number) {
  return db.query.orders.findFirst({
    where: and(
      eq(orders.id, orderId),
      eq(orders.userId, userId),
      eq(orders.orderType, 'store_only')
    ),
    with: {
      station: true,
      orderItems: true
    }
  });
}

export async function getStoreOrdersForFulfillment() {
  return db.query.orders.findMany({
    where: eq(orders.orderType, 'store_only'),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true
        }
      },
      station: true,
      orderItems: true
    },
    orderBy: desc(orders.createdAt),
    limit: 30
  });
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

async function ensureUpcomingServiceSlotsForActiveStations() {
  const activeStations = await db.query.stations.findMany({
    where: eq(stations.active, true),
    with: {
      stationHours: {
        orderBy: asc(stationHours.dayOfWeek)
      }
    }
  });

  await Promise.all(
    activeStations.map((station) => ensureUpcomingServiceSlotsForStation(station))
  );
}

async function ensureUpcomingServiceSlotsForStation(station: {
  id: number;
  stationHours: {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
  }[];
}) {
  const now = new Date();
  const existingFutureSlots = await db
    .select({
      startAt: serviceSlots.startAt,
      endAt: serviceSlots.endAt,
      status: serviceSlots.status
    })
    .from(serviceSlots)
    .where(and(eq(serviceSlots.stationId, station.id), gt(serviceSlots.endAt, now)))
    .orderBy(asc(serviceSlots.startAt));

  const openFutureSlotCount = existingFutureSlots.filter(
    (slot) => slot.status === 'open'
  ).length;

  if (openFutureSlotCount >= MIN_OPEN_SERVICE_SLOTS) {
    return;
  }

  const existingStartTimes = new Set(
    existingFutureSlots.map((slot) => slot.startAt.getTime())
  );
  const slotsToCreate: {
    stationId: number;
    startAt: Date;
    endAt: Date;
    capacity: number;
    bookedCount: number;
    status: string;
  }[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < SLOT_GENERATION_DAYS; dayOffset += 1) {
    if (openFutureSlotCount + slotsToCreate.length >= MIN_OPEN_SERVICE_SLOTS) {
      break;
    }

    const slotDate = new Date(today);
    slotDate.setDate(slotDate.getDate() + dayOffset);

    const hoursForDay = station.stationHours.find(
      (hours) => hours.dayOfWeek === slotDate.getDay()
    );

    if (!hoursForDay) {
      continue;
    }

    const openAt = applyTimeToDate(slotDate, hoursForDay.openTime);
    const closeAt = applyTimeToDate(slotDate, hoursForDay.closeTime);

    for (
      let startAt = new Date(openAt);
      startAt < closeAt &&
      openFutureSlotCount + slotsToCreate.length < MIN_OPEN_SERVICE_SLOTS;
      startAt = addMinutes(startAt, SLOT_INTERVAL_MINUTES)
    ) {
      const endAt = addMinutes(startAt, SLOT_DURATION_MINUTES);
      const startTime = startAt.getTime();

      if (startAt <= now || endAt > closeAt || existingStartTimes.has(startTime)) {
        continue;
      }

      slotsToCreate.push({
        stationId: station.id,
        startAt,
        endAt,
        capacity: 2,
        bookedCount: 0,
        status: 'open'
      });
      existingStartTimes.add(startTime);
    }
  }

  if (slotsToCreate.length > 0) {
    await db.insert(serviceSlots).values(slotsToCreate);
  }
}

function applyTimeToDate(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const nextDate = new Date(date);
  nextDate.setHours(hours || 0, minutes || 0, 0, 0);
  return nextDate;
}

function addMinutes(date: Date, minutes: number) {
  const nextDate = new Date(date);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);
  return nextDate;
}
