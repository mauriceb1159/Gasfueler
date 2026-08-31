import { requireAdmin } from '@/lib/auth/role-middleware';
import { asc, eq, isNull } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { drivers, users } from '@/lib/db/schema';

/**
 * GET /api/admin/users
 * Admin-only endpoint to get all users
 */
export async function GET() {
  try {
    await requireAdmin();

    const userRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        driverId: drivers.id,
        driverActive: drivers.active,
        driverAvailabilityStatus: drivers.availabilityStatus,
      })
      .from(users)
      .leftJoin(drivers, eq(drivers.userId, users.id))
      .where(isNull(users.deletedAt))
      .orderBy(asc(users.email));

    return Response.json({
      success: true,
      data: { users: userRows }
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message.includes('Forbidden')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
