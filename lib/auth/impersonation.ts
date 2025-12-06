/**
 * Impersonation system for super admins
 * Allows super_admin to view client dashboards with full access
 */

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { User } from "@/types";

const IMPERSONATION_COOKIE = "gorgone_impersonate";
const COOKIE_MAX_AGE = 60 * 60 * 4; // 4 hours

export interface ImpersonationSession {
  adminId: string;
  adminEmail: string;
  clientId: string;
  startedAt: string;
}

/**
 * Get current impersonation session
 */
export async function getImpersonationSession(): Promise<ImpersonationSession | null> {
  try {
    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE);
    
    if (!impersonationCookie?.value) {
      return null;
    }

    return JSON.parse(impersonationCookie.value) as ImpersonationSession;
  } catch (error) {
    logger.error("Error reading impersonation session:", error);
    return null;
  }
}

/**
 * Start impersonation session
 * Only super_admin can impersonate
 */
export async function startImpersonation(
  adminUser: User,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify admin is super_admin
    if (adminUser.role !== "super_admin") {
      return { success: false, error: "Unauthorized: Only super admins can impersonate" };
    }

    // Verify client exists
    const supabase = createAdminClient();
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return { success: false, error: "Client not found" };
    }

    // Create impersonation session
    const session: ImpersonationSession = {
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      clientId,
      startedAt: new Date().toISOString(),
    };

    // Set secure cookie
    const cookieStore = await cookies();
    cookieStore.set(IMPERSONATION_COOKIE, JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    // Log impersonation for audit
    logger.info("[Impersonation] Started", {
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      clientId,
      clientName: client.name,
    });

    return { success: true };
  } catch (error) {
    logger.error("[Impersonation] Error starting session:", error);
    return { success: false, error: "Failed to start impersonation" };
  }
}

/**
 * Stop impersonation session
 */
export async function stopImpersonation(adminUser: User): Promise<void> {
  try {
    const session = await getImpersonationSession();
    
    if (session) {
      // Log impersonation end for audit
      logger.info("[Impersonation] Stopped", {
        adminId: session.adminId,
        adminEmail: session.adminEmail,
        clientId: session.clientId,
        duration: Date.now() - new Date(session.startedAt).getTime(),
      });
    }

    // Clear cookie
    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATION_COOKIE);
  } catch (error) {
    logger.error("[Impersonation] Error stopping session:", error);
  }
}

/**
 * Get effective user (with impersonation support)
 * This modifies the user object to reflect impersonation
 */
export async function getEffectiveUser(realUser: User): Promise<User> {
  const session = await getImpersonationSession();
  
  if (!session) {
    return realUser;
  }

  // Verify the real user is still a super_admin
  if (realUser.role !== "super_admin") {
    // Security: Ignore impersonation if user is no longer super_admin
    // We cannot clear the cookie here (Server Component), but we simply ignore it
    // The cookie will naturally expire or be cleared by a client-side action later
    return realUser;
  }

  // Return user with impersonated client_id
  return {
    ...realUser,
    client_id: session.clientId,
    // Keep original role to maintain admin privileges
  };
}

/**
 * Check if currently impersonating
 */
export async function isImpersonating(): Promise<boolean> {
  const session = await getImpersonationSession();
  return session !== null;
}


