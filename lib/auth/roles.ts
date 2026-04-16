/**
 * User Role Definitions
 * Different account types in the application
 */

export const USER_ROLES = {
  END_USER: 'end_user',
  FUEL_DRIVER: 'fuel_driver',
  FUEL_ATTENDANT: 'fuel_attendant',
  STORE: 'store',
  STORE_BACK_OFFICE: 'store_back_office',
  DISPATCHER: 'dispatcher',
  ADMIN: 'admin',
  MAIN_ADMIN: 'main_admin'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.END_USER]: 'Customer',
  [USER_ROLES.FUEL_DRIVER]: 'Fuel Driver',
  [USER_ROLES.FUEL_ATTENDANT]: 'Fuel Attendant',
  [USER_ROLES.STORE]: 'Store Owner',
  [USER_ROLES.STORE_BACK_OFFICE]: 'Store Admin',
  [USER_ROLES.DISPATCHER]: 'Dispatcher',
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.MAIN_ADMIN]: 'Main Administrator'
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [USER_ROLES.END_USER]: 'Book and manage fuel deliveries',
  [USER_ROLES.FUEL_DRIVER]: 'Manage fuel deliveries and routes',
  [USER_ROLES.FUEL_ATTENDANT]: 'Manage gas station operations',
  [USER_ROLES.STORE]: 'Manage store and team',
  [USER_ROLES.STORE_BACK_OFFICE]: 'Manage store administrative tasks',
  [USER_ROLES.DISPATCHER]: 'Dispatch fuel deliveries and manage drivers',
  [USER_ROLES.ADMIN]: 'Manage system and users',
  [USER_ROLES.MAIN_ADMIN]: 'Full system administration'
};

/**
 * Get the appropriate dashboard URL for a user role
 */
export function getDashboardUrlForRole(role: UserRole): string {
  const dashboardMap: Record<UserRole, string> = {
    [USER_ROLES.END_USER]: '/dashboard/customer',
    [USER_ROLES.FUEL_DRIVER]: '/dashboard/driver',
    [USER_ROLES.FUEL_ATTENDANT]: '/dashboard/attendant',
    [USER_ROLES.STORE]: '/dashboard/store',
    [USER_ROLES.STORE_BACK_OFFICE]: '/dashboard/store-admin',
    [USER_ROLES.DISPATCHER]: '/dashboard/dispatcher',
    [USER_ROLES.ADMIN]: '/dashboard/admin',
    [USER_ROLES.MAIN_ADMIN]: '/dashboard/super-admin'
  };

  return dashboardMap[role] || '/dashboard';
}

/**
 * Check if user has required role(s)
 */
export function hasRole(userRole: UserRole, requiredRoles: UserRole | UserRole[]): boolean {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return roles.includes(userRole);
}

/**
 * Check if user is an admin (any level)
 */
export function isAdmin(userRole: UserRole): boolean {
  return hasRole(userRole, [USER_ROLES.ADMIN, USER_ROLES.MAIN_ADMIN]);
}

/**
 * Check if user is a main admin
 */
export function isMainAdmin(userRole: UserRole): boolean {
  return userRole === USER_ROLES.MAIN_ADMIN;
}
