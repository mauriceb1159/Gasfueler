import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { requireAdmin } from '@/lib/auth/role-middleware';
import { USER_ROLES, type UserRole } from '@/lib/auth/roles';
import { db } from '@/lib/db/drizzle';
import { drivers, DriverAvailabilityStatus, users } from '@/lib/db/schema';

const updateUserRoleSchema = z.object({
  role: z.enum([
    USER_ROLES.END_USER,
    USER_ROLES.FUEL_DRIVER,
    USER_ROLES.FUEL_ATTENDANT,
    USER_ROLES.STORE,
    USER_ROLES.STORE_BACK_OFFICE,
    USER_ROLES.DISPATCHER,
    USER_ROLES.ADMIN,
    USER_ROLES.MAIN_ADMIN,
  ]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actingUser = await requireAdmin();
    const { id } = await params;
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return Response.json({ error: 'Invalid user id.' }, { status: 400 });
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const parsedInput = updateUserRoleSchema.safeParse(body);

    if (!parsedInput.success) {
      return Response.json(
        { error: parsedInput.error.errors[0]?.message ?? 'Invalid role.' },
        { status: 400 }
      );
    }

    if (
      actingUser.id === userId &&
      actingUser.role === USER_ROLES.MAIN_ADMIN &&
      parsedInput.data.role !== USER_ROLES.MAIN_ADMIN
    ) {
      return Response.json(
        { error: 'Use another main admin account to change your own main admin role.' },
        { status: 400 }
      );
    }

    const [targetUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return Response.json({ error: 'User could not be found.' }, { status: 404 });
    }

    const role = parsedInput.data.role as UserRole;

    const [updatedUser] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    if (role === USER_ROLES.FUEL_DRIVER) {
      const [existingDriver] = await db
        .select({ id: drivers.id })
        .from(drivers)
        .where(eq(drivers.userId, userId))
        .limit(1);

      if (existingDriver) {
        await db
          .update(drivers)
          .set({
            active: true,
            availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
            updatedAt: new Date(),
          })
          .where(eq(drivers.id, existingDriver.id));
      } else {
        await db.insert(drivers).values({
          userId,
          active: true,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        });
      }
    } else {
      await db
        .update(drivers)
        .set({
          active: false,
          availabilityStatus: DriverAvailabilityStatus.OFFLINE,
          updatedAt: new Date(),
        })
        .where(eq(drivers.userId, userId));
    }

    return Response.json({ success: true, user: updatedUser });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message.includes('Forbidden')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to update user role:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
