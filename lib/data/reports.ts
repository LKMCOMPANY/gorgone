/**
 * Data layer for reports management
 */

import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type {
  Report,
  ReportContent,
  ReportListItem,
  ReportStatus,
  ReportWithZone,
  PublishedReportData,
  PublishReportResult,
} from "@/types";

/**
 * Get all reports for a client
 */
export async function getReportsByClient(
  clientId: string,
  options?: {
    status?: ReportStatus;
    zoneId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ReportListItem[]> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("chat_reports")
      .select(
        `
        id,
        title,
        status,
        zone_id,
        created_at,
        updated_at,
        content,
        share_token,
        published_at,
        zones!inner(name)
      `
      )
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false });

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    if (options?.zoneId) {
      query = query.eq("zone_id", options.zoneId);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Map database rows to ReportListItem
    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status as "draft" | "published",
      zone_id: row.zone_id,
      zone_name: (row.zones as { name?: string } | null)?.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      word_count: (row.content as { metadata?: { word_count?: number } } | null)?.metadata?.word_count,
      share_token: row.share_token,
      published_at: row.published_at,
    }));
  } catch (error) {
    logger.error(`Error fetching reports for client ${clientId}:`, error);
    throw error;
  }
}

/**
 * Get report by ID
 */
export async function getReportById(id: string): Promise<ReportWithZone | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("chat_reports")
      .select(
        `
        *,
        zones(id, name)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return {
      ...data,
      zone: data.zones,
    } as ReportWithZone;
  } catch (error) {
    logger.error(`Error fetching report ${id}:`, error);
    return null;
  }
}

/**
 * Create a new report
 */
export async function createReport(
  zoneId: string,
  clientId: string,
  createdBy: string,
  title: string,
  content: ReportContent
): Promise<Report> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("chat_reports")
      .insert({
        zone_id: zoneId,
        client_id: clientId,
        created_by: createdBy,
        title,
        status: "draft",
        content,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Report created: ${data.id} by ${createdBy}`);
    return data as Report;
  } catch (error) {
    logger.error("Error creating report:", error);
    throw error;
  }
}

/**
 * Update report (auto-save)
 */
export async function updateReport(
  id: string,
  updates: {
    title?: string;
    summary?: string;
    content?: ReportContent;
  }
): Promise<Report> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("chat_reports")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Report updated: ${id}`);
    return data as Report;
  } catch (error) {
    logger.error(`Error updating report ${id}:`, error);
    throw error;
  }
}

/**
 * Update report status (draft/published)
 */
export async function updateReportStatus(
  id: string,
  status: ReportStatus
): Promise<Report> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("chat_reports")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Report ${id} status changed to: ${status}`);
    return data as Report;
  } catch (error) {
    logger.error(`Error updating report ${id} status:`, error);
    throw error;
  }
}

/**
 * Delete report
 */
export async function deleteReport(id: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from("chat_reports").delete().eq("id", id);

    if (error) throw error;

    logger.info(`Report deleted: ${id}`);
  } catch (error) {
    logger.error(`Error deleting report ${id}:`, error);
    throw error;
  }
}

/**
 * Count reports for a client
 */
export async function countReportsByClient(
  clientId: string,
  status?: ReportStatus
): Promise<number> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("chat_reports")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId);

    if (status) {
      query = query.eq("status", status);
    }

    const { count, error } = await query;

    if (error) throw error;

    return count || 0;
  } catch (error) {
    logger.error(`Error counting reports for client ${clientId}:`, error);
    return 0;
  }
}

/**
 * Duplicate a report
 */
