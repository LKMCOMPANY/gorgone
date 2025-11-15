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
    "manage_zones",
    "manage_settings",
    "view_settings",
  ],
  admin: [
    "access_all_clients",
    "access_all_zones",
    "view_only", // Can view but not edit
    "view_settings",
  ],
  operator: [
    "access_clients",
    "access_zones",
    "view_data",
    // Operators CANNOT view settings
  ],
  manager: [
    "access_clients",
    "access_zones",
    "manage_zones",
    "view_data",
    "view_settings",
  ],
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

/**
 * Check if user can manage zones (create, edit, delete)
 */
export function canManageZones(userRole: UserRole | null | undefined): boolean {
  if (!userRole) return false;
  return hasPermission(userRole, "manage_zones");
}

/**
 * Check if user can view settings page
 */
export function canViewSettings(
  userRole: UserRole | null | undefined
): boolean {
  if (!userRole) return false;
  return hasPermission(userRole, "view_settings");
}

/**
 * Check if user can access a specific zone
 * Super admin and admin can access all zones
 * Others can only access zones from their client
 */
export async function canAccessZone(
  userId: string,
  zoneId: string
): Promise<boolean> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();

    // Get user profile with role and client_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, client_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) return false;

    // Super admin and admin can access all zones
    if (profile.role === "super_admin" || profile.role === "admin") {
      return true;
    }

    // For other roles, check if zone belongs to user's client
    const { data: zone, error: zoneError } = await supabase
      .from("zones")
      .select("client_id")
      .eq("id", zoneId)
      .single();

    if (zoneError || !zone) return false;

    return zone.client_id === profile.client_id;
  } catch (error) {
    return false;
  }
}
