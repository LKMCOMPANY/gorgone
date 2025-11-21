/**
 * AI Tool: Detect Anomalies
 * Identifies unusual activity patterns (volume spikes, viral content, etc.)
 */

import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { ToolContext } from "@/lib/ai/types";

export const detectAnomaliesTool = tool({
  description: `Detect anomalies and unusual patterns in the zone activity.

Use this tool when the user asks for:
- "Any unusual activity?"
- "Detect anomalies"
- "Are there any spikes?"
- "Viral content detection"
- "Suspicious patterns"

Returns volume spikes, viral content, and engagement anomalies.`,

  parameters: z.object({
    sensitivity: z
      .enum(["low", "medium", "high"])
      .default("medium")
      .describe("Anomaly detection sensitivity"),
  }),

  execute: async ({ sensitivity }, context: ToolContext) => {
    try {
      logger.info(`[AI Tool] detect_anomalies called`, {
        sensitivity,
      });

      const { zoneId, dataSources } = context;
      const supabase = createAdminClient();

      // Thresholds based on sensitivity
      const thresholds = {
        low: { volume: 3.0, engagement: 5.0 },
        medium: { volume: 2.0, engagement: 3.0 },
        high: { volume: 1.5, engagement: 2.0 },
      };

      const threshold = thresholds[sensitivity];
      const anomalies: any = {
        sensitivity,
        detected_at: new Date().toISOString(),
      };

      // Detect volume spikes (Twitter)
      if (dataSources.twitter) {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Get hourly counts
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
          const recentAvg = recent.length / 24; // Tweets per hour
          const baselineAvg = baseline.length / (24 * 6); // 6 days average

          if (recentAvg > baselineAvg * threshold.volume) {
            anomalies.twitter_volume_spike = {
              current_rate: Math.round(recentAvg),
              baseline_rate: Math.round(baselineAvg),
              multiplier: (recentAvg / baselineAvg).toFixed(2),
              severity: recentAvg > baselineAvg * 3 ? "high" : "medium",
            };
          }
        }

        // Detect viral content
        const { data: viral } = await supabase
          .from("twitter_tweets")
          .select("tweet_id, text, total_engagement, author_profile_id")
          .eq("zone_id", zoneId)
          .gte("twitter_created_at", last24h.toISOString())
          .order("total_engagement", { ascending: false })
          .limit(10);

        if (viral && viral.length > 0) {
          const avgEngagement =
            viral.reduce((sum, t) => sum + (t.total_engagement || 0), 0) /
            viral.length;
          const topEngagement = viral[0].total_engagement || 0;

          if (topEngagement > avgEngagement * threshold.engagement) {
            anomalies.viral_content = {
              count: viral.filter(
                (t) =>
                  (t.total_engagement || 0) > avgEngagement * threshold.engagement
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

      // TikTok anomalies
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

      const hasAnomalies = Object.keys(anomalies).length > 2; // More than default fields

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
});

function getStartDate(period: string): Date {
  const hours: Record<string, number> = {
    "3h": 3,
    "6h": 6,
    "12h": 12,
    "24h": 24,
    "7d": 168,
    "30d": 720,
  };
  return new Date(Date.now() - (hours[period] || 24) * 60 * 60 * 1000);
}

