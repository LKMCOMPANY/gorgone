/**
 * Data layer for zones management
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { Zone, ZoneDataSources } from "@/types";
import { logger } from "@/lib/logger";

/**
 * Get all zones for a specific client
 */
export async function getZonesByClient(clientId: string): Promise<Zone[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("zones")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data as Zone[]) || [];
  } catch (error) {
    logger.error(`Error fetching zones for client ${clientId}:`, error);
    throw error;
  }
}

/**
 * Get all active zones for a specific client
 */
export async function getActiveZonesByClient(
  clientId: string
): Promise<Zone[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("zones")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;

    return (data as Zone[]) || [];
  } catch (error) {
    logger.error(`Error fetching active zones for client ${clientId}:`, error);
    throw error;
  }
}

/**
 * Get zone by ID
 */
export async function getZoneById(id: string): Promise<Zone | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("zones")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return data as Zone;
  } catch (error) {
    logger.error(`Error fetching zone ${id}:`, error);
    return null;
  }
}

/**
 * Create a new zone
 */
export async function createZone(
  name: string,
  clientId: string,
  createdBy: string,
  operationalContext?: string | null
): Promise<Zone> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("zones")
      .insert({
        name,
        client_id: clientId,
        operational_context: operationalContext || null,
        created_by: createdBy,
        is_active: true,
        data_sources: {
          twitter: true, // Enabled by default
          tiktok: false,
          media: false,
        },
        settings: {},
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Zone created: ${data.id} by ${createdBy}`);
    return data as Zone;
  } catch (error) {
    logger.error("Error creating zone:", error);
    throw error;
  }
}

/**
 * Update zone
 */
export async function updateZone(
  id: string,
  updates: {
    name?: string;
    operational_context?: string | null;
    data_sources?: ZoneDataSources;
    settings?: Record<string, unknown>;
    is_active?: boolean;
  }
): Promise<Zone> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("zones")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Zone updated: ${id}`);
    return data as Zone;
  } catch (error) {
    logger.error(`Error updating zone ${id}:`, error);
    throw error;
  }
}

/**
 * Delete zone (permanent deletion)
 */
export async function deleteZone(id: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from("zones").delete().eq("id", id);

    if (error) throw error;

    logger.info(`Zone deleted: ${id}`);
  } catch (error) {
    logger.error(`Error deleting zone ${id}:`, error);
    throw error;
  }
}

/**
 * Toggle zone active status
 */
export async function toggleZoneActive(
  id: string,
  isActive: boolean
): Promise<Zone> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("zones")
      .update({ is_active: isActive })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Zone ${id} active status set to: ${isActive}`);
    return data as Zone;
  } catch (error) {
    logger.error(`Error toggling zone ${id} active status:`, error);
    throw error;
  }
}

/**
 * Update zone data sources
 */
export async function updateZoneDataSources(
  id: string,
  dataSources: ZoneDataSources
): Promise<Zone> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("zones")
      .update({ data_sources: dataSources })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Zone ${id} data sources updated`);
    return data as Zone;
  } catch (error) {
    logger.error(`Error updating zone ${id} data sources:`, error);
    throw error;
  }
}

