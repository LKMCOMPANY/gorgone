/**
 * AI Tool: Get Zone Overview
 * Provides comprehensive zone intelligence with content, narratives, and analytics
 * 
 * This is the PRIMARY tool for understanding "what's happening" in a zone.
 * It aggregates data from all sources and includes actual content for analysis.
 */

import { type Tool, type ToolCallOptions, zodSchema } from "ai";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getToolContext } from "@/lib/ai/types";
import { getStartDate, buildResultMetadata } from "@/lib/ai/utils";

// Data layers
import { getTopTweets, countTweets } from "@/lib/data/twitter/tweets";
import { getTrendingHashtags as getTwitterHashtags } from "@/lib/data/twitter/entities";
import { getZoneEngagementStats } from "@/lib/data/twitter/zone-stats";
import { getLatestCompletedSession } from "@/lib/data/twitter/opinion-map/sessions";
import { getClusters } from "@/lib/data/twitter/opinion-map/clusters";
import { getTrendingHashtags as getTikTokHashtags } from "@/lib/data/tiktok/entities";
import { getVideosByZone } from "@/lib/data/tiktok/videos";
import { getArticlesByZone } from "@/lib/data/media/articles";

// =============================================================================
// TYPES
// =============================================================================

/** Tweet formatted for AI analysis */
interface TweetForAnalysis {
  text: string;
  author: string;
  author_name: string;
  is_verified: boolean;
  engagement: number;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  created_at: string;
}

/** TikTok video formatted for AI analysis */
interface VideoForAnalysis {
  description: string;
  author: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  created_at: string;
}

/** Article formatted for AI analysis */
interface ArticleForAnalysis {
  title: string;
  summary: string | null;
  source: string;
  sentiment: number | null;
  published_at: string | null;
  url: string;
}

/** Opinion cluster summary */
interface ClusterSummary {
  label: string;
  keywords: string[];
  tweet_count: number;
  avg_sentiment: number | null;
  reasoning: string | null;
}

/** Twitter overview data */
interface TwitterOverview {
  total_tweets: number;
  stats: {
    avg_engagement: number;
    median_engagement: number;
    max_engagement: number;
  };
  top_tweets: TweetForAnalysis[];
  trending_hashtags: Array<{ hashtag: string; count: number }>;
  opinion_clusters?: ClusterSummary[];
  clusters_generated_at?: string;
}

/** TikTok overview data */
interface TikTokOverview {
  total_videos: number;
  top_videos: VideoForAnalysis[];
  trending_hashtags: Array<{ hashtag: string; count: number }>;
}

/** Media overview data */
interface MediaOverview {
  total_articles: number;
  avg_sentiment: number;
  top_sources: Array<{ source: string; count: number }>;
  recent_articles: ArticleForAnalysis[];
}

/** Full overview output */
interface ZoneOverviewOutput {
  _type: "zone_overview";
  period: string;
  generated_at: string;
  twitter?: TwitterOverview | { error: string };
  tiktok?: TikTokOverview | { error: string };
  media?: MediaOverview | { error: string };
  _meta: {
    zone_id?: string;
    period: string;
    sources_queried: string[];
    limitations?: string[];
    generated_at: string;
    data_freshness: string;
  };
}

// =============================================================================
// PARAMETERS
// =============================================================================

const parametersSchema = z.object({
  period: z
    .enum(["3h", "6h", "12h", "24h", "7d", "30d"])
    .default("24h")
    .describe("Time period to analyze"),
});

type Parameters = z.infer<typeof parametersSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Fetch Twitter data for the overview
 */
