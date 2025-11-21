/**
 * AI Tool: Get Media Coverage
 * Analyzes media coverage of a topic or event
 */

import { tool } from "ai";
import { z } from "zod";
import { getArticlesByZone } from "@/lib/data/media/articles";
import { logger } from "@/lib/logger";
import type { ToolContext } from "@/lib/ai/types";

export const getMediaCoverageTool = tool({
  description: `Analyze media coverage of a specific topic or event.

Use this tool when the user asks for:
- "Media coverage of [topic]"
- "How is the press covering [event]?"
- "News articles about [subject]"
- "Media sentiment on [topic]"

Returns articles, sources, sentiment breakdown, and coverage volume.`,

  parameters: z.object({
    topic: z.string().describe("Topic or keyword to analyze"),
    period: z
      .enum(["24h", "7d", "30d"])
      .default("7d")
      .describe("Time period"),
    min_social_score: z
      .number()
      .optional()
      .describe("Minimum social media engagement score"),
  }),

  execute: async ({ topic, period, min_social_score }, context: any) => {
    try {
      logger.info(`[AI Tool] get_media_coverage called`, {
        topic,
        period,
      });

      const { zoneId } = context;
      const startDate = getStartDate(period);

      // Search articles
      const articles = await getArticlesByZone(zoneId, {
        searchText: topic,
        startDate,
        endDate: new Date(),
        limit: 100,
      });

      if (articles.length === 0) {
        return {
          found: false,
          message: `No media coverage found for "${topic}" in the last ${period}.`,
        };
      }

      // Filter by social score if specified
      const filtered = min_social_score
        ? articles.filter((a) => (a.social_score || 0) >= min_social_score)
        : articles;

      // Calculate sentiment breakdown
      const withSentiment = filtered.filter((a) => a.sentiment !== null);
      const sentiments = withSentiment.map((a) => a.sentiment!);

      const avgSentiment =
        sentiments.length > 0
          ? sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
          : 0;

      const positive = sentiments.filter((s) => s > 0.1).length;
      const negative = sentiments.filter((s) => s < -0.1).length;
      const neutral = sentiments.length - positive - negative;

      // Top sources
      const sourceCounts = new Map<string, number>();
      filtered.forEach((a) => {
        const source = a.source_title;
        sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
      });

      const topSources = Array.from(sourceCounts.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Top articles by social score
      const topArticles = filtered
        .sort((a, b) => (b.social_score || 0) - (a.social_score || 0))
        .slice(0, 5)
        .map((a) => ({
          title: a.title,
          source: a.source_title,
          sentiment: a.sentiment,
          social_score: a.social_score,
          published_at: a.published_at,
          url: a.url,
        }));

      return {
        found: true,
        topic,
        period,
        total_articles: filtered.length,
        sentiment: {
          average: Number(avgSentiment.toFixed(2)),
          positive_percent:
            sentiments.length > 0
              ? Number(((positive / sentiments.length) * 100).toFixed(1))
              : 0,
          negative_percent:
            sentiments.length > 0
              ? Number(((negative / sentiments.length) * 100).toFixed(1))
              : 0,
          neutral_percent:
            sentiments.length > 0
              ? Number(((neutral / sentiments.length) * 100).toFixed(1))
              : 0,
        },
        top_sources: topSources,
        top_articles: topArticles,
      };
    } catch (error) {
      logger.error("[AI Tool] get_media_coverage error", { error });
      throw new Error("Failed to get media coverage");
    }
  },
});

function getStartDate(period: string): Date {
  const hours: Record<string, number> = {
    "24h": 24,
    "7d": 168,
    "30d": 720,
  };
  return new Date(Date.now() - (hours[period] || 168) * 60 * 60 * 1000);
}

