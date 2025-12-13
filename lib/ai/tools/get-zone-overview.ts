/**
 * AI Tool: Get Zone Overview
 * Provides comprehensive statistics across all platforms
 */

import { type Tool, type ToolCallOptions, zodSchema } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTrendingHashtags as getTwitterHashtags } from "@/lib/data/twitter/entities";
import { getTrendingHashtags as getTikTokHashtags } from "@/lib/data/tiktok/entities";
import { getArticlesByZone } from "@/lib/data/media/articles";
import { logger } from "@/lib/logger";
import { getToolContext } from "@/lib/ai/types";
import { getStartDate, buildResultMetadata } from "@/lib/ai/utils";

const parametersSchema = z.object({
  period: z
    .enum(["3h", "6h", "12h", "24h", "7d", "30d"])
    .default("24h")
    .describe("Time period to analyze"),
});

type Parameters = z.infer<typeof parametersSchema>;
type Output = Record<string, unknown>;

export const getZoneOverviewTool: Tool<Parameters, Output> = {
  description:
    "Get a comprehensive zone overview with activity metrics, top accounts, and trending topics across all enabled platforms. Use this as the FIRST tool when users ask general questions like 'what's happening?', 'give me an overview', or 'summary of activity'. Returns multi-platform data in a single call.",

  inputSchema: zodSchema(parametersSchema),

  execute: async (
    { period },
    options: ToolCallOptions
  ): Promise<Output> => {
    const { zoneId, dataSources } = getToolContext(options);
    try {
      logger.info(`[AI Tool] get_zone_overview called`, {
        zone_id: zoneId,
        period,
      });

      // Track which sources we query for metadata
      const sourcesQueried: string[] = [];
      const limitations: string[] = [];

      const overview: Output = {
        period,
        generated_at: new Date().toISOString(),
      };

      // Twitter stats (if enabled)
      if (dataSources.twitter) {
        sourcesQueried.push("twitter");
        try {
          const supabase = createAdminClient();
          const startDate = getStartDate(period);

          // Get top profiles via direct aggregation
          const { data: tweets } = await supabase
            .from("twitter_tweets")
            .select("author_profile_id, total_engagement, author:twitter_profiles(*)")
            .eq("zone_id", zoneId)
            .gte("twitter_created_at", startDate.toISOString())
            .not("author_profile_id", "is", null);

          // Aggregate by profile
          const profileStats = new Map<string, {
            profile: Record<string, unknown>;
            tweet_count: number;
            total_engagement: number;
          }>();
          if (tweets && tweets.length > 0) {
            for (const tweet of tweets as unknown as Array<{
              author_profile_id: string;
              total_engagement: number;
              author: Record<string, unknown>;
            }>) {
              if (!tweet.author) continue;
              const profileId = tweet.author_profile_id;
              const existing = profileStats.get(profileId) || {
                profile: tweet.author,
                tweet_count: 0,
                total_engagement: 0,
              };
              existing.tweet_count++;
              existing.total_engagement += tweet.total_engagement || 0;
              profileStats.set(profileId, existing);
            }
          }

          const topProfiles = Array.from(profileStats.values())
            .sort((a, b) => b.total_engagement - a.total_engagement)
            .slice(0, 5);

          // Get trending hashtags
          const trendingHashtags = await getTwitterHashtags(zoneId, {
            startDate,
            endDate: new Date(),
            limit: 10,
          });

          overview.twitter = {
            top_profiles: topProfiles.map((stats) => ({
              username: (stats.profile as { username?: string }).username,
              name: (stats.profile as { name?: string }).name,
              tweet_count: stats.tweet_count,
              total_engagement: stats.total_engagement,
              avg_engagement: Math.round(stats.total_engagement / stats.tweet_count),
            })),
            trending_hashtags: trendingHashtags.map((h) => ({
              hashtag: h.hashtag,
              count: h.count,
            })),
          };
        } catch (error) {
          logger.error("[AI Tool] Twitter overview failed", { error });
          overview.twitter = { error: "Failed to fetch Twitter data" };
          limitations.push("Twitter data unavailable");
        }
      }

      // TikTok stats (if enabled)
      if (dataSources.tiktok) {
        sourcesQueried.push("tiktok");
        try {
          const trendingHashtags = await getTikTokHashtags(zoneId, 10);

          overview.tiktok = {
            trending_hashtags: trendingHashtags.map((h) => ({
              hashtag: h.hashtag,
              count: h.count,
            })),
          };
        } catch (error) {
          logger.error("[AI Tool] TikTok overview failed", { error });
          overview.tiktok = { error: "Failed to fetch TikTok data" };
          limitations.push("TikTok data unavailable");
        }
      }

      // Media stats (if enabled)
      if (dataSources.media) {
        sourcesQueried.push("media");
        try {
          const startDate = getStartDate(period);
          const articles = await getArticlesByZone(zoneId, {
            startDate,
            endDate: new Date(),
            limit: 100,
          });

          const sentiments = articles
            .filter((a) => a.sentiment !== null)
            .map((a) => a.sentiment!);

          const avgSentiment =
            sentiments.length > 0
              ? sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
              : 0;

          overview.media = {
            total_articles: articles.length,
            avg_sentiment: avgSentiment.toFixed(2),
            top_sources: getTopSources(articles).slice(0, 5),
          };
        } catch (error) {
          logger.error("[AI Tool] Media overview failed", { error });
          overview.media = { error: "Failed to fetch Media data" };
          limitations.push("Media data unavailable");
        }
      }

      // Add traceability metadata
      overview._meta = buildResultMetadata({
        period,
        zoneId,
        sources: sourcesQueried,
        limitations: limitations.length > 0 ? limitations : undefined,
      });

      return overview;
    } catch (error) {
      logger.error("[AI Tool] get_zone_overview error", { error });
      // Return partial result instead of throwing
      return {
        period,
        generated_at: new Date().toISOString(),
        error: "Failed to generate complete zone overview",
        partial: true,
      };
    }
  },
};

// Helper function for media sources aggregation
function getTopSources(articles: Array<{ source_title?: string | null }>): Array<{ source: string; count: number }> {
  const sourceCounts = new Map<string, number>();

  articles.forEach((article) => {
    const source = article.source_title || "Unknown";
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  });

  return Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}
