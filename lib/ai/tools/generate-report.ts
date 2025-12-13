/**
 * AI Tool: Generate Report
 * Signals to GPT to create a comprehensive report using other tools
 */

import { type Tool, type ToolCallOptions, zodSchema } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getToolContext } from "@/lib/ai/types";
import { getStartDate } from "@/lib/ai/utils";

const parametersSchema = z.object({
  period: z
    .enum(["3h", "6h", "12h", "24h", "7d", "30d"])
    .default("24h")
    .describe("Time period for the report"),
  include_sections: z
    .array(
      z.enum([
        "overview",
        "top_content",
        "top_accounts",
        "trending",
        "sentiment",
        "share_of_voice",
        "anomalies",
      ])
    )
    .optional()
    .describe("Sections to include (default: all)"),
});

type Parameters = z.infer<typeof parametersSchema>;
type Output = Record<string, unknown>;

export const generateReportTool: Tool<Parameters, Output> = {
  description:
    "Generate a structured executive briefing/report covering multiple aspects: overview, top content, influencers, trends, sentiment, and anomalies. Use when users request 'create a report', 'briefing', 'executive summary', or 'formal note'. Returns data to format as professional document.",

  inputSchema: zodSchema(parametersSchema),

  execute: async (
    { period, include_sections },
    options: ToolCallOptions
  ): Promise<Output> => {
    const { zoneId, dataSources } = getToolContext(options);
    try {
      logger.info(`[AI Tool] generate_report called`, {
        period,
        include_sections: include_sections || "all",
      });

      const supabase = createAdminClient();
      const startDate = getStartDate(period);

      const sections = include_sections || [
        "overview",
        "top_content",
        "top_accounts",
        "trending",
        "sentiment",
        "share_of_voice",
        "anomalies",
      ];

      const stats: Record<string, number> = {};

      if (dataSources.twitter) {
        const { count } = await supabase
          .from("twitter_tweets")
          .select("*", { count: "exact", head: true })
          .eq("zone_id", zoneId)
          .gte("twitter_created_at", startDate.toISOString());

        stats.twitter_posts = count || 0;
      }

      if (dataSources.tiktok) {
        const { count } = await supabase
          .from("tiktok_videos")
          .select("*", { count: "exact", head: true })
          .eq("zone_id", zoneId)
          .gte("tiktok_created_at", startDate.toISOString());

        stats.tiktok_videos = count || 0;
      }

      if (dataSources.media) {
        const { count } = await supabase
          .from("media_articles")
          .select("*", { count: "exact", head: true })
          .eq("zone_id", zoneId)
          .gte("published_at", startDate.toISOString());

        stats.media_articles = count || 0;
      }

      return {
        _type: "report_request",
        period,
        generated_at: new Date().toISOString(),
        sections_requested: sections,
        quick_stats: stats,
        instructions: `Create a comprehensive ${period} monitoring report with the following sections: ${sections.join(", ")}. Use the appropriate tools to gather data for each section and format as a professional executive report.`,
      };
    } catch (error) {
      logger.error("[AI Tool] generate_report error", { error });
      return {
        _type: "report_request",
        period,
        error: "Failed to gather data for report",
        instructions: "Unable to generate report due to data access issues",
      };
    }
  },
};

// getStartDate imported from @/lib/ai/utils
