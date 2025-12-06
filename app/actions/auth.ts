"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { startImpersonation, stopImpersonation, getImpersonationSession } from "@/lib/auth/impersonation";
import { logger } from "@/lib/logger";

export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    logger.error("Logout error", error);
    throw new Error("Failed to logout");
  }

  logger.info("User logged out");
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Start impersonating a client
 * Only super_admin can use this
 */
export async function impersonateClientAction(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    if (user.role !== "super_admin") {
      return { success: false, error: "Unauthorized" };
    }

    const result = await startImpersonation(user, clientId);

    if (result.success) {
      revalidatePath("/dashboard", "layout");
    }

    return result;
  } catch (error) {
    logger.error("Error in impersonateClientAction:", error);
    return { success: false, error: "Failed to start impersonation" };
  }
}

/**
 * Stop impersonating and return to admin view
 */
export async function exitImpersonationAction(): Promise<void> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return;
    }

    await stopImpersonation(user);
    revalidatePath("/dashboard", "layout");
    redirect("/dashboard/clients");
  } catch (error) {
    logger.error("Error in exitImpersonationAction:", error);
  }
}

/**
 * Get current impersonation status
 */
export async function getImpersonationStatusAction() {
  try {
    const session = await getImpersonationSession();
    return {
      isImpersonating: !!session,
      session,
    };
  } catch (error) {
    logger.error("Error getting impersonation status:", error);
    return {
      isImpersonating: false,
      session: null,
    };
  }
}
