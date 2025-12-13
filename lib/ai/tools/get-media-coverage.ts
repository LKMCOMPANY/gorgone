/**
 * AI Tool: Get Media Coverage
 * Analyzes media coverage of a topic or event
 */

import { type Tool, type ToolCallOptions, zodSchema } from "ai";
import { z } from "zod";
import { getArticlesByZone } from "@/lib/data/media/articles";
import { logger } from "@/lib/logger";
import { getToolContext } from "@/lib/ai/types";
import { getStartDate } from "@/lib/ai/utils";

const parametersSchema = z.object({
  topic: z.string().describe("Topic or keyword to analyze"),
  period: z
    .enum(["24h", "7d", "30d"])
    .default("7d")
    .describe("Time period"),
  min_social_score: z
    .number()
    .optional()
    .describe("Minimum social media engagement score"),
});

type Parameters = z.infer<typeof parametersSchema>;

/** Structured article for UI rendering */
type ArticleResult = {
  article_id: string;
  title: string;
  source: string;
  body_preview: string;
  sentiment: number | null;
  social_score: number | null;
  published_at: string;
  url: string;
};

type Output = {
  _type: "media_coverage";
  found: boolean;
  topic: string;
  period: string;
  total_articles: number;
  sentiment: {
    average: number;
    positive_percent: number;
    negative_percent: number;
    neutral_percent: number;
  };
  top_sources: Array<{ source: string; count: number }>;
  articles: ArticleResult[];
  message?: string;
};

export const getMediaCoverageTool: Tool<Parameters, Output> = {
  description:
    "Generate a complete media coverage report: article count, source diversity, sentiment breakdown (positive/negative/neutral %), and top articles with engagement scores. Returns structured data for ArticleCards display. Use for 'media report', 'press coverage', 'news analysis', or 'media coverage on X'. Only available when Media data source is enabled.",

  inputSchema: zodSchema(parametersSchema),

  execute: async (
    { topic, period, min_social_score },
    options: ToolCallOptions
  ): Promise<Output> => {
    const { zoneId } = getToolContext(options);
    try {
      logger.info(`[AI Tool] get_media_coverage called`, { topic, period });

      const startDate = getStartDate(period);

      const articles = await getArticlesByZone(zoneId, {
        searchText: topic,
        startDate,
        endDate: new Date(),
        limit: 100,
      });

      if (articles.length === 0) {
        return {
          _type: "media_coverage",
          found: false,
          topic,
          period,
          total_articles: 0,
          sentiment: { average: 0, positive_percent: 0, negative_percent: 0, neutral_percent: 0 },
          top_sources: [],
          articles: [],
          message: `No media coverage found for "${topic}" in the last ${period}.`,
        };
      }

      const filtered = min_social_score
        ? articles.filter((a) => (a.social_score || 0) >= min_social_score)
        : articles;

      const withSentiment = filtered.filter((a) => a.sentiment !== null);
      const sentiments = withSentiment.map((a) => a.sentiment!);

      const avgSentiment =
        sentiments.length > 0
          ? sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
          : 0;

      const positive = sentiments.filter((s) => s > 0.1).length;
      const negative = sentiments.filter((s) => s < -0.1).length;
      const neutral = sentiments.length - positive - negative;

      const sourceCounts = new Map<string, number>();
      filtered.forEach((a) => {
        const source = a.source_title;
        sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
      });

      const topSources = Array.from(sourceCounts.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get top articles with full data for ArticleCards (up to 10)
      const topArticles: ArticleResult[] = filtered
        .sort((a, b) => (b.social_score || 0) - (a.social_score || 0))
        .slice(0, 10)
        .map((a) => ({
          article_id: a.article_uri,
          title: a.title,
          source: a.source_title || "Unknown Source",
          body_preview: a.body?.substring(0, 200) || "",
          sentiment: a.sentiment,
          social_score: a.social_score,
          published_at: a.published_at,
          url: a.url,
        }));

      return {
        _type: "media_coverage",
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
        articles: topArticles,
      };
    } catch (error) {
      logger.error("[AI Tool] get_media_coverage error", { error });
      return {
        _type: "media_coverage",
        found: false,
        topic,
        period,
        total_articles: 0,
        sentiment: { average: 0, positive_percent: 0, negative_percent: 0, neutral_percent: 0 },
        top_sources: [],
        articles: [],
        message: "Failed to retrieve media coverage data",
      };
    }
  },
};
