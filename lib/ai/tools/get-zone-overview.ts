/**
 * AI Tool: Get Zone Overview
 * Provides comprehensive statistics across all platforms
 */

import { tool } from "ai";
import { z } from "zod";
import { getTopProfilesByPeriod } from "@/lib/data/twitter/analytics";
import { getTrendingHashtags as getTwitterHashtags } from "@/lib/data/twitter/entities";
import { getTrendingHashtags as getTikTokHashtags } from "@/lib/data/tiktok/entities";
import { getArticlesByZone } from "@/lib/data/media/articles";
import { logger } from "@/lib/logger";
import type { ToolContext } from "@/lib/ai/types";

export const getZoneOverviewTool = tool({
  description: `Get a comprehensive overview of zone activity across all platforms (Twitter, TikTok, Media).
  
Use this tool when the user asks for:
- "Give me an overview"
- "What's happening in this zone?"
- "Summary of recent activity"
- "Show me the big picture"

Returns aggregated statistics, top content, and trending topics.`,

  parameters: z.object({
    period: z
      .enum(["3h", "6h", "12h", "24h", "7d", "30d"])
      .default("24h")
      .describe("Time period to analyze"),
  }),

  execute: async ({ period }, context: ToolContext) => {
    const { zoneId, dataSources } = context;
    try {
      logger.info(`[AI Tool] get_zone_overview called`, {
        zone_id: zoneId,
        period,
      });

      const overview: any = {
        period,
        generated_at: new Date().toISOString(),
      };

      // Twitter stats (if enabled)
      if (dataSources.twitter) {
        try {
          const topProfiles = await getTopProfilesByPeriod(zoneId, period, 5);
          const startDate = getStartDate(period);
          const trendingHashtags = await getTwitterHashtags(zoneId, {
            startDate,
            endDate: new Date(),
            limit: 10,
          });

          overview.twitter = {
            top_profiles: topProfiles.map((p) => ({
              username: p.username,
              name: p.name,
              tweet_count: p.tweet_count,
              total_engagement: p.total_engagement,
              avg_engagement: p.avg_engagement,
            })),
            trending_hashtags: trendingHashtags.map((h) => ({
              hashtag: h.hashtag,
              count: h.count,
            })),
          };
        } catch (error) {
          logger.error("[AI Tool] Twitter overview failed", { error });
          overview.twitter = { error: "Failed to fetch Twitter data" };
        }
      }

      // TikTok stats (if enabled)
      if (dataSources.tiktok) {
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
        }
      }

      // Media stats (if enabled)
      if (dataSources.media) {
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
        }
      }

      return overview;
    } catch (error) {
      logger.error("[AI Tool] get_zone_overview error", { error });
      throw new Error("Failed to generate zone overview");
    }
  },
});

// Helper functions
function getPeriodHours(period: string): number {
  const map: Record<string, number> = {
    "3h": 3,
    "6h": 6,
    "12h": 12,
    "24h": 24,
    "7d": 168,
    "30d": 720,
  };
  return map[period] || 24;
}

function getStartDate(period: string): Date {
  const hours = getPeriodHours(period);
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function getTopSources(articles: any[]): Array<{ source: string; count: number }> {
  const sourceCounts = new Map<string, number>();

  articles.forEach((article) => {
    const source = article.source_title || "Unknown";
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  });

  return Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}

