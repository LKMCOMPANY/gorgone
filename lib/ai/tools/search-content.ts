/**
 * AI Tool: Search Content
 * Cross-platform content search (Twitter, TikTok, Media)
 */

import { type Tool, type ToolCallOptions, zodSchema } from "ai";
import { z } from "zod";
import { searchTweets } from "@/lib/data/twitter/tweets";
import { getVideosByZone } from "@/lib/data/tiktok/videos";
import { getArticlesByZone } from "@/lib/data/media/articles";
import { logger } from "@/lib/logger";
import { getToolContext } from "@/lib/ai/types";

const parametersSchema = z.object({
  query: z.string().min(1).describe("Search query (keywords or phrase)"),
  platforms: z
    .array(z.enum(["twitter", "tiktok", "media"]))
    .default(["twitter", "tiktok", "media"])
    .describe("Platforms to search"),
  start_date: z.string().optional().describe("Start date (ISO 8601)"),
  end_date: z.string().optional().describe("End date (ISO 8601)"),
  limit: z.number().min(1).max(50).default(20).describe("Max results per platform"),
});

type Parameters = z.infer<typeof parametersSchema>;

/** Structured tweet for UI rendering */
type TweetResult = {
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
  tweet_url: string;
  created_at: string;
};

/** Structured video for UI */
type VideoResult = {
  video_id: string;
  description: string;
  author_username: string;
  author_nickname: string;
  author_verified: boolean;
  engagement: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  video_url: string;
  created_at: string;
};

/** Structured article for UI */
type ArticleResult = {
  article_id: string;
  title: string;
  source: string;
  content: string;
  sentiment: number | null;
  social_score: number | null;
  published_at: string;
  url: string;
};

type Output = {
  _type: "search_results";
  query: string;
  platforms: string[];
  tweets: TweetResult[];
  videos: VideoResult[];
  articles: ArticleResult[];
  total_results: number;
};

export const searchContentTool: Tool<Parameters, Output> = {
  description:
    "Search for specific keywords, hashtags, or phrases across all platforms (Twitter, TikTok, Media). Use when users want to find content about a specific topic, person, or event. Supports date filtering and returns mixed results sorted by relevance.",

  inputSchema: zodSchema(parametersSchema),

  execute: async (
    { query, platforms, start_date, end_date, limit },
    options: ToolCallOptions
  ): Promise<Output> => {
    const { zoneId, dataSources } = getToolContext(options);
    try {
      logger.info(`[AI Tool] search_content called`, {
        zone_id: zoneId,
        query,
        platforms,
      });

      const tweets: TweetResult[] = [];
      const videos: VideoResult[] = [];
      const articles: ArticleResult[] = [];

      const startDate = start_date ? new Date(start_date) : undefined;
      const endDate = end_date ? new Date(end_date) : undefined;

      if (platforms.includes("twitter") && dataSources.twitter) {
        try {
          const tweetRows = await searchTweets(zoneId, query, {
            limit: limit * 2,
          });

          const filtered =
            startDate || endDate
              ? tweetRows
                  .filter((t: { twitter_created_at: string }) => {
                    const createdAt = new Date(t.twitter_created_at);
                    if (startDate && createdAt < startDate) return false;
                    if (endDate && createdAt > endDate) return false;
                    return true;
                  })
                  .slice(0, limit)
              : tweetRows;

          for (const tweet of filtered as Array<{
            tweet_id: string;
            author?: {
              username?: string;
              name?: string;
              is_verified?: boolean;
              is_blue_verified?: boolean;
              profile_picture_url?: string;
            };
            text: string;
            like_count: number;
            retweet_count: number;
            reply_count: number;
            view_count?: number;
            total_engagement: number;
            twitter_created_at: string;
            twitter_url?: string;
            tweet_url?: string;
          }>) {
            const username = tweet.author?.username || "unknown";
            tweets.push({
              tweet_id: tweet.tweet_id,
              text: tweet.text,
              author_username: username,
              author_name: tweet.author?.name || username,
              author_verified: Boolean(tweet.author?.is_verified || tweet.author?.is_blue_verified),
              author_profile_picture_url: tweet.author?.profile_picture_url || null,
              engagement: {
                likes: tweet.like_count,
                retweets: tweet.retweet_count,
                replies: tweet.reply_count,
                views: tweet.view_count || 0,
              },
              tweet_url: tweet.twitter_url || tweet.tweet_url || `https://x.com/${username}/status/${tweet.tweet_id}`,
              created_at: tweet.twitter_created_at,
            });
          }
        } catch (error) {
          logger.error("[AI Tool] Twitter search failed", { error });
        }
      }

      if (platforms.includes("tiktok") && dataSources.tiktok) {
        try {
          const videoRows = await getVideosByZone(zoneId, {
            limit: limit * 2,
          });

          let filtered = videoRows.filter((v) =>
            v.description?.toLowerCase().includes(query.toLowerCase())
          );

          if (startDate || endDate) {
            filtered = filtered.filter((v) => {
              const createdAt = new Date(v.tiktok_created_at);
              if (startDate && createdAt < startDate) return false;
              if (endDate && createdAt > endDate) return false;
              return true;
            });
          }

          for (const video of filtered.slice(0, limit)) {
            const v = video as typeof video & {
              author?: {
                username?: string;
                nickname?: string;
                is_verified?: boolean;
              };
            };
            videos.push({
              video_id: v.video_id,
              description: v.description || "",
              author_username: v.author?.username || "unknown",
              author_nickname: v.author?.nickname || v.author?.username || "Unknown",
              author_verified: Boolean(v.author?.is_verified),
              engagement: {
                views: v.play_count || 0,
                likes: v.digg_count || 0,
                comments: v.comment_count || 0,
                shares: v.share_count || 0,
              },
              video_url: v.share_url || "",
              created_at: v.tiktok_created_at,
            });
          }
        } catch (error) {
          logger.error("[AI Tool] TikTok search failed", { error });
        }
      }

      if (platforms.includes("media") && dataSources.media) {
        try {
          const articleRows = await getArticlesByZone(zoneId, {
            searchText: query,
            startDate,
            endDate,
            limit,
          });

          for (const article of articleRows) {
            articles.push({
              article_id: article.article_uri,
              title: article.title,
              source: article.source_title || "Unknown Source",
              content: article.body?.substring(0, 200) + "..." || "",
              sentiment: article.sentiment,
              social_score: article.social_score,
              published_at: article.published_at,
              url: article.url,
            });
          }
        } catch (error) {
          logger.error("[AI Tool] Media search failed", { error });
        }
      }

      return {
        _type: "search_results",
        query,
        platforms,
        tweets,
        videos,
        articles,
        total_results: tweets.length + videos.length + articles.length,
      };
    } catch (error) {
      logger.error("[AI Tool] search_content error", { error });
      return {
        _type: "search_results",
        query,
        platforms,
        tweets: [],
        videos: [],
        articles: [],
        total_results: 0,
      };
    }
  },
};
