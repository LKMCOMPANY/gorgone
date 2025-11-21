/**
 * AI Tool: Search Content
 * Cross-platform content search (Twitter, TikTok, Media)
 */

import { tool } from "ai";
import { z } from "zod";
import { searchTweets } from "@/lib/data/twitter/tweets";
import { getVideosByZone } from "@/lib/data/tiktok/videos";
import { getArticlesByZone } from "@/lib/data/media/articles";
import { logger } from "@/lib/logger";
import type { ToolContext } from "@/lib/ai/types";

export const searchContentTool = tool({
  description: `Search for content across all platforms using text search.

Use this tool when the user asks for:
- "Find tweets about AI"
- "Search for videos mentioning climate"
- "Show me articles about elections"
- "Content containing [keyword]"
- "Posts about [topic]"

Searches in tweet text, video descriptions, and article titles/bodies.`,

  parameters: z.object({
    query: z.string().min(1).describe("Search query (keywords or phrase)"),
    platforms: z
      .array(z.enum(["twitter", "tiktok", "media"]))
      .default(["twitter", "tiktok", "media"])
      .describe("Platforms to search"),
    start_date: z.string().optional().describe("Start date (ISO 8601)"),
    end_date: z.string().optional().describe("End date (ISO 8601)"),
    limit: z.number().min(1).max(50).default(20).describe("Max results per platform"),
  }),

  execute: async (
    { query, platforms, start_date, end_date, limit },
    context: any
  ) => {
    const { zoneId, dataSources } = context;
    try {
      logger.info(`[AI Tool] search_content called`, {
        zone_id: zoneId,
        query,
        platforms,
      });

      const results: any = {
        query,
        platforms,
        results: [],
      };

      const startDate = start_date ? new Date(start_date) : undefined;
      const endDate = end_date ? new Date(end_date) : undefined;

      // Search Twitter  
      if (platforms.includes("twitter") && dataSources.twitter) {
        try {
          const tweets = await searchTweets(zoneId, query, {
            limit: limit * 2,
          });
          
          // Filter by date if specified
          const filtered = (startDate || endDate) 
            ? tweets.filter((t: any) => {
                const createdAt = new Date(t.twitter_created_at);
                if (startDate && createdAt < startDate) return false;
                if (endDate && createdAt > endDate) return false;
                return true;
              }).slice(0, limit)
            : tweets;

          for (const tweet of filtered as any[]) {
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

      // Search TikTok
      if (platforms.includes("tiktok") && dataSources.tiktok) {
        try {
          const videos = await getVideosByZone(zoneId, {
            limit: limit * 2,
          });

          // Filter by query and date
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
            results.results.push({
              platform: "tiktok",
              type: "video",
              id: video.video_id,
              author: {
                username: (video as any).author?.username,
                nickname: (video as any).author?.nickname,
                verified: (video as any).author?.is_verified,
              },
              content: video.description,
              engagement: {
                views: video.play_count,
                likes: video.digg_count,
                comments: video.comment_count,
                shares: video.share_count,
                total: video.total_engagement,
              },
              created_at: video.tiktok_created_at,
              url: video.share_url,
            });
          }
        } catch (error) {
          logger.error("[AI Tool] TikTok search failed", { error });
        }
      }

      // Search Media
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

      // Sort by engagement/social score
      results.results.sort((a: any, b: any) => {
        const scoreA =
          a.engagement?.total || a.social_score || 0;
        const scoreB =
          b.engagement?.total || b.social_score || 0;
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
});

