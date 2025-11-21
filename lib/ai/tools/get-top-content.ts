/**
 * AI Tool: Get Top Content
 * Returns most engaging tweets/videos by platform
 */

import { tool } from "ai";
import { z } from "zod";
import { getTopTweetsByPeriod } from "@/lib/data/twitter/analytics";
import { getTweetsByZone } from "@/lib/data/twitter/tweets";
import { getVideosByZone } from "@/lib/data/tiktok/videos";
import { logger } from "@/lib/logger";
import type { ToolContext } from "@/lib/ai/types";

export const getTopContentTool = tool({
  description: `Get the most engaging content (tweets or videos) ranked by interactions.

Use this tool when the user asks for:
- "Top posts with most interactions"
- "Most viral content"
- "Best performing tweets"
- "Videos with most engagement"
- "What got the most attention?"

Returns top content sorted by total engagement (likes + retweets + comments + shares).`,

  parameters: z.object({
    platform: z
      .enum(["twitter", "tiktok", "all"])
      .default("all")
      .describe("Which platform to analyze"),
    period: z
      .enum(["3h", "6h", "12h", "24h", "7d", "30d"])
      .default("24h")
      .describe("Time period"),
    limit: z.number().min(1).max(20).default(10).describe("Number of results"),
  }),

  execute: async ({ platform, period, limit }, context: any) => {
    const { zoneId, dataSources } = context;
    try {
      logger.info(`[AI Tool] get_top_content called`, {
        zone_id: zoneId,
        platform,
        period,
        limit,
      });

      const results: any = {
        platform,
        period,
        content: [],
      };

      // Twitter content
      if ((platform === "twitter" || platform === "all") && dataSources.twitter) {
        try {
          const topTweets = await getTopTweetsByPeriod(zoneId, period, limit);

          for (const tweet of topTweets) {
            // Get full tweet details
            const tweetDetails = await getTweetsByZone(zoneId, {
              limit: 1,
              offset: 0,
              includeProfile: true,
            });

            if (tweetDetails.length > 0) {
              const t = tweetDetails[0] as any;
              results.content.push({
                platform: "twitter",
                type: "tweet",
                id: t.tweet_id,
                author: {
                  username: t.author?.username,
                  name: t.author?.name,
                  verified: t.author?.is_verified || t.author?.is_blue_verified,
                },
                text: t.text,
                engagement: {
                  likes: t.like_count,
                  retweets: t.retweet_count,
                  replies: t.reply_count,
                  total: t.total_engagement,
                },
                created_at: t.twitter_created_at,
                url: t.twitter_url || t.tweet_url,
              });
            }
          }
        } catch (error) {
          logger.error("[AI Tool] Twitter top content failed", { error });
        }
      }

      // TikTok content
      if ((platform === "tiktok" || platform === "all") && dataSources.tiktok) {
        try {
          const startDate = getStartDate(period);
          const videos = await getVideosByZone(zoneId, {
            limit: limit * 2, // Get more to filter by date
            orderBy: "engagement",
          });
          
          // Filter by date manually
          const filtered = videos.filter((v) => {
            const createdAt = new Date(v.tiktok_created_at);
            return createdAt >= startDate;
          });

          // Sort by engagement
          const sortedVideos = filtered
            .sort((a, b) => Number(b.total_engagement || 0) - Number(a.total_engagement || 0))
            .slice(0, limit);

          for (const v of sortedVideos) {
            results.content.push({
              platform: "tiktok",
              type: "video",
              id: v.video_id,
              author: {
                username: (v as any).author?.username,
                nickname: (v as any).author?.nickname,
                verified: (v as any).author?.is_verified,
              },
              description: v.description,
              engagement: {
                views: v.play_count,
                likes: v.digg_count,
                comments: v.comment_count,
                shares: v.share_count,
                total: v.total_engagement,
              },
              created_at: v.tiktok_created_at,
              url: v.share_url,
            });
          }
        } catch (error) {
          logger.error("[AI Tool] TikTok top content failed", { error });
        }
      }

      // Sort all content by engagement
      results.content.sort((a: any, b: any) => 
        b.engagement.total - a.engagement.total
      );

      // Limit final results
      results.content = results.content.slice(0, limit);

      return results;
    } catch (error) {
      logger.error("[AI Tool] get_top_content error", { error });
      throw new Error("Failed to get top content");
    }
  },
});

// Helper
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

