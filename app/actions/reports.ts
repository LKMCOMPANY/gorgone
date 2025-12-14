/**
 * Server actions for reports management
 */

"use server";

import { revalidatePath } from "next/cache";
import {
  getReportsByClient,
  getReportById,
  createReport,
  updateReport,
  updateReportStatus,
  deleteReport,
  duplicateReport,
} from "@/lib/data/reports";
import { getZoneById } from "@/lib/data/zones";
import { getCurrentUser } from "@/lib/auth/utils";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import type {
  Report,
  ReportContent,
  ReportListItem,
  ReportStatus,
  ReportWithZone,
} from "@/types";

/**
 * Check if user can access reports for a client
 */
async function canAccessReports(clientId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Super admins and admins can access all reports
  if (isSuperAdmin(user.role) || user.role === "admin") return true;

  // Users can access reports from their own client
  return user.client_id === clientId;
}

/**
 * Check if user can manage reports (create, edit, delete)
 */
async function canManageReports(clientId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Super admins can manage all reports
  if (isSuperAdmin(user.role)) return true;

  // Managers can manage reports for their own client
  if (user.role === "manager" && user.client_id === clientId) return true;

  // Operators can create/edit their own reports
  if (user.role === "operator" && user.client_id === clientId) return true;

  return false;
}

/**
 * Get all reports for the current user's client
 */
export async function getReportsAction(options?: {
  status?: ReportStatus;
  zoneId?: string;
  limit?: number;
  offset?: number;
}): Promise<ReportListItem[] | null> {
  try {
    const user = await getCurrentUser();
    if (!user?.client_id) {
      logger.warn("Unauthorized attempt to view reports");
      return null;
    }

    if (!(await canAccessReports(user.client_id))) {
      return null;
    }

    const reports = await getReportsByClient(user.client_id, options);
    return reports;
  } catch (error) {
    logger.error("Error in getReportsAction:", error);
    return null;
  }
}

/**
 * Get a single report by ID
 */
export async function getReportAction(
  id: string
): Promise<ReportWithZone | null> {
  try {
    const report = await getReportById(id);
    if (!report) return null;

    if (!(await canAccessReports(report.client_id))) {
      logger.warn("Unauthorized attempt to view report");
      return null;
    }

    return report;
  } catch (error) {
    logger.error("Error in getReportAction:", error);
    return null;
  }
}

/**
 * Create a new report
 */
export async function createReportAction(
  zoneId: string,
  title?: string
): Promise<{ success: boolean; report?: Report; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user?.client_id) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify zone belongs to user's client
    const zone = await getZoneById(zoneId);
    if (!zone || zone.client_id !== user.client_id) {
      return { success: false, error: "Zone not found" };
    }

    if (!(await canManageReports(user.client_id))) {
      return { success: false, error: "Insufficient permissions" };
    }

    const now = new Date();
    const reportTitle = title || `Intelligence Report - ${now.toLocaleDateString("en-GB")}`;

    // Default empty content structure
    const defaultContent: ReportContent = {
      tiptap_document: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: reportTitle }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Start writing your report or use the library panel to add charts, data, and AI-generated content.",
              },
            ],
          },
        ],
      },
      config: {
        period: "24h",
        start_date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        end_date: now.toISOString(),
        data_sources: getActiveDataSources(zone.data_sources),
        ai_language: "en",
      },
      metadata: {
        version: "1.0",
        word_count: 0,
        last_edited_at: now.toISOString(),
      },
      embedded_items: {
        posts: [],
        charts: [],
        stats: [],
      },
    };

    const report = await createReport(
      zoneId,
      user.client_id,
      user.id,
      reportTitle,
      defaultContent
    );

    revalidatePath("/dashboard/reports");

    return { success: true, report };
  } catch (error) {
    logger.error("Error in createReportAction:", error);
    return { success: false, error: "Failed to create report" };
  }
}

