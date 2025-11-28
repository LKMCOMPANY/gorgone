"use server";

import { revalidatePath } from "next/cache";
import {
  getOperations,
  getOperationById,
  createOperation,
  updateOperation,
  deleteOperation,
} from "@/lib/data/attila";
import { getCurrentUser } from "@/lib/auth/utils";
import { canManageZones } from "@/lib/auth/permissions";
import { getZoneById } from "@/lib/data/zones";
import type { AttilaOperation, AttilaOperationConfig, AttilaOperationType, AttilaOperationStatus } from "@/types";

// Check if user can access Attila (Manager role + Attila enabled in zone)
async function canAccessAttila(zoneId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // 1. Check Manager Role (or higher)
  // 'canManageZones' checks for manager/admin/super_admin
  if (!canManageZones(user.role)) return false;

  // 2. Check if Attila is enabled in zone settings
  // We need to fetch the zone to check settings
  const zone = await getZoneById(zoneId);
  if (!zone) return false;
  
  // Check strict equality to true
  return (zone.settings as any)?.attila_enabled === true;
}

export async function getOperationsAction(zoneId: string) {
  if (!(await canAccessAttila(zoneId))) {
    return { success: false, error: "Unauthorized or Attila disabled" };
  }
  
  try {
    const operations = await getOperations(zoneId);
    return { success: true, data: operations };
  } catch (error) {
    return { success: false, error: "Failed to fetch operations" };
  }
}

export async function createOperationAction(
  zoneId: string,
  name: string,
  type: AttilaOperationType,
  config: AttilaOperationConfig
) {
  if (!(await canAccessAttila(zoneId))) {
    return { success: false, error: "Unauthorized or Attila disabled" };
  }

  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const operation = await createOperation(zoneId, name, type, config, user.id);
    revalidatePath(`/dashboard/zones/${zoneId}/attila`);
    return { success: true, data: operation };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create operation" };
  }
}

export async function updateOperationAction(
  zoneId: string,
  operationId: string,
  updates: Partial<AttilaOperation>
) {
  if (!(await canAccessAttila(zoneId))) {
    return { success: false, error: "Unauthorized or Attila disabled" };
  }

  try {
    const operation = await updateOperation(operationId, updates);
    revalidatePath(`/dashboard/zones/${zoneId}/attila`);
    return { success: true, data: operation };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update operation" };
  }
}

export async function deleteOperationAction(zoneId: string, operationId: string) {
  if (!(await canAccessAttila(zoneId))) {
    return { success: false, error: "Unauthorized or Attila disabled" };
  }

  try {
    const success = await deleteOperation(operationId);
    if (success) {
      revalidatePath(`/dashboard/zones/${zoneId}/attila`);
      return { success: true };
    } else {
      return { success: false, error: "Failed to delete operation" };
    }
  } catch (error) {
    return { success: false, error: "Failed to delete operation" };
  }
}

export async function toggleOperationStatusAction(
  zoneId: string, 
  operationId: string, 
  newStatus: AttilaOperationStatus
) {
  if (!(await canAccessAttila(zoneId))) {
    return { success: false, error: "Unauthorized or Attila disabled" };
  }
  
  // Valid transitions only
  // draft -> active
  // active -> paused
  // paused -> active
  // * -> completed (maybe?)
  
  try {
    const operation = await updateOperation(operationId, { status: newStatus });
    revalidatePath(`/dashboard/zones/${zoneId}/attila`);
    return { success: true, data: operation };
  } catch (error) {
     return { success: false, error: "Failed to update status" };
  }
}

