/**
 * Data layer for reports management
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type {
  Report,
  ReportContent,
  ReportListItem,
  ReportStatus,
  ReportWithZone,
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

    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      zone_id: row.zone_id,
      zone_name: row.zones?.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      word_count: row.content?.metadata?.word_count,
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

