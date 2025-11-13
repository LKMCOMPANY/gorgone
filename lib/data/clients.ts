/**
 * Data layer for clients (operations) management
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { Client, ClientWithStats, ClientUser } from "@/types";
import { logger } from "@/lib/logger";

/**
 * Get all clients with user counts
 */
export async function getAllClients(): Promise<ClientWithStats[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("clients")
      .select(
        `
        *,
        profiles!profiles_client_id_fkey(count)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform data to include user_count
    const clients: ClientWithStats[] =
      data?.map((client) => ({
        id: client.id,
        name: client.name,
        description: client.description,
        is_active: client.is_active,
        created_at: client.created_at,
        created_by: client.created_by,
        updated_at: client.updated_at,
        user_count: Array.isArray(client.profiles)
          ? client.profiles.length
          : 0,
      })) || [];

    return clients;
  } catch (error) {
    logger.error("Error fetching clients:", error);
    throw error;
  }
}

/**
 * Get client by ID
 */
export async function getClientById(id: string): Promise<Client | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error(`Error fetching client ${id}:`, error);
    return null;
  }
}

/**
 * Get client with stats by ID
 */
export async function getClientWithStats(
  id: string
): Promise<ClientWithStats | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("clients")
      .select(
        `
        *,
        profiles!profiles_client_id_fkey(count)
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) return null;

    const client: ClientWithStats = {
      id: data.id,
      name: data.name,
      description: data.description,
      is_active: data.is_active,
      created_at: data.created_at,
      created_by: data.created_by,
      updated_at: data.updated_at,
      user_count: Array.isArray(data.profiles) ? data.profiles.length : 0,
    };

    return client;
  } catch (error) {
    logger.error(`Error fetching client with stats ${id}:`, error);
    return null;
  }
}

/**
 * Create a new client
 */
export async function createClient(
  name: string,
  description: string | null,
  createdBy: string
): Promise<Client> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("clients")
      .insert({
        name,
        description,
        created_by: createdBy,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Client created: ${data.id} by ${createdBy}`);
    return data;
  } catch (error) {
    logger.error("Error creating client:", error);
    throw error;
  }
}

/**
 * Update client
 */
export async function updateClient(
  id: string,
  updates: {
    name?: string;
    description?: string | null;
    is_active?: boolean;
  }
): Promise<Client> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("clients")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Client updated: ${id}`);
    return data;
  } catch (error) {
    logger.error(`Error updating client ${id}:`, error);
    throw error;
  }
}

/**
 * Delete client (soft delete by setting is_active to false)
 */
export async function deleteClient(id: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from("clients")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;

    logger.info(`Client soft deleted: ${id}`);
  } catch (error) {
    logger.error(`Error deleting client ${id}:`, error);
    throw error;
  }
}

/**
 * Hard delete client (permanent deletion)
 */
export async function hardDeleteClient(id: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    // First, remove client_id from all related profiles
    await supabase
      .from("profiles")
      .update({ client_id: null })
      .eq("client_id", id);

    // Then delete the client
    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (error) throw error;

    logger.info(`Client hard deleted: ${id}`);
  } catch (error) {
    logger.error(`Error hard deleting client ${id}:`, error);
    throw error;
  }
}

/**
 * Get all users for a specific client
 */
export async function getClientUsers(clientId: string): Promise<ClientUser[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data as ClientUser[]) || [];
  } catch (error) {
    logger.error(`Error fetching users for client ${clientId}:`, error);
    throw error;
  }
}

/**
 * Assign user to client
 */
export async function assignUserToClient(
  userId: string,
  clientId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("profiles")
      .update({ client_id: clientId })
      .eq("id", userId);

    if (error) throw error;

    logger.info(`User ${userId} assigned to client ${clientId}`);
  } catch (error) {
    logger.error(`Error assigning user to client:`, error);
    throw error;
  }
}

/**
 * Remove user from client
 */
export async function removeUserFromClient(userId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("profiles")
      .update({ client_id: null })
      .eq("id", userId);

    if (error) throw error;

    logger.info(`User ${userId} removed from client`);
  } catch (error) {
    logger.error(`Error removing user from client:`, error);
    throw error;
  }
}

