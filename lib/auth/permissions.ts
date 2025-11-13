/**
 * Role-based permissions system
 */

import type { UserRole } from "@/types";

// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 4,
  admin: 3,
  operator: 2,
  manager: 2,
};

// Permissions by role
export const PERMISSIONS = {
  super_admin: [
    "create_users",
    "delete_users",
    "manage_users",
    "create_clients",
    "delete_clients",
    "access_all_clients",
    "access_all_zones",
    "manage_settings",
  ],
  admin: [
    "access_all_clients",
    "access_all_zones",
    "view_only", // Can view but not edit
  ],
  operator: ["access_clients", "access_zones", "view_data"],
  manager: ["access_clients", "access_zones", "view_data"],
} as const;

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  userRole: UserRole | null | undefined,
  permission: string
): boolean {
  if (!userRole) return false;
  const permissions = PERMISSIONS[userRole] as readonly string[];
  return permissions?.includes(permission) || false;
}

/**
 * Check if user role is higher than target role
 */
export function hasHigherRole(
  userRole: UserRole | null | undefined,
  targetRole: UserRole
): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(userRole: UserRole | null | undefined): boolean {
  return userRole === "super_admin";
}

/**
 * Check if user can access admin dashboard
 */
export function canAccessAdmin(userRole: UserRole | null | undefined): boolean {
  return isSuperAdmin(userRole);
}

/**
 * Get human-readable role name
 */
export function getRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    operator: "Operator",
    manager: "Manager",
  };
  return roleNames[role];
}
