"use server";

/**
 * Server actions for client management
 * Only accessible by super admins
 */

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAllClients,
  getClientById,
  getClientWithStats,
  createClient,
  updateClient,
  deleteClient,
  hardDeleteClient,
  getClientUsers,
  assignUserToClient,
  removeUserFromClient,
} from "@/lib/data/clients";
import { getUserProfile } from "@/lib/auth/utils";
import { isSuperAdmin } from "@/lib/auth/permissions";
import type { Client, ClientWithStats, ClientUser, UserRole } from "@/types";
import { logger } from "@/lib/logger";

/**
 * Check if current user is super admin
 */
async function ensureSuperAdmin(): Promise<void> {
  const profile = await getUserProfile();

  if (!profile || !isSuperAdmin(profile.role)) {
    throw new Error("Unauthorized: Super admin access required");
  }
}

/**
 * Get all clients
 */
export async function getClientsAction(): Promise<ClientWithStats[]> {
  await ensureSuperAdmin();
  return getAllClients();
}

/**
 * Get client by ID
 */
export async function getClientAction(id: string): Promise<Client | null> {
  await ensureSuperAdmin();
  return getClientById(id);
}

/**
 * Get client with stats
 */
export async function getClientWithStatsAction(
  id: string
): Promise<ClientWithStats | null> {
  await ensureSuperAdmin();
  return getClientWithStats(id);
}

/**
 * Create a new client
 */
export async function createClientAction(
  name: string,
  description: string | null
): Promise<{ success: boolean; client?: Client; error?: string }> {
  try {
    const profile = await getUserProfile();

    if (!profile || !isSuperAdmin(profile.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await createClient(name, description, profile.id);

    revalidatePath("/dashboard/clients");
    return { success: true, client };
  } catch (error) {
    logger.error("Error in createClientAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create client",
    };
  }
}

/**
 * Update client
 */
export async function updateClientAction(
  id: string,
  updates: {
    name?: string;
    description?: string | null;
    is_active?: boolean;
  }
): Promise<{ success: boolean; client?: Client; error?: string }> {
  try {
    await ensureSuperAdmin();

    const client = await updateClient(id, updates);

    revalidatePath("/dashboard/clients");
    revalidatePath(`/dashboard/clients/${id}`);
    return { success: true, client };
  } catch (error) {
    logger.error("Error in updateClientAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update client",
    };
  }
}

/**
 * Delete client (soft delete)
 */
export async function deleteClientAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureSuperAdmin();

    await deleteClient(id);

    revalidatePath("/dashboard/clients");
    return { success: true };
  } catch (error) {
    logger.error("Error in deleteClientAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete client",
    };
  }
}

/**
 * Hard delete client
 */
export async function hardDeleteClientAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureSuperAdmin();

    await hardDeleteClient(id);

    revalidatePath("/dashboard/clients");
    return { success: true };
  } catch (error) {
    logger.error("Error in hardDeleteClientAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete client",
    };
  }
}

/**
 * Get client users
 */
export async function getClientUsersAction(
  clientId: string
): Promise<ClientUser[]> {
  await ensureSuperAdmin();
  return getClientUsers(clientId);
}

/**
 * Create a new user for a client
 */
export async function createClientUserAction(
  clientId: string,
  email: string,
  password: string,
  role: UserRole,
  organization?: string
): Promise<{ success: boolean; user?: ClientUser; error?: string }> {
  try {
    await ensureSuperAdmin();

    const supabase = createAdminClient();

    // Create user in auth.users
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role,
          organization,
        },
      });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Failed to create user");

    // Update profile with client_id
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        client_id: clientId,
        role,
        organization: organization || null,
      })
      .eq("id", authData.user.id);

    if (profileError) throw profileError;

    // Get the created user with profile
    const { data: profileData, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (fetchError) throw fetchError;

    revalidatePath(`/dashboard/clients/${clientId}`);
    revalidatePath("/dashboard/clients");

    return { success: true, user: profileData as ClientUser };
  } catch (error) {
    logger.error("Error in createClientUserAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create user",
    };
  }
}

/**
 * Update client user
 */
export async function updateClientUserAction(
  userId: string,
  updates: {
    email?: string;
    role?: UserRole;
    organization?: string | null;
    password?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureSuperAdmin();

    const supabase = createAdminClient();

    // Update auth user if email or password is provided
    if (updates.email || updates.password) {
      const authUpdates: { email?: string; password?: string } = {};
      if (updates.email) authUpdates.email = updates.email;
      if (updates.password) authUpdates.password = updates.password;

      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        authUpdates
      );

      if (authError) throw authError;
    }

    // Update profile
    const profileUpdates: {
      email?: string;
      role?: UserRole;
      organization?: string | null;
    } = {};

    if (updates.email) profileUpdates.email = updates.email;
    if (updates.role) profileUpdates.role = updates.role;
    if (updates.organization !== undefined)
      profileUpdates.organization = updates.organization;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", userId);

      if (profileError) throw profileError;
    }

    // Get client_id for revalidation
    const { data: profile } = await supabase
      .from("profiles")
      .select("client_id")
      .eq("id", userId)
      .single();

    if (profile?.client_id) {
      revalidatePath(`/dashboard/clients/${profile.client_id}`);
    }
    revalidatePath("/dashboard/clients");

    return { success: true };
  } catch (error) {
    logger.error("Error in updateClientUserAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update user",
    };
  }
}

/**
 * Delete client user
 */
export async function deleteClientUserAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureSuperAdmin();

    const supabase = createAdminClient();

    // Get client_id before deletion for revalidation
    const { data: profile } = await supabase
      .from("profiles")
      .select("client_id")
      .eq("id", userId)
      .single();

    // Delete user from auth (cascade will delete profile)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) throw authError;

    if (profile?.client_id) {
      revalidatePath(`/dashboard/clients/${profile.client_id}`);
    }
    revalidatePath("/dashboard/clients");

    return { success: true };
  } catch (error) {
    logger.error("Error in deleteClientUserAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete user",
    };
  }
}

/**
 * Assign existing user to client
 */
export async function assignUserToClientAction(
  userId: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureSuperAdmin();

    await assignUserToClient(userId, clientId);

    revalidatePath(`/dashboard/clients/${clientId}`);
    revalidatePath("/dashboard/clients");

    return { success: true };
  } catch (error) {
    logger.error("Error in assignUserToClientAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to assign user",
    };
  }
}

/**
 * Remove user from client
 */
export async function removeUserFromClientAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureSuperAdmin();

    await removeUserFromClient(userId);

    revalidatePath("/dashboard/clients");

    return { success: true };
  } catch (error) {
    logger.error("Error in removeUserFromClientAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove user",
    };
  }
}