export async function duplicateReport(
  id: string,
  createdBy: string
): Promise<Report> {
  try {
    const original = await getReportById(id);
    if (!original) {
      throw new Error("Report not found");
    }

    const supabase = createAdminClient();

    const newContent = {
      ...original.content,
      metadata: {
        ...original.content.metadata,
        last_edited_at: new Date().toISOString(),
      },
    };

    const { data, error } = await supabase
      .from("chat_reports")
      .insert({
        zone_id: original.zone_id,
        client_id: original.client_id,
        created_by: createdBy,
        title: `${original.title} (Copy)`,
        status: "draft",
        content: newContent,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Report duplicated: ${id} -> ${data.id}`);
    return data as Report;
  } catch (error) {
    logger.error(`Error duplicating report ${id}:`, error);
    throw error;
  }
}

// ============================================================================
// REPORT SHARING FUNCTIONS
// ============================================================================

/**
 * Generate a cryptographically secure URL-safe token
 * Uses Node.js crypto for maximum security
 */
function generateShareToken(): string {
  // 16 bytes = 128 bits of entropy, base64url encoded = 22 characters
  return crypto.randomBytes(16).toString("base64url");
}

/**
 * Generate a human-readable password
 * 8 alphanumeric characters for easy communication
 */
function generateSharePassword(): string {
  // Generate random bytes and convert to alphanumeric string
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(8);
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

/**
 * Publish a report with secure sharing
 * Generates a unique token and password, hashes the password in DB
 */
export async function publishReport(id: string): Promise<PublishReportResult> {
  try {
    const supabase = createAdminClient();

    // Generate secure credentials
    const shareToken = generateShareToken();
    const plainPassword = generateSharePassword();

    // Hash password using pgcrypto function in Supabase
    const { data: hashResult, error: hashError } = await supabase.rpc(
      "hash_report_password",
      { p_password: plainPassword }
    );

    if (hashError) {
      logger.error("Error hashing password:", hashError);
      throw new Error("Failed to hash password");
    }

    const passwordHash = hashResult as string;

    // Update report with sharing info
    const { data, error } = await supabase
      .from("chat_reports")
      .update({
        status: "published" as ReportStatus,
        share_token: shareToken,
        share_password_hash: passwordHash,
        published_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (token collision - extremely rare)
      if (error.code === "23505") {
        logger.warn("Share token collision, retrying...");
        return publishReport(id); // Retry with new token
      }
      throw error;
    }

    logger.info(`Report published: ${id} with token ${shareToken.slice(0, 8)}...`);

    return {
      report: data as Report,
      shareToken,
      password: plainPassword,
      shareUrl: `/r/${shareToken}`,
    };
  } catch (error) {
    logger.error(`Error publishing report ${id}:`, error);
    throw error;
  }
}

/**
 * Unpublish a report (remove sharing)
 */
export async function unpublishReport(id: string): Promise<Report> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("chat_reports")
      .update({
        status: "draft" as ReportStatus,
        share_token: null,
        share_password_hash: null,
        published_at: null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Report unpublished: ${id}`);
    return data as Report;
  } catch (error) {
    logger.error(`Error unpublishing report ${id}:`, error);
    throw error;
  }
}

/**
 * Get published report by share token
 * Uses the secure RPC function that never exposes password hash
 */
export async function getPublishedReportByToken(
  shareToken: string
): Promise<PublishedReportData | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("get_published_report", {
      p_share_token: shareToken,
    });

    if (error) {
      logger.error("Error fetching published report:", error);
      return null;
    }

    // RPC returns an array, get first result
    const result = Array.isArray(data) ? data[0] : data;
    
    if (!result) return null;

    return {
      id: result.id,
      title: result.title,
      content: result.content,
      zone_name: result.zone_name,
      published_at: result.published_at,
      has_password: result.has_password,
    };
  } catch (error) {
    logger.error(`Error fetching report by token:`, error);
    return null;
  }
}

/**
 * Verify password for a shared report
 * Uses secure pgcrypto comparison in database
 */
export async function verifyReportPassword(
  shareToken: string,
  password: string
): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("verify_report_password", {
      p_share_token: shareToken,
      p_password: password,
    });

    if (error) {
      logger.error("Error verifying password:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    logger.error("Error in verifyReportPassword:", error);
    return false;
  }
}

/**
 * Get share info for a report (for UI display)
 */
export async function getReportShareInfo(
  id: string
): Promise<{ shareToken: string; shareUrl: string; publishedAt: string } | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("chat_reports")
      .select("share_token, published_at")
      .eq("id", id)
      .eq("status", "published")
      .single();

    if (error || !data?.share_token) return null;

    return {
      shareToken: data.share_token,
      shareUrl: `/r/${data.share_token}`,
      publishedAt: data.published_at,
    };
  } catch (error) {
    logger.error(`Error getting share info for ${id}:`, error);
    return null;
  }
}

/**
 * Regenerate password for a published report
 * Keeps the same share token (URL stays the same)
 * Generates a new password and updates the hash
 */
export async function regenerateSharePassword(
  id: string
): Promise<PublishReportResult | null> {
  try {
    const supabase = createAdminClient();

    // First check if the report is published
    const { data: existing, error: fetchError } = await supabase
      .from("chat_reports")
      .select("share_token, status")
      .eq("id", id)
      .single();

    if (fetchError || !existing?.share_token || existing.status !== "published") {
      logger.warn(`Cannot regenerate password for unpublished report ${id}`);
      return null;
    }

    // Generate new password
    const plainPassword = generateSharePassword();

    // Hash password using pgcrypto function in Supabase
    const { data: hashResult, error: hashError } = await supabase.rpc(
      "hash_report_password",
      { p_password: plainPassword }
    );

    if (hashError) {
      logger.error("Error hashing password:", hashError);
      throw new Error("Failed to hash password");
    }

    const passwordHash = hashResult as string;

    // Update only the password hash
    const { data, error } = await supabase
      .from("chat_reports")
      .update({
        share_password_hash: passwordHash,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Password regenerated for report: ${id}`);

    return {
      report: data as Report,
      shareToken: existing.share_token,
      password: plainPassword,
      shareUrl: `/r/${existing.share_token}`,
    };
  } catch (error) {
    logger.error(`Error regenerating password for ${id}:`, error);
    throw error;
  }
}

