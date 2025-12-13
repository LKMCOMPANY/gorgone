/**
 * AI Tool: Get Opinion Map Summary
 * Summarizes the latest opinion map clustering analysis
 */

import { type Tool, type ToolCallOptions, zodSchema } from "ai";
import { z } from "zod";
import { getLatestSession } from "@/lib/data/twitter/opinion-map/sessions";
import { getClusters } from "@/lib/data/twitter/opinion-map/clusters";
import { logger } from "@/lib/logger";
import { getToolContext } from "@/lib/ai/types";

const parametersSchema = z.object({
  limit: z.number().min(1).max(20).default(10).describe("Number of top clusters"),
});

type Parameters = z.infer<typeof parametersSchema>;
type Output = Record<string, unknown>;

export const getOpinionMapSummaryTool: Tool<Parameters, Output> = {
  description:
    "Summarize opinion clustering from the latest UMAP analysis session: dominant clusters, themes, and polarization. Use for 'opinion landscape', 'what are the main narratives?', or 'polarization analysis'. Requires Opinion Map to be generated first.",

  inputSchema: zodSchema(parametersSchema),

  execute: async (
    { limit },
    options: ToolCallOptions
  ): Promise<Output> => {
    const { zoneId } = getToolContext(options);
    try {
      logger.info(`[AI Tool] get_opinion_map_summary called`, { limit });

      const session = await getLatestSession(zoneId);

      if (!session) {
        return {
          available: false,
          message:
            "No opinion map has been generated yet. Generate one from the Analysis page.",
        };
      }

      if (session.status !== "completed") {
        return {
          available: false,
          status: session.status,
          progress: session.progress,
          message: `Opinion map is currently ${session.status} (${session.progress}%)`,
        };
      }

      const clusters = await getClusters(zoneId, session.session_id);

      if (!clusters || clusters.length === 0) {
        return {
          available: false,
          message: "No clusters found in the opinion map.",
        };
      }

      const sortedClusters = clusters
        .sort((a, b) => (b.tweet_count || 0) - (a.tweet_count || 0))
        .slice(0, limit);

      const totalTweets = session.total_tweets || 0;

      return {
        available: true,
        session_date: session.created_at,
        total_tweets: totalTweets,
        total_clusters: clusters.length,
        outliers: session.outlier_count || 0,
        dominant_cluster: sortedClusters[0]
          ? {
              label: sortedClusters[0].label,
              tweet_count: sortedClusters[0].tweet_count,
              percentage:
                totalTweets > 0
                  ? ((sortedClusters[0].tweet_count! / totalTweets) * 100).toFixed(1)
                  : "0",
              keywords: sortedClusters[0].keywords,
              sentiment: sortedClusters[0].avg_sentiment,
            }
          : null,
        top_clusters: sortedClusters.map((c) => ({
          label: c.label,
          tweet_count: c.tweet_count,
          percentage:
            totalTweets > 0
              ? ((c.tweet_count! / totalTweets) * 100).toFixed(1)
              : "0",
          keywords: c.keywords?.slice(0, 5),
          sentiment: c.avg_sentiment,
          coherence: c.coherence_score,
        })),
      };
    } catch (error) {
      logger.error("[AI Tool] get_opinion_map_summary error", { error });
      return {
        error: "Failed to retrieve opinion map data",
        note: "Opinion map may not be generated yet for this zone",
      };
    }
  },
};
