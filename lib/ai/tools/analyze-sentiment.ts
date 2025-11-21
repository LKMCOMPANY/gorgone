/**
 * AI Tool: Analyze Sentiment
 * Analyzes overall sentiment across platforms
 */

import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { ToolContext } from "@/lib/ai/types";

export const analyzeSentimentTool = tool({
  description: `Analyze the overall sentiment of content in the zone.

Use this tool when the user asks for:
- "What is the sentiment?"
- "Is the mood positive or negative?"
- "Sentiment analysis"
- "How do people feel about [topic]?"

Returns sentiment breakdown with percentages and examples.`,

  parameters: z.object({
    topic: z.string().optional().describe("Specific topic to analyze (optional)"),
    period: z
      .enum(["3h", "6h", "12h", "24h", "7d", "30d"])
      .default("24h")
      .describe("Time period"),
  }),

  execute: async ({ topic, period }, context: ToolContext) => {
    try {
      logger.info(`[AI Tool] analyze_sentiment called`, {
        topic,
        period,
      });

      const { zoneId, dataSources } = context;
      const startDate = getStartDate(period);
      const supabase = createAdminClient();

      const result: any = {
        period,
        topic: topic || "all content",
      };

      // Media articles have sentiment scores (-1 to 1)
      if (dataSources.media) {
        const { data: articles } = await supabase
          .from("media_articles")
          .select("sentiment, title")
          .eq("zone_id", zoneId)
          .gte("published_at", startDate.toISOString())
          .not("sentiment", "is", null);

        if (articles && articles.length > 0) {
          const sentiments = articles.map((a) => a.sentiment!);
          const avgSentiment =
            sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;

          const positive = sentiments.filter((s) => s > 0.1).length;
          const negative = sentiments.filter((s) => s < -0.1).length;
          const neutral = sentiments.length - positive - negative;

          result.media = {
            avg_sentiment: Number(avgSentiment.toFixed(2)),
            total_articles: articles.length,
            positive_percent: Number(((positive / articles.length) * 100).toFixed(1)),
            negative_percent: Number(((negative / articles.length) * 100).toFixed(1)),
            neutral_percent: Number(((neutral / articles.length) * 100).toFixed(1)),
            most_positive: articles
              .filter((a) => a.sentiment! > 0)
              .sort((a, b) => b.sentiment! - a.sentiment!)
              .slice(0, 2)
              .map((a) => ({ title: a.title, score: a.sentiment })),
            most_negative: articles
              .filter((a) => a.sentiment! < 0)
              .sort((a, b) => a.sentiment! - b.sentiment!)
              .slice(0, 2)
              .map((a) => ({ title: a.title, score: a.sentiment })),
          };
        }
      }

      // Twitter: Calculate from engagement patterns (positive = high engagement)
      if (dataSources.twitter) {
        const { data: tweets, count } = await supabase
          .from("twitter_tweets")
          .select("total_engagement, text", { count: "exact" })
          .eq("zone_id", zoneId)
          .gte("twitter_created_at", startDate.toISOString());

        if (tweets && tweets.length > 0) {
          // Sort by engagement
          const sorted = tweets.sort(
            (a, b) => (b.total_engagement || 0) - (a.total_engagement || 0)
          );

          result.twitter = {
            total_tweets: count || tweets.length,
            top_engaged: sorted
              .slice(0, 3)
              .map((t) => ({
                text: t.text.substring(0, 100) + (t.text.length > 100 ? "..." : ""),
                engagement: t.total_engagement,
              })),
            note: "Twitter sentiment based on engagement levels",
          };
        }
      }

      // TikTok: Similar engagement-based heuristic
      if (dataSources.tiktok) {
        const { data: videos, count } = await supabase
          .from("tiktok_videos")
          .select("total_engagement, description", { count: "exact" })
          .eq("zone_id", zoneId)
          .gte("tiktok_created_at", startDate.toISOString());

        if (videos && videos.length > 0) {
          result.tiktok = {
            total_videos: count || videos.length,
            avg_engagement:
              videos.reduce((sum, v) => sum + Number(v.total_engagement || 0), 0) /
              videos.length,
            note: "TikTok sentiment based on engagement metrics",
          };
        }
      }

      return result;
    } catch (error) {
      logger.error("[AI Tool] analyze_sentiment error", { error });
      throw new Error("Failed to analyze sentiment");
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

