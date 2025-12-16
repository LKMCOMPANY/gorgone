/**
 * AI Tool: Generate Opinion Report
 * Creates a comprehensive opinion analysis report from the latest Opinion Map
 *
 * Key features:
 * - Uses ACTUAL session date range (not hardcoded period)
 * - Returns cluster evolution chart (same as Analysis page)
 * - All labels in English (AI adapts response language)
 * - Tweet examples with full metadata for tweet card display
 */

import { type Tool, type ToolCallOptions, zodSchema } from "ai";
import { z } from "zod";
import { getLatestCompletedSession } from "@/lib/data/twitter/opinion-map/sessions";
import { getClusters } from "@/lib/data/twitter/opinion-map/clusters";
import { getEnrichedProjections } from "@/lib/data/twitter/opinion-map/projections";
import { generateTimeSeriesData } from "@/lib/data/twitter/opinion-map/time-series";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getToolContext } from "@/lib/ai/types";
import { buildResultMetadata } from "@/lib/ai/utils";
import { getOpinionClusterColor } from "@/types";

const parametersSchema = z.object({
  include_examples: z
    .boolean()
    .default(true)
    .describe("Include representative tweet examples per cluster"),
  examples_per_cluster: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe("Number of tweet examples per cluster"),
  max_clusters: z
    .number()
    .min(3)
    .max(15)
    .default(10)
    .describe("Maximum clusters to analyze"),
});

type Parameters = z.infer<typeof parametersSchema>;
type Output = Record<string, unknown>;

/** Tweet example for display in report */
interface TweetExample {
  tweet_id: string;
  text: string;
  author_username: string;
  author_name: string;
  author_verified: boolean;
  author_profile_picture_url: string | null;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
    views: number;
  };
  created_at: string;
  tweet_url: string;
}

/** Cluster analysis for report */
interface ClusterAnalysis {
  cluster_id: number;
  label: string;
  description: string | null;
  keywords: string[];
  tweet_count: number;
  percentage: string;
  sentiment: number | null;
  sentiment_label: "positive" | "neutral" | "negative";
  coherence_score: number | null;
  color: string;
  examples: TweetExample[];
}

/**
 * Format date for display
 */
function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
}

/**
 * Calculate how old the session is
 */