/**
 * Update a report (auto-save)
 * 
 * Uses JSON string serialization for content to ensure complex nested objects
 * (like Tiptap document with custom node attrs) are not corrupted during
 * Server Action transmission. This is a best practice for rich document content.
 */
export async function updateReportAction(
  id: string,
  updates: {
    title?: string;
    summary?: string;
    contentJson?: string; // Serialized ReportContent - safer for Server Actions
    content?: ReportContent; // Legacy support
  }
): Promise<{ success: boolean; report?: Report; error?: string }> {
  try {
    const existing = await getReportById(id);
    if (!existing) {
      return { success: false, error: "Report not found" };
    }

    if (!(await canManageReports(existing.client_id))) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Parse content from JSON string if provided
    // Using JSON serialization ensures complex nested objects (Tiptap node attrs)
    // are reliably transmitted through Server Actions
    let parsedContent: ReportContent | undefined;
    if (updates.contentJson) {
      try {
        parsedContent = JSON.parse(updates.contentJson) as ReportContent;
      } catch (parseError) {
        logger.error("Failed to parse report content JSON:", parseError);
        return { success: false, error: "Invalid content format" };
      }
    } else if (updates.content) {
      // Legacy support for direct content object
      parsedContent = updates.content;
    }

    // Update metadata timestamp
    if (parsedContent) {
      parsedContent.metadata.last_edited_at = new Date().toISOString();
    }

    const report = await updateReport(id, {
      title: updates.title,
      summary: updates.summary,
      content: parsedContent,
    });

    // Don't revalidate on every auto-save to avoid performance issues
    // revalidatePath("/dashboard/reports");

    return { success: true, report };
  } catch (error) {
    logger.error("Error in updateReportAction:", error);
    return { success: false, error: "Failed to update report" };
  }
}

/**
 * Publish or unpublish a report
 */
export async function updateReportStatusAction(
  id: string,
  status: ReportStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await getReportById(id);
    if (!existing) {
      return { success: false, error: "Report not found" };
    }

    if (!(await canManageReports(existing.client_id))) {
      return { success: false, error: "Insufficient permissions" };
    }

    await updateReportStatus(id, status);

    revalidatePath("/dashboard/reports");
    revalidatePath(`/dashboard/reports/${id}`);

    return { success: true };
  } catch (error) {
    logger.error("Error in updateReportStatusAction:", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Delete a report
 */
export async function deleteReportAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await getReportById(id);
    if (!existing) {
      return { success: false, error: "Report not found" };
    }

    if (!(await canManageReports(existing.client_id))) {
      return { success: false, error: "Insufficient permissions" };
    }

    await deleteReport(id);

    revalidatePath("/dashboard/reports");

    return { success: true };
  } catch (error) {
    logger.error("Error in deleteReportAction:", error);
    return { success: false, error: "Failed to delete report" };
  }
}

/**
 * Duplicate a report
 */
export async function duplicateReportAction(
  id: string
): Promise<{ success: boolean; report?: Report; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const existing = await getReportById(id);
    if (!existing) {
      return { success: false, error: "Report not found" };
    }

    if (!(await canManageReports(existing.client_id))) {
      return { success: false, error: "Insufficient permissions" };
    }

    const report = await duplicateReport(id, user.id);

    revalidatePath("/dashboard/reports");

    return { success: true, report };
  } catch (error) {
    logger.error("Error in duplicateReportAction:", error);
    return { success: false, error: "Failed to duplicate report" };
  }
}

// Helper function to get active data sources
function getActiveDataSources(
  dataSources: { twitter: boolean; tiktok: boolean; media: boolean }
): ("twitter" | "tiktok" | "media")[] {
  const active: ("twitter" | "tiktok" | "media")[] = [];
  if (dataSources.twitter) active.push("twitter");
  if (dataSources.tiktok) active.push("tiktok");
  if (dataSources.media) active.push("media");
  return active.length > 0 ? active : ["twitter"];
}

