import { requireRole } from '@/lib/auth/role-middleware';
import { USER_ROLES } from '@/lib/auth/roles';

/**
 * GET /api/attendant/station
 * Attendant-only endpoint to get station info
 */
export async function GET() {
  try {
    const user = await requireRole(USER_ROLES.FUEL_ATTENDANT);

    // Placeholder: In a real app, you'd fetch station data from database
    return Response.json({
      success: true,
      message: 'Attendant access granted',
      attendantId: user.id,
      data: {
        station: {
          name: 'Station Name',
          status: 'open',
          fuelLevels: {}
        },
        todaysStats: {
          fuelPumped: 0,
          transactions: 0
        }
      }
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message.includes('Forbidden')) {
      return Response.json({ error: 'Forbidden: Attendant access required' }, { status: 403 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/attendant/station
 * Attendant-only endpoint to update station info (prices, status, etc)
 */
export async function PATCH(req: Request) {
  try {
    const user = await requireRole(USER_ROLES.FUEL_ATTENDANT);
    const body = await req.json();

    // Placeholder: In a real app, you'd update station in database
    return Response.json({
      success: true,
      message: 'Station updated',
      attendantId: user.id,
      updated: body
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message.includes('Forbidden')) {
      return Response.json({ error: 'Forbidden: Attendant access required' }, { status: 403 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
