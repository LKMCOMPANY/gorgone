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
type Output = Record<string, unknown>;

export const searchContentTool: Tool<Parameters, Output> = {
  description:
    "Cross-platform keyword search (Twitter/TikTok/Media) within the zone and optional date window.",

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

      const results: {
        query: string;
        platforms: string[];
        results: Array<Record<string, unknown>>;
        total_results?: number;
      } = {
        query,
        platforms,
        results: [],
      };

      const startDate = start_date ? new Date(start_date) : undefined;
      const endDate = end_date ? new Date(end_date) : undefined;

      if (platforms.includes("twitter") && dataSources.twitter) {
        try {
          const tweets = await searchTweets(zoneId, query, {
            limit: limit * 2,
          });

          const filtered =
            startDate || endDate
              ? tweets
                  .filter((t: { twitter_created_at: string }) => {
                    const createdAt = new Date(t.twitter_created_at);
                    if (startDate && createdAt < startDate) return false;
                    if (endDate && createdAt > endDate) return false;
                    return true;
                  })
                  .slice(0, limit)
              : tweets;

          for (const tweet of filtered as Array<{
            tweet_id: string;
            author?: {
              username?: string;
              name?: string;
              is_verified?: boolean;
              is_blue_verified?: boolean;
            };
            text: string;
            like_count: number;
            retweet_count: number;
            reply_count: number;
            total_engagement: number;
            twitter_created_at: string;
            twitter_url?: string;
            tweet_url?: string;
          }>) {
            results.results.push({
              platform: "twitter",
              type: "tweet",
              id: tweet.tweet_id,
              author: {
                username: tweet.author?.username,
                name: tweet.author?.name,
                verified: tweet.author?.is_verified || tweet.author?.is_blue_verified,
              },
              content: tweet.text,
              engagement: {
                likes: tweet.like_count,
                retweets: tweet.retweet_count,
                replies: tweet.reply_count,
                total: tweet.total_engagement,
              },
              created_at: tweet.twitter_created_at,
              url: tweet.twitter_url || tweet.tweet_url,
            });
          }
        } catch (error) {
          logger.error("[AI Tool] Twitter search failed", { error });
        }
      }

      if (platforms.includes("tiktok") && dataSources.tiktok) {
        try {
          const videos = await getVideosByZone(zoneId, {
            limit: limit * 2,
          });

          let filtered = videos.filter((v) =>
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
            results.results.push({
              platform: "tiktok",
              type: "video",
              id: v.video_id,
              author: {
                username: v.author?.username,
                nickname: v.author?.nickname,
                verified: v.author?.is_verified,
              },
              content: v.description || undefined,
              engagement: {
                views: v.play_count,
                likes: v.digg_count,
                comments: v.comment_count,
                shares: v.share_count,
                total: Number(v.total_engagement),
              },
              created_at: v.tiktok_created_at,
              url: v.share_url || undefined,
            });
          }
        } catch (error) {
          logger.error("[AI Tool] TikTok search failed", { error });
        }
      }

      if (platforms.includes("media") && dataSources.media) {
        try {
          const articles = await getArticlesByZone(zoneId, {
            searchText: query,
            startDate,
            endDate,
            limit,
          });

          for (const article of articles) {
            results.results.push({
              platform: "media",
              type: "article",
              id: article.article_uri,
              source: article.source_title,
              title: article.title,
              content: article.body?.substring(0, 200) + "...",
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

      results.results.sort((a, b) => {
        const scoreA =
          (a.engagement as { total?: number })?.total || (a.social_score as number) || 0;
        const scoreB =
          (b.engagement as { total?: number })?.total || (b.social_score as number) || 0;
        return scoreB - scoreA;
      });

      return {
        ...results,
        total_results: results.results.length,
      };
    } catch (error) {
      logger.error("[AI Tool] search_content error", { error });
      throw new Error("Failed to search content");
    }
  },
};
