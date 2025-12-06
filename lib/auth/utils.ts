/**
 * Authentication utility functions
 */

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUser } from "./impersonation";
import type { User, Profile } from "@/types";

/**
 * Get current user from server-side
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Use regular client to check authentication
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return null;
    }

    // Use admin client to get profile (bypasses RLS)
    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile || profileError) {
      return null;
    }

    const realUser: User = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      organization: profile.organization,
      client_id: profile.client_id,
      created_at: profile.created_at,
    };

    // Apply impersonation if active
    return await getEffectiveUser(realUser);
  } catch (err) {
    // Log unexpected errors in production for monitoring
    if (process.env.NODE_ENV === "production") {
      console.error("[Auth] Failed to get current user:", err);
    }
    return null;
  }
}

/**
 * Get user profile (extended version)
 */
export async function getUserProfile(): Promise<Profile | null> {
  try {
    // Use regular client to check authentication
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return null;
    }

    // Use admin client to get profile (bypasses RLS)
    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile || profileError) {
      return null;
    }

    return profile;
  } catch (err) {
    // Log unexpected errors in production for monitoring
    if (process.env.NODE_ENV === "production") {
      console.error("[Auth] Failed to get user profile:", err);
    }
    return null;
  }
}

/**
 * Generate a strong random password
 */
export function generatePassword(length: number = 16): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";

  // Ensure at least one of each type
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  password += "0123456789"[Math.floor(Math.random() * 10)];
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)];

  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/**
 * Generate a readable strong password
 * Format: Word1234!
 */
export function generateReadablePassword(): string {
  const words = [
    "Alpha",
    "Beta",
    "Gamma",
    "Delta",
    "Echo",
    "Foxtrot",
    "Golf",
    "Hotel",
    "India",
    "Juliet",
  ];
  const numbers = Math.floor(1000 + Math.random() * 9000);
  const special = ["!", "@", "#", "$", "%"][Math.floor(Math.random() * 5)];

  const word = words[Math.floor(Math.random() * words.length)];
  return `${word}${numbers}${special}`;
}
