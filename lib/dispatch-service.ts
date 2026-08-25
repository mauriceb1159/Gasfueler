import { and, desc, eq, inArray } from 'drizzle-orm';
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
  driverLocations,
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

export const updateDriverJobStatusInputSchema = z.object({
  status: z.enum([
    DispatchJobStatus.ACCEPTED,
    DispatchJobStatus.EN_ROUTE,
    DispatchJobStatus.ARRIVED,
    DispatchJobStatus.SERVICING,
    DispatchJobStatus.COMPLETED,
    DispatchJobStatus.CANCELED,
  ]),
});

export const updateDriverLocationInputSchema = z.object({
  driverId: z.coerce.number().int().positive().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  heading: z.coerce.number().int().min(0).max(359).optional(),
  speed: z.coerce.number().int().min(0).optional(),
  capturedAt: z.string().datetime().optional(),
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

export async function listAssignedDispatchJobsForDriver(actor: User) {
  const driver = await getActiveDriverForUser(actor.id);

  if (!driver) {
    return { error: 'Active driver profile could not be found.' as const };
  }

  const assignedRows = await db
    .select({ dispatchJobId: dispatchAssignments.dispatchJobId })
    .from(dispatchAssignments)
    .where(
      and(
        eq(dispatchAssignments.driverId, driver.id),
        inArray(dispatchAssignments.assignmentStatus, [
          DispatchAssignmentStatus.ASSIGNED,
          DispatchAssignmentStatus.ACCEPTED,
        ])
      )
    );

  const jobIds = assignedRows.map((row) => row.dispatchJobId);

  if (jobIds.length === 0) {
    return [];
  }

  return db.query.dispatchJobs.findMany({
    where: inArray(dispatchJobs.id, jobIds),
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
    orderBy: (dispatchJobs, { desc }) => [desc(dispatchJobs.updatedAt)],
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

export async function createDispatchJobForOrder(input: {
  fuelRequestId?: number | null;
  orderId: number;
  jobType: DispatchJobType;
  customerUserId: number;
  stationId: number;
  scheduledStartAt?: Date | null;
  scheduledEndAt?: Date | null;
  dispatcherNotes?: string | null;
}) {
  const [existingJob] = await db
    .select({ id: dispatchJobs.id })
    .from(dispatchJobs)
    .where(eq(dispatchJobs.orderId, input.orderId))
    .limit(1);

  if (existingJob) {
    return existingJob;
  }

  const [createdJob] = await db
    .insert(dispatchJobs)
    .values({
      fuelRequestId: input.fuelRequestId ?? null,
      orderId: input.orderId,
      jobType: input.jobType,
      customerUserId: input.customerUserId,
      stationId: input.stationId,
      status: DispatchJobStatus.UNASSIGNED,
      priority: 0,
      scheduledStartAt: input.scheduledStartAt ?? null,
      scheduledEndAt: input.scheduledEndAt ?? null,
      dispatcherNotes: input.dispatcherNotes ?? null,
    })
    .returning({ id: dispatchJobs.id });

  await db.insert(dispatchEvents).values({
    dispatchJobId: createdJob.id,
    actorUserId: input.customerUserId,
    eventType: 'job_auto_created',
    payload: {
      orderId: input.orderId,
      fuelRequestId: input.fuelRequestId ?? null,
      jobType: input.jobType,
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

export async function acceptAssignedDispatchJob(jobId: number, actor: User) {
  const driver = await getActiveDriverForUser(actor.id);

  if (!driver) {
    return { error: 'Active driver profile could not be found.' as const };
  }

  const assignment = await getActiveAssignmentForDriver(jobId, driver.id);

  if (!assignment) {
    return { error: 'Assigned dispatch job could not be found.' as const };
  }

  await db
    .update(dispatchAssignments)
    .set({
      assignmentStatus: DispatchAssignmentStatus.ACCEPTED,
      acceptedAt: new Date(),
    })
    .where(eq(dispatchAssignments.id, assignment.id));

  await db
    .update(dispatchJobs)
    .set({
      status: DispatchJobStatus.ACCEPTED,
      updatedAt: new Date(),
    })
    .where(eq(dispatchJobs.id, jobId));

  await db.insert(dispatchEvents).values({
    dispatchJobId: jobId,
    actorUserId: actor.id,
    eventType: 'driver_accepted',
    payload: {
      driverId: driver.id,
      assignmentId: assignment.id,
    },
  });

  return getDispatchJobById(jobId);
}

export async function declineAssignedDispatchJob(jobId: number, actor: User) {
  const driver = await getActiveDriverForUser(actor.id);

  if (!driver) {
    return { error: 'Active driver profile could not be found.' as const };
  }

  const assignment = await getActiveAssignmentForDriver(jobId, driver.id);

  if (!assignment) {
    return { error: 'Assigned dispatch job could not be found.' as const };
  }

  await db
    .update(dispatchAssignments)
    .set({
      assignmentStatus: DispatchAssignmentStatus.DECLINED,
      declinedAt: new Date(),
    })
    .where(eq(dispatchAssignments.id, assignment.id));

  await db
    .update(dispatchJobs)
    .set({
      status: DispatchJobStatus.UNASSIGNED,
      updatedAt: new Date(),
    })
    .where(eq(dispatchJobs.id, jobId));

  await db
    .update(drivers)
    .set({
      availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
      updatedAt: new Date(),
    })
    .where(eq(drivers.id, driver.id));

  await db.insert(dispatchEvents).values({
    dispatchJobId: jobId,
    actorUserId: actor.id,
    eventType: 'driver_declined',
    payload: {
      driverId: driver.id,
      assignmentId: assignment.id,
    },
  });

  return getDispatchJobById(jobId);
}

export async function updateAssignedDispatchJobStatus(
  jobId: number,
  input: z.infer<typeof updateDriverJobStatusInputSchema>,
  actor: User
) {
  const driver = await getActiveDriverForUser(actor.id);

  if (!driver) {
    return { error: 'Active driver profile could not be found.' as const };
  }

  const assignment = await getActiveAssignmentForDriver(jobId, driver.id);

  if (!assignment) {
    return { error: 'Assigned dispatch job could not be found.' as const };
  }

  await db
    .update(dispatchJobs)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(dispatchJobs.id, jobId));

  if (input.status === DispatchJobStatus.COMPLETED) {
    await db
      .update(drivers)
      .set({
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, driver.id));
  }

  await db.insert(dispatchEvents).values({
    dispatchJobId: jobId,
    actorUserId: actor.id,
    eventType: 'driver_status_updated',
    payload: {
      driverId: driver.id,
      status: input.status,
    },
  });

  return getDispatchJobById(jobId);
}

export async function updateDriverLocation(
  input: z.infer<typeof updateDriverLocationInputSchema>,
  actor: User
) {
  const driver = await getActiveDriverForUser(actor.id);

  if (!driver) {
    return { error: 'Active driver profile could not be found.' as const };
  }

  if (input.driverId && input.driverId !== driver.id) {
    return { error: 'Driver location can only be updated by that driver.' as const };
  }

  const [location] = await db
    .insert(driverLocations)
    .values({
      driverId: driver.id,
      latitude: input.latitude.toFixed(6),
      longitude: input.longitude.toFixed(6),
      heading: input.heading ?? null,
      speed: input.speed ?? null,
      capturedAt: input.capturedAt ? new Date(input.capturedAt) : new Date(),
    })
    .returning();

  return location;
}

async function getDispatchJobById(jobId: number) {
  return db.query.dispatchJobs.findFirst({
    where: eq(dispatchJobs.id, jobId),
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
  });
}

async function getActiveDriverForUser(userId: number) {
  const [driver] = await db
    .select()
    .from(drivers)
    .where(and(eq(drivers.userId, userId), eq(drivers.active, true)))
    .limit(1);

  return driver ?? null;
}

async function getActiveAssignmentForDriver(jobId: number, driverId: number) {
  const [assignment] = await db
    .select()
    .from(dispatchAssignments)
    .where(
      and(
        eq(dispatchAssignments.dispatchJobId, jobId),
        eq(dispatchAssignments.driverId, driverId),
        inArray(dispatchAssignments.assignmentStatus, [
          DispatchAssignmentStatus.ASSIGNED,
          DispatchAssignmentStatus.ACCEPTED,
        ])
      )
    )
    .limit(1);

  return assignment ?? null;
}
