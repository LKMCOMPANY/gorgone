/**
 * Server actions for zone management
 */

"use server";

import { revalidatePath } from "next/cache";
import {
  getZonesByClient,
  getActiveZonesByClient,
  getZoneById,
  createZone,
  updateZone,
  deleteZone,
  toggleZoneActive,
  updateZoneDataSources,
} from "@/lib/data/zones";
import { getCurrentUser } from "@/lib/auth/utils";
import { isSuperAdmin, hasPermission } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import type { Zone, ZoneDataSources } from "@/types";

/**
 * Check if user can manage zones for a client
 */
async function canManageZones(clientId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Super admins can manage all zones
  if (isSuperAdmin(user.role)) return true;

  // Managers can manage zones for their own client
  if (user.role === "manager" && user.client_id === clientId) return true;

  return false;
}

/**
 * Check if user can view zones for a client
 */
async function canViewZones(clientId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Super admins and admins can view all zones
  if (isSuperAdmin(user.role) || user.role === "admin") return true;

  // Managers and operators can view zones for their own client
  if (
    (user.role === "manager" || user.role === "operator") &&
    user.client_id === clientId
  ) {
    return true;
  }

  return false;
}

/**
 * Get all zones for a client
 */
export async function getZonesByClientAction(
  clientId: string
): Promise<Zone[] | null> {
  try {
    // Check permissions
    if (!(await canViewZones(clientId))) {
      logger.warn("Unauthorized attempt to view zones");
      return null;
    }

    const zones = await getZonesByClient(clientId);
    return zones;
  } catch (error) {
    logger.error("Error in getZonesByClientAction:", error);
    return null;
  }
}

/**
 * Get active zones for a client
 */
export async function getActiveZonesByClientAction(
  clientId: string
): Promise<Zone[] | null> {
  try {
    // Check permissions
    if (!(await canViewZones(clientId))) {
      logger.warn("Unauthorized attempt to view active zones");
      return null;
    }

    const zones = await getActiveZonesByClient(clientId);
    return zones;
  } catch (error) {
    logger.error("Error in getActiveZonesByClientAction:", error);
    return null;
  }
}

/**
 * Get zone by ID
 */
export async function getZoneByIdAction(id: string): Promise<Zone | null> {
  try {
    const zone = await getZoneById(id);
    if (!zone) return null;

    // Check permissions
    if (!(await canViewZones(zone.client_id))) {
      logger.warn("Unauthorized attempt to view zone");
      return null;
    }

    return zone;
  } catch (error) {
    logger.error("Error in getZoneByIdAction:", error);
    return null;
  }
}

/**
 * Create a new zone
 */
export async function createZoneAction(
  name: string,
  clientId: string,
  operationalContext?: string | null
): Promise<{ success: boolean; zone?: Zone; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Check permissions
    if (!(await canManageZones(clientId))) {
      logger.warn("Unauthorized attempt to create zone");
      return { success: false, error: "Unauthorized" };
    }

    const zone = await createZone(name, clientId, user.id, operationalContext);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/zones");

    logger.info(`Zone created successfully: ${zone.id}`);
    return { success: true, zone };
  } catch (error) {
    logger.error("Error in createZoneAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update zone
 */
export async function updateZoneAction(
  id: string,
  updates: {
    name?: string;
    operational_context?: string | null;
    data_sources?: ZoneDataSources;
    settings?: Record<string, unknown>;
    is_active?: boolean;
  }
): Promise<{ success: boolean; zone?: Zone; error?: string }> {
  try {
    const zone = await getZoneById(id);
    if (!zone) {
      return { success: false, error: "Zone not found" };
    }

    // Check permissions
    if (!(await canManageZones(zone.client_id))) {
      logger.warn("Unauthorized attempt to update zone");
      return { success: false, error: "Unauthorized" };
    }

    const updatedZone = await updateZone(id, updates);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/zones");
    revalidatePath(`/dashboard/zones/${id}`);

    logger.info(`Zone updated successfully: ${id}`);
    return { success: true, zone: updatedZone };
  } catch (error) {
    logger.error("Error in updateZoneAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete zone
 */
export async function deleteZoneAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const zone = await getZoneById(id);
    if (!zone) {
      return { success: false, error: "Zone not found" };
    }

    // Check permissions
    if (!(await canManageZones(zone.client_id))) {
      logger.warn("Unauthorized attempt to delete zone");
      return { success: false, error: "Unauthorized" };
    }

    await deleteZone(id);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/zones");

    logger.info(`Zone deleted successfully: ${id}`);
    return { success: true };
  } catch (error) {
    logger.error("Error in deleteZoneAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Toggle zone active status
 */
export async function toggleZoneActiveAction(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; zone?: Zone; error?: string }> {
  try {
    const zone = await getZoneById(id);
    if (!zone) {
      return { success: false, error: "Zone not found" };
    }

    // Check permissions
    if (!(await canManageZones(zone.client_id))) {
      logger.warn("Unauthorized attempt to toggle zone status");
      return { success: false, error: "Unauthorized" };
    }

    const updatedZone = await toggleZoneActive(id, isActive);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/zones");
    revalidatePath(`/dashboard/zones/${id}`);

    logger.info(`Zone status toggled successfully: ${id}`);
    return { success: true, zone: updatedZone };
  } catch (error) {
    logger.error("Error in toggleZoneActiveAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update zone data sources
 */
export async function updateZoneDataSourcesAction(
  id: string,
  dataSources: ZoneDataSources
): Promise<{ success: boolean; zone?: Zone; error?: string }> {
  try {
    const zone = await getZoneById(id);
    if (!zone) {
      return { success: false, error: "Zone not found" };
    }

    // Check permissions
    if (!(await canManageZones(zone.client_id))) {
      logger.warn("Unauthorized attempt to update zone data sources");
      return { success: false, error: "Unauthorized" };
    }

    const updatedZone = await updateZoneDataSources(id, dataSources);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/zones");
    revalidatePath(`/dashboard/zones/${id}`);

    logger.info(`Zone data sources updated successfully: ${id}`);
    return { success: true, zone: updatedZone };
  } catch (error) {
    logger.error("Error in updateZoneDataSourcesAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

