import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db/drizzle';
import {
  dispatchAssignments,
  dispatchEvents,
  dispatchJobs,
  DispatchAssignmentStatus,
  DispatchJobStatus,
  DispatchJobType,
  drivers,
  DriverAvailabilityStatus,
  fuelRequests,
  orders,
  stations,
  type User,
  users,
} from '@/lib/db/schema';

export const createDriverInputSchema = z.object({
  userId: z.coerce.number().int().positive(),
  phone: z.string().trim().max(30).optional(),
  currentStationId: z.coerce.number().int().positive().optional(),
  availabilityStatus: z
    .enum([
      DriverAvailabilityStatus.OFFLINE,
      DriverAvailabilityStatus.AVAILABLE,
      DriverAvailabilityStatus.ON_JOB,
      DriverAvailabilityStatus.BREAK,
    ])
    .optional(),
});

export const createDispatchJobInputSchema = z
  .object({
    fuelRequestId: z.coerce.number().int().positive().optional(),
    orderId: z.coerce.number().int().positive().optional(),
    jobType: z.enum([
      DispatchJobType.FUEL,
      DispatchJobType.STORE,
      DispatchJobType.COMBO,
    ]),
    customerUserId: z.coerce.number().int().positive(),
    stationId: z.coerce.number().int().positive(),
    priority: z.coerce.number().int().min(0).max(10).optional(),
    scheduledStartAt: z.string().datetime().optional(),
    scheduledEndAt: z.string().datetime().optional(),
    driverNotes: z.string().trim().max(1000).optional(),
    dispatcherNotes: z.string().trim().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.fuelRequestId && !data.orderId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fuelRequestId'],
        message: 'A dispatch job should reference a fuel request or an order.',
      });
    }
  });

export const assignDispatchJobInputSchema = z.object({
  driverId: z.coerce.number().int().positive(),
});

export async function listDrivers() {
  return db.query.drivers.findMany({
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      currentStation: {
        columns: {
          id: true,
          name: true,
          city: true,
          state: true,
        },
      },
    },
    orderBy: (drivers, { desc }) => [desc(drivers.createdAt)],
  });
}

export async function createDriverProfile(input: z.infer<typeof createDriverInputSchema>) {
  const [user] = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (!user) {
    return { error: 'Selected user could not be found.' as const };
  }

  const [existingDriver] = await db
    .select({ id: drivers.id })
    .from(drivers)
    .where(eq(drivers.userId, input.userId))
    .limit(1);

  if (existingDriver) {
    return { error: 'That user already has a driver profile.' as const };
  }

  if (input.currentStationId) {
    const [station] = await db
      .select({ id: stations.id })
      .from(stations)
      .where(eq(stations.id, input.currentStationId))
      .limit(1);

    if (!station) {
      return { error: 'Selected station could not be found.' as const };
    }
  }

  const [createdDriver] = await db
    .insert(drivers)
    .values({
      userId: input.userId,
      phone: input.phone?.trim() || null,
      currentStationId: input.currentStationId ?? null,
      availabilityStatus:
        input.availabilityStatus ?? DriverAvailabilityStatus.OFFLINE,
    })
    .returning();

  return createdDriver;
}

export async function listDispatchJobs() {
  return db.query.dispatchJobs.findMany({
    with: {
      customerUser: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      station: {
        columns: {
          id: true,
          name: true,
          city: true,
          state: true,
        },
      },
      fuelRequest: {
        columns: {
          id: true,
          status: true,
          fuelGrade: true,
        },
      },
      order: {
        columns: {
          id: true,
          orderType: true,
          fulfillmentStatus: true,
          totalAmount: true,
        },
      },
      assignments: {
        with: {
          driver: {
            columns: {
              id: true,
              availabilityStatus: true,
            },
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: (dispatchJobs, { desc }) => [desc(dispatchJobs.createdAt)],
  });
}

export async function createDispatchJob(
  input: z.infer<typeof createDispatchJobInputSchema>,
  actor: User
) {
  const [customer] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, input.customerUserId))
    .limit(1);

  if (!customer) {
    return { error: 'Selected customer could not be found.' as const };
  }

  const [station] = await db
    .select({ id: stations.id })
    .from(stations)
    .where(eq(stations.id, input.stationId))
    .limit(1);

  if (!station) {
    return { error: 'Selected station could not be found.' as const };
  }

  if (input.fuelRequestId) {
    const [request] = await db
      .select({ id: fuelRequests.id })
      .from(fuelRequests)
      .where(eq(fuelRequests.id, input.fuelRequestId))
      .limit(1);

    if (!request) {
      return { error: 'Selected fuel request could not be found.' as const };
    }
  }

  if (input.orderId) {
    const [order] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1);

    if (!order) {
      return { error: 'Selected order could not be found.' as const };
    }
  }

  const [createdJob] = await db
    .insert(dispatchJobs)
    .values({
      fuelRequestId: input.fuelRequestId ?? null,
      orderId: input.orderId ?? null,
      jobType: input.jobType,
      customerUserId: input.customerUserId,
      stationId: input.stationId,
      status: DispatchJobStatus.UNASSIGNED,
      priority: input.priority ?? 0,
      scheduledStartAt: input.scheduledStartAt
        ? new Date(input.scheduledStartAt)
        : null,
      scheduledEndAt: input.scheduledEndAt ? new Date(input.scheduledEndAt) : null,
      driverNotes: input.driverNotes?.trim() || null,
      dispatcherNotes: input.dispatcherNotes?.trim() || null,
    })
    .returning();

  await db.insert(dispatchEvents).values({
    dispatchJobId: createdJob.id,
    actorUserId: actor.id,
    eventType: 'job_created',
    payload: {
      jobType: createdJob.jobType,
      priority: createdJob.priority,
    },
  });

  return createdJob;
}

export async function assignDispatchJob(
  jobId: number,
  input: z.infer<typeof assignDispatchJobInputSchema>,
  actor: User
) {
  const [job] = await db
    .select()
    .from(dispatchJobs)
    .where(eq(dispatchJobs.id, jobId))
    .limit(1);

  if (!job) {
    return { error: 'Dispatch job could not be found.' as const };
  }

  const [driver] = await db
    .select()
    .from(drivers)
    .where(and(eq(drivers.id, input.driverId), eq(drivers.active, true)))
    .limit(1);

  if (!driver) {
    return { error: 'Driver could not be found.' as const };
  }

  await db
    .update(dispatchAssignments)
    .set({
      assignmentStatus: DispatchAssignmentStatus.REASSIGNED,
    })
    .where(eq(dispatchAssignments.dispatchJobId, jobId));

  const [assignment] = await db
    .insert(dispatchAssignments)
    .values({
      dispatchJobId: jobId,
      driverId: input.driverId,
      assignedByUserId: actor.id,
      assignmentStatus: DispatchAssignmentStatus.ASSIGNED,
    })
    .returning();

  await db
    .update(dispatchJobs)
    .set({
      status: DispatchJobStatus.ASSIGNED,
      updatedAt: new Date(),
    })
    .where(eq(dispatchJobs.id, jobId));

  await db
    .update(drivers)
    .set({
      availabilityStatus: DriverAvailabilityStatus.ON_JOB,
      updatedAt: new Date(),
    })
    .where(eq(drivers.id, input.driverId));

  await db.insert(dispatchEvents).values({
    dispatchJobId: jobId,
    actorUserId: actor.id,
    eventType: 'driver_assigned',
    payload: {
      driverId: input.driverId,
      assignmentId: assignment.id,
    },
  });

  return assignment;
}
