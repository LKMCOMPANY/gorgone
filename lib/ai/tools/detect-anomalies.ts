/**
 * AI Tool: Detect Anomalies
 * Identifies unusual activity patterns (volume spikes, viral content, etc.)
 */

import { type Tool, type ToolCallOptions, zodSchema } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getToolContext } from "@/lib/ai/types";

const parametersSchema = z.object({
  sensitivity: z
    .enum(["low", "medium", "high"])
    .default("medium")
    .describe("Anomaly detection sensitivity"),
});

type Parameters = z.infer<typeof parametersSchema>;
type Output = Record<string, unknown>;

export const detectAnomaliesTool: Tool<Parameters, Output> = {
  description:
    "Detect abnormal spikes/viral concentration in zone activity (volume/engagement) at a chosen sensitivity.",

  inputSchema: zodSchema(parametersSchema),

  execute: async (
    { sensitivity },
    options: ToolCallOptions
  ): Promise<Output> => {
    const { zoneId, dataSources } = getToolContext(options);
    try {
      logger.info(`[AI Tool] detect_anomalies called`, { sensitivity });

      const supabase = createAdminClient();

      const thresholds: Record<string, { volume: number; engagement: number }> = {
        low: { volume: 3.0, engagement: 5.0 },
        medium: { volume: 2.0, engagement: 3.0 },
        high: { volume: 1.5, engagement: 2.0 },
      };

      const threshold = thresholds[sensitivity];
      const anomalies: Output = {
        sensitivity,
        detected_at: new Date().toISOString(),
      };

      if (dataSources.twitter) {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const { data: recent } = await supabase
          .from("twitter_tweets")
          .select("twitter_created_at")
          .eq("zone_id", zoneId)
          .gte("twitter_created_at", last24h.toISOString());

        const { data: baseline } = await supabase
          .from("twitter_tweets")
          .select("twitter_created_at")
          .eq("zone_id", zoneId)
          .gte("twitter_created_at", last7d.toISOString())
          .lt("twitter_created_at", last24h.toISOString());

        if (recent && baseline) {
          const recentAvg = recent.length / 24;
          const baselineAvg = baseline.length / (24 * 6);

          if (baselineAvg > 0 && recentAvg > baselineAvg * threshold.volume) {
            anomalies.twitter_volume_spike = {
              current_rate: Math.round(recentAvg),
              baseline_rate: Math.round(baselineAvg),
              multiplier: (recentAvg / baselineAvg).toFixed(2),
              severity: recentAvg > baselineAvg * 3 ? "high" : "medium",
            };
          }
        }

        const { data: viral } = await supabase
          .from("twitter_tweets")
          .select("tweet_id, text, total_engagement, author_profile_id")
          .eq("zone_id", zoneId)
          .gte("twitter_created_at", last24h.toISOString())
          .order("total_engagement", { ascending: false })
          .limit(10);

        if (viral && viral.length > 0) {
          const avgEngagement =
            viral.reduce((sum, t) => sum + (t.total_engagement || 0), 0) / viral.length;
          const topEngagement = viral[0].total_engagement || 0;

          if (avgEngagement > 0 && topEngagement > avgEngagement * threshold.engagement) {
            anomalies.viral_content = {
              count: viral.filter(
                (t) => (t.total_engagement || 0) > avgEngagement * threshold.engagement
              ).length,
              top_tweet: {
                text: viral[0].text.substring(0, 200),
                engagement: viral[0].total_engagement,
              },
              avg_baseline: Math.round(avgEngagement),
            };
          }
        }
      }

      if (dataSources.tiktok) {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const { data: viral } = await supabase
          .from("tiktok_videos")
          .select("video_id, description, total_engagement, play_count")
          .eq("zone_id", zoneId)
          .gte("tiktok_created_at", last24h.toISOString())
          .order("total_engagement", { ascending: false })
          .limit(5);

        if (viral && viral.length > 0) {
          const topVideo = viral[0];
          if (Number(topVideo.total_engagement) > 100000) {
            anomalies.tiktok_viral = {
              description: topVideo.description?.substring(0, 200),
              engagement: Number(topVideo.total_engagement),
              views: Number(topVideo.play_count),
            };
          }
        }
      }

      const hasAnomalies = Object.keys(anomalies).length > 2;

      return {
        has_anomalies: hasAnomalies,
        ...anomalies,
        message: hasAnomalies
          ? "Anomalies detected in zone activity"
          : "No significant anomalies detected in the selected period",
      };
    } catch (error) {
      logger.error("[AI Tool] detect_anomalies error", { error });
      throw new Error("Failed to detect anomalies");
    }
  },
};
