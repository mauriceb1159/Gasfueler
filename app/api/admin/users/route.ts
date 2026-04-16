import { requireAdmin } from '@/lib/auth/role-middleware';
import { getUser } from '@/lib/db/queries';

/**
 * GET /api/admin/users
 * Admin-only endpoint to get all users
 */
export async function GET() {
  try {
    const user = await requireAdmin();

    // Placeholder: In a real app, you'd fetch from database
    return Response.json({
      success: true,
      message: 'Admin access granted',
      currentUser: user,
      data: {
        users: []
      }
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