function getSessionAge(sessionDate: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - sessionDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "less than 1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

export const generateOpinionReportTool: Tool<Parameters, Output> = {
  description:
    "Generate a complete Opinion Report from the latest Opinion Map analysis. Returns cluster breakdown with AI-generated labels, percentage distribution, sentiment, evolution chart over time, and representative tweet examples. Uses the ACTUAL date range of the generated map. Use for 'opinion report', 'rapport d'opinion', 'opinion analysis', or 'narrative analysis'.",

  inputSchema: zodSchema(parametersSchema),

  execute: async (
    { include_examples, examples_per_cluster, max_clusters },
    options: ToolCallOptions
  ): Promise<Output> => {
    const { zoneId } = getToolContext(options);
    const supabase = createAdminClient();

    try {
      logger.info(`[AI Tool] generate_opinion_report called`, {
        zone_id: zoneId,
        include_examples,
        examples_per_cluster,
        max_clusters,
      });

      // ========================================
      // STEP 1: Get latest COMPLETED session
      // ========================================
      const session = await getLatestCompletedSession(zoneId);

      if (!session) {
        return {
          available: false,
          error: "no_opinion_map",
          message:
            "No completed opinion map is available. Generate one from the Analysis page.",
          suggestion:
            "Navigate to Analysis > Opinion Map and generate a new map first.",
        };
      }

      // ========================================
      // STEP 2: Calculate session date range
      // ========================================
      const sessionCreatedAt = new Date(session.created_at);

      const sessionConfig = session.config as {
        startDate?: string;
        endDate?: string;
      } | null;

      const dataStartDate = sessionConfig?.startDate
        ? new Date(sessionConfig.startDate)
        : new Date(sessionCreatedAt.getTime() - 7 * 24 * 60 * 60 * 1000);

      const dataEndDate = sessionConfig?.endDate
        ? new Date(sessionConfig.endDate)
        : sessionCreatedAt;

      const sessionAge = getSessionAge(sessionCreatedAt);
      const dateRange = formatDateRange(dataStartDate, dataEndDate);

      // ========================================
      // STEP 3: Get clusters with full data
      // ========================================
      const allClusters = await getClusters(zoneId, session.session_id);

      if (!allClusters || allClusters.length === 0) {
        return {
          available: false,
          error: "no_clusters",
          message: "No clusters found in the opinion map.",
        };
      }

      const totalTweets = session.total_tweets || 0;
      const topClusters = allClusters.slice(0, max_clusters);

      // ========================================
      // STEP 4: Get enriched projections for evolution chart
      // ========================================
      const enrichedProjections = await getEnrichedProjections(
        zoneId,
        session.session_id
      );

      // Generate time series data (same as Analysis page)
      const evolutionData = generateTimeSeriesData(
        enrichedProjections,
        topClusters,
        dataStartDate,
        dataEndDate
      );

      logger.info(`[AI Tool] Evolution data generated`, {
        data_points: evolutionData.length,
        clusters: topClusters.length,
      });

      // ========================================
      // STEP 5: Build evolution chart config
      // ========================================
      const evolutionChartConfig: Record<string, { label: string; color: string }> = {};
      topClusters.forEach((cluster) => {
        evolutionChartConfig[`cluster_${cluster.cluster_id}`] = {
          label: cluster.label || `Cluster ${cluster.cluster_id}`,
          color: getOpinionClusterColor(cluster.cluster_id),
        };
      });

      const evolutionChart = evolutionData.length > 1
        ? {
            _type: "visualization" as const,
            chart_type: "stacked_area" as const,
            title: "Opinion Evolution Over Time",
            description: "Distribution of opinion clusters over time",
            data: evolutionData,
            config: evolutionChartConfig,
            clusters: topClusters.map((c) => ({
              id: c.cluster_id,
              label: c.label,
              color: getOpinionClusterColor(c.cluster_id),
            })),
          }
        : null;

      // ========================================
      // STEP 6: Get tweet examples per cluster
      // ========================================
      const clusterAnalyses: ClusterAnalysis[] = [];

      for (const cluster of topClusters) {
        let examples: TweetExample[] = [];

        if (include_examples) {
          const { data: projections } = await supabase
            .from("twitter_tweet_projections")
            .select(
              `
              tweet:twitter_tweets!tweet_db_id (
                tweet_id,
                text,
                twitter_created_at,
                retweet_count,
                reply_count,
                like_count,
                view_count,
                total_engagement,
                author:twitter_profiles!author_profile_id (
                  username,
                  name,
                  profile_picture_url,
                  is_verified,
                  is_blue_verified
                )
              )
            `
            )
            .eq("session_id", session.session_id)
            .eq("cluster_id", cluster.cluster_id)
            .order("cluster_confidence", { ascending: false })
            .limit(examples_per_cluster * 2);

          if (projections && projections.length > 0) {
            const sortedProjections = (projections as any[])
              .filter((p) => p.tweet && p.tweet.author)
              .sort(
                (a, b) =>
                  (b.tweet?.total_engagement || 0) -
                  (a.tweet?.total_engagement || 0)
              )
              .slice(0, examples_per_cluster);

            examples = sortedProjections.map((p) => ({
              tweet_id: p.tweet.tweet_id,
              text: p.tweet.text,
              author_username: p.tweet.author?.username || "unknown",
              author_name: p.tweet.author?.name || "Unknown",
              author_verified:
                p.tweet.author?.is_verified ||
                p.tweet.author?.is_blue_verified ||
                false,
              author_profile_picture_url:
                p.tweet.author?.profile_picture_url || null,
              engagement: {
                likes: p.tweet.like_count || 0,
                retweets: p.tweet.retweet_count || 0,
                replies: p.tweet.reply_count || 0,
                views: p.tweet.view_count || 0,
              },
              created_at: p.tweet.twitter_created_at,
              tweet_url: `https://x.com/${p.tweet.author?.username}/status/${p.tweet.tweet_id}`,
            }));
          }
        }

        // Determine sentiment label
        const sentiment = cluster.avg_sentiment;
        let sentimentLabel: "positive" | "neutral" | "negative" = "neutral";
        if (sentiment !== null) {
          if (sentiment > 0.2) sentimentLabel = "positive";
          else if (sentiment < -0.2) sentimentLabel = "negative";
        }

        clusterAnalyses.push({
          cluster_id: cluster.cluster_id,
          label: cluster.label || `Cluster ${cluster.cluster_id}`,
          description: cluster.reasoning || null,
          keywords: cluster.keywords || [],
          tweet_count: cluster.tweet_count || 0,
          percentage:
            totalTweets > 0
              ? ((cluster.tweet_count! / totalTweets) * 100).toFixed(1)
              : "0",
          sentiment,
          sentiment_label: sentimentLabel,
          coherence_score: cluster.coherence_score,
          color: getOpinionClusterColor(cluster.cluster_id),
          examples,
        });
      }

      // ========================================
      // STEP 7: Calculate distribution data
      // ========================================
      const distributionData = clusterAnalyses.map((c) => ({
        name: c.label,
        value: c.tweet_count,
        percentage: parseFloat(c.percentage),
        color: c.color,
      }));

      // ========================================
      // STEP 8: Build structured report
      // ========================================
      const report: Output = {
        _type: "opinion_report",
        available: true,

        // Metadata for traceability
        _meta: buildResultMetadata({
          period: dateRange,
          zoneId,
          sources: ["twitter_opinion_map"],
          recordCount: totalTweets,
        }),

        // Session info with ACTUAL dates
        session: {
          id: session.session_id,
          generated_at: session.created_at,
          completed_at: session.completed_at,
          session_age: sessionAge,
          data_period: {
            start: dataStartDate.toISOString(),
            end: dataEndDate.toISOString(),
            display: dateRange,
          },
          total_tweets_analyzed: totalTweets,
          total_clusters: allClusters.length,
          outliers: session.outlier_count || 0,
          execution_time_seconds: session.execution_time_ms
            ? Math.round(session.execution_time_ms / 1000)
            : null,
        },

        // Summary stats
        summary: {
          dominant_cluster: clusterAnalyses[0]?.label || "Unknown",
          dominant_percentage: clusterAnalyses[0]?.percentage || "0",
          total_clusters_shown: clusterAnalyses.length,
          sentiment_breakdown: {
            positive: clusterAnalyses.filter((c) => c.sentiment_label === "positive").length,
            neutral: clusterAnalyses.filter((c) => c.sentiment_label === "neutral").length,
            negative: clusterAnalyses.filter((c) => c.sentiment_label === "negative").length,
          },
        },

        // Cluster analysis (main content)
        clusters: clusterAnalyses,

        // Distribution data for pie/bar chart
        distribution: distributionData,

        // Evolution chart (stacked area - same as Analysis page)
        evolution_chart: evolutionChart,

        // Formatting hints for AI
        formatting_hints: {
          note: "Format as structured report. Adapt language to user but use English labels from data.",
          sections: [
            "Introduction with session date range and tweet count",
            "Evolution chart showing narrative trends over time",
            "Cluster breakdown with percentages and descriptions",
            "Tweet examples formatted as cards with engagement stats",
            "Synthesis and key takeaways",
          ],
          tweet_card_format: {
            header: "Author name (@username) + verified badge if applicable",
            body: "Tweet text",
            footer: "❤️ likes, 🔄 RT, 💬 replies, 👁️ views",
            link: "Link to original tweet",
          },
        },
      };

      return report;
    } catch (error) {
      logger.error("[AI Tool] generate_opinion_report error", { error });
      return {
        available: false,
        error: "generation_failed",
        message: "Failed to generate opinion report",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
