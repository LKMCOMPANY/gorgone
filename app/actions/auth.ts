"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