async function fetchTwitterData(
  zoneId: string,
  startDate: Date
): Promise<TwitterOverview | { error: string }> {
  try {
    // Parallel fetch for performance
    const [
      topTweetsResult,
      totalCount,
      engagementStats,
      trendingHashtags,
      latestSession,
    ] = await Promise.all([
      getTopTweets(zoneId, { limit: 15, startDate }),
      countTweets(zoneId, { startDate }),
      getZoneEngagementStats(zoneId),
      getTwitterHashtags(zoneId, { startDate, endDate: new Date(), limit: 10 }),
      getLatestCompletedSession(zoneId),
    ]);

    // Format tweets for AI analysis
    const topTweets: TweetForAnalysis[] = topTweetsResult.map((t) => ({
      text: t.text,
      author: t.author?.username || "unknown",
      author_name: t.author?.name || "Unknown",
      is_verified: Boolean(t.author?.is_verified || t.author?.is_blue_verified),
      engagement: t.total_engagement || 0,
      likes: t.like_count || 0,
      retweets: t.retweet_count || 0,
      replies: t.reply_count || 0,
      views: t.view_count || 0,
      created_at: t.twitter_created_at,
    }));

    // Get opinion clusters if a session exists
    let opinionClusters: ClusterSummary[] | undefined;
    let clustersGeneratedAt: string | undefined;

    if (latestSession?.session_id) {
      const clusters = await getClusters(zoneId, latestSession.session_id);
      if (clusters.length > 0) {
        opinionClusters = clusters.slice(0, 8).map((c) => ({
          label: c.label,
          keywords: c.keywords || [],
          tweet_count: c.tweet_count || 0,
          avg_sentiment: c.avg_sentiment ?? null,
          reasoning: c.reasoning ?? null,
        }));
        clustersGeneratedAt = latestSession.completed_at || latestSession.created_at;
      }
    }

    const result: TwitterOverview = {
      total_tweets: totalCount,
      stats: {
        avg_engagement: engagementStats.avg_engagement,
        median_engagement: engagementStats.median_engagement,
        max_engagement: engagementStats.max_engagement,
      },
      top_tweets: topTweets,
      trending_hashtags: trendingHashtags.map((h) => ({
        hashtag: h.hashtag,
        count: h.count,
      })),
    };

    if (opinionClusters && opinionClusters.length > 0) {
      result.opinion_clusters = opinionClusters;
      result.clusters_generated_at = clustersGeneratedAt;
    }

    return result;
  } catch (error) {
    logger.error("[AI Tool] Twitter overview failed", { error, zoneId });
    return { error: "Failed to fetch Twitter data" };
  }
}

/**
 * Fetch TikTok data for the overview
 */
async function fetchTikTokData(
  zoneId: string,
  startDate: Date
): Promise<TikTokOverview | { error: string }> {
  try {
    const [videos, trendingHashtags] = await Promise.all([
      getVideosByZone(zoneId, { limit: 30, orderBy: "engagement" }),
      getTikTokHashtags(zoneId, 10),
    ]);

    // Filter by date and sort
    const filteredVideos = videos
      .filter((v) => new Date(v.tiktok_created_at) >= startDate)
      .sort((a, b) => Number(b.total_engagement || 0) - Number(a.total_engagement || 0))
      .slice(0, 10);

    const topVideos: VideoForAnalysis[] = filteredVideos.map((v) => ({
      description: v.description || "",
      author: (v as any).author?.username || "unknown",
      views: v.play_count || 0,
      likes: v.digg_count || 0,
      comments: v.comment_count || 0,
      shares: v.share_count || 0,
      created_at: v.tiktok_created_at,
    }));

    return {
      total_videos: filteredVideos.length,
      top_videos: topVideos,
      trending_hashtags: trendingHashtags.map((h) => ({
        hashtag: h.hashtag,
        count: h.count,
      })),
    };
  } catch (error) {
    logger.error("[AI Tool] TikTok overview failed", { error, zoneId });
    return { error: "Failed to fetch TikTok data" };
  }
}

/**
 * Fetch Media data for the overview
 */
