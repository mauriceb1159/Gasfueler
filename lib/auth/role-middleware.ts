import { getUser } from '@/lib/db/queries';
import { hasRole, isAdmin, type UserRole } from '@/lib/auth/roles';

/**
 * Role-based authorization middleware
 * Checks if the current user has the required role(s)
 * Throws an error if unauthorized
 */
export async function requireRole(requiredRoles: UserRole | UserRole[]) {
  const user = await getUser();

  if (!user) {
    throw new Error('Unauthorized: No user found');
  }

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  if (!hasRole(user.role as UserRole, roles)) {
    throw new Error(`Forbidden: User role '${user.role}' does not have access`);
  }

  return user;
}

/**
 * Admin-only authorization
 */
export async function requireAdmin() {
  const user = await getUser();

  if (!user) {
    throw new Error('Unauthorized: No user found');
  }

  if (!isAdmin(user.role as UserRole)) {
    throw new Error('Forbidden: Admin access required');
  }

  return user;
}

/**
 * Wrapper to handle authorization errors and return proper responses
 */
export function withRoleProtection(handler: Function, requiredRoles: UserRole | UserRole[]) {
  return async (...args: any[]) => {
    try {
      await requireRole(requiredRoles);
      return await handler(...args);
    } catch (error: any) {
      if (error.message.includes('Unauthorized')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (error.message.includes('Forbidden')) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      throw error;
    }
  };
}