async function fetchMediaData(
  zoneId: string,
  startDate: Date
): Promise<MediaOverview | { error: string }> {
  try {
    const articles = await getArticlesByZone(zoneId, {
      startDate,
      endDate: new Date(),
      limit: 100,
    });

    // Calculate average sentiment
    const sentiments = articles
      .filter((a) => a.sentiment !== null)
      .map((a) => a.sentiment!);
    const avgSentiment =
      sentiments.length > 0
        ? sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
        : 0;

    // Aggregate sources
    const sourceCounts = new Map<string, number>();
    articles.forEach((a) => {
      const source = a.source_title || "Unknown";
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    });
    const topSources = Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent articles with content
    const recentArticles: ArticleForAnalysis[] = articles
      .sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime())
      .slice(0, 8)
      .map((a) => ({
        title: a.title,
        summary: a.body?.slice(0, 300) || null,
        source: a.source_title || "Unknown",
        sentiment: a.sentiment ?? null,
        published_at: a.published_at,
        url: a.url,
      }));

    return {
      total_articles: articles.length,
      avg_sentiment: Number(avgSentiment.toFixed(2)),
      top_sources: topSources,
      recent_articles: recentArticles,
    };
  } catch (error) {
    logger.error("[AI Tool] Media overview failed", { error, zoneId });
    return { error: "Failed to fetch Media data" };
  }
}

// =============================================================================
// TOOL DEFINITION
// =============================================================================

export const getZoneOverviewTool: Tool<Parameters, ZoneOverviewOutput> = {
  description: `Get a comprehensive zone overview with ACTUAL CONTENT from tweets, videos, and articles.

USE THIS TOOL when users ask:
- "What's happening?" / "Ça parle de quoi?"
- "Give me an overview" / "Résumé de l'activité"
- "What are people talking about?"
- "What are the main topics/narratives?"

This tool returns:
- TOP TWEETS with full text content (for analyzing WHAT is being discussed)
- OPINION CLUSTERS with AI-generated labels (main narrative themes)
- TikTok videos with descriptions
- Media articles with titles and summaries
- Engagement statistics and trends

IMPORTANT: Analyze the actual content (tweet text, article titles) to explain the main topics and narratives. Don't just list hashtags - explain WHAT is being discussed and WHY it matters.`,

  inputSchema: zodSchema(parametersSchema),

  execute: async (
    { period },
    options: ToolCallOptions
  ): Promise<ZoneOverviewOutput> => {
    const { zoneId, dataSources } = getToolContext(options);
    const startDate = getStartDate(period);
    const sourcesQueried: string[] = [];
    const limitations: string[] = [];

    logger.info("[AI Tool] get_zone_overview called", {
      zone_id: zoneId,
      period,
      sources: dataSources,
    });

    const output: ZoneOverviewOutput = {
      _type: "zone_overview",
      period,
      generated_at: new Date().toISOString(),
      _meta: {
        zone_id: zoneId,
        period,
        sources_queried: [],
        generated_at: new Date().toISOString(),
        data_freshness: "real-time",
      },
    };

    // Parallel fetch all enabled sources
    const fetchPromises: Promise<void>[] = [];

    if (dataSources.twitter) {
      sourcesQueried.push("twitter");
      fetchPromises.push(
        fetchTwitterData(zoneId, startDate).then((data) => {
          output.twitter = data;
          if ("error" in data) limitations.push("Twitter data partial");
        })
      );
    }

    if (dataSources.tiktok) {
      sourcesQueried.push("tiktok");
      fetchPromises.push(
        fetchTikTokData(zoneId, startDate).then((data) => {
          output.tiktok = data;
          if ("error" in data) limitations.push("TikTok data partial");
        })
      );
    }

    if (dataSources.media) {
      sourcesQueried.push("media");
      fetchPromises.push(
        fetchMediaData(zoneId, startDate).then((data) => {
          output.media = data;
          if ("error" in data) limitations.push("Media data partial");
        })
      );
    }

    // Wait for all fetches
    await Promise.all(fetchPromises);

    // Build metadata
    output._meta = buildResultMetadata({
      period,
      zoneId,
      sources: sourcesQueried,
      limitations: limitations.length > 0 ? limitations : undefined,
    });

    logger.info("[AI Tool] get_zone_overview completed", {
      zone_id: zoneId,
      sources: sourcesQueried,
      twitter_tweets: !("error" in (output.twitter || {})) ? (output.twitter as TwitterOverview)?.total_tweets : 0,
      has_clusters: !("error" in (output.twitter || {})) && Boolean((output.twitter as TwitterOverview)?.opinion_clusters),
    });

    return output;
  },
};
