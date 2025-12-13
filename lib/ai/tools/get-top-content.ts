/**
 * AI Tool: Get Top Content
 * Returns most engaging tweets/videos by platform
 */

import { type Tool, type ToolCallOptions, zodSchema } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVideosByZone } from "@/lib/data/tiktok/videos";
import { logger } from "@/lib/logger";
import { getToolContext } from "@/lib/ai/types";
import { getStartDate } from "@/lib/ai/utils";

const parametersSchema = z.object({
  platform: z
    .enum(["twitter", "tiktok", "all"])
    .default("all")
    .describe("Which platform to analyze"),
  period: z
    .enum(["3h", "6h", "12h", "24h", "7d", "30d"])
    .default("24h")
    .describe("Time period"),
  limit: z.number().min(1).max(20).default(10).describe("Number of results"),
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

/** Structured TikTok video for UI */
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

type Output = {
  _type: "top_content";
  platform: string;
  period: string;
  tweets: TweetResult[];
  videos: VideoResult[];
  total_results: number;
};

export const getTopContentTool: Tool<Parameters, Output> = {
  description:
    "Retrieve the most engaging posts (tweets, TikTok videos) ranked by total engagement. Use when users ask 'what are the top posts?', 'most viral content', or 'best performing tweets'. Returns content with full engagement breakdown (likes, retweets, views, etc.).",

  inputSchema: zodSchema(parametersSchema),

  execute: async (
    { platform, period, limit },
    options: ToolCallOptions
  ): Promise<Output> => {
    const { zoneId, dataSources } = getToolContext(options);
    try {
      logger.info(`[AI Tool] get_top_content called`, {
        zone_id: zoneId,
        platform,
        period,
        limit,
      });

      const tweets: TweetResult[] = [];
      const videos: VideoResult[] = [];

      if ((platform === "twitter" || platform === "all") && dataSources.twitter) {
        try {
          const supabase = createAdminClient();
          const startDate = getStartDate(period);

          // Direct query with profile picture for TweetCard rendering
          const { data: tweetRows, error } = await supabase
            .from("twitter_tweets")
            .select(
              "tweet_id, text, like_count, retweet_count, reply_count, quote_count, view_count, total_engagement, twitter_created_at, twitter_url, tweet_url, author:twitter_profiles(username, name, is_verified, is_blue_verified, profile_picture_url)"
            )
            .eq("zone_id", zoneId)
            .gte("twitter_created_at", startDate.toISOString())
            .order("total_engagement", { ascending: false })
            .limit(limit);

          if (error) throw error;

          for (const row of tweetRows || []) {
            const t = row as unknown as {
              tweet_id: string;
              text: string;
              like_count: number;
              retweet_count: number;
              reply_count: number;
              quote_count: number;
              view_count: number | null;
              total_engagement: number;
              twitter_created_at: string;
              twitter_url?: string | null;
              tweet_url?: string | null;
              author?: {
                username?: string | null;
                name?: string | null;
                is_verified?: boolean | null;
                is_blue_verified?: boolean | null;
                profile_picture_url?: string | null;
              } | null;
            };

            const username = t.author?.username || "unknown";
            tweets.push({
              tweet_id: t.tweet_id,
              text: t.text,
              author_username: username,
              author_name: t.author?.name || username,
              author_verified: Boolean(t.author?.is_verified || t.author?.is_blue_verified),
              author_profile_picture_url: t.author?.profile_picture_url || null,
              engagement: {
                likes: t.like_count,
                retweets: t.retweet_count,
                replies: t.reply_count,
                views: t.view_count || 0,
              },
              tweet_url: t.twitter_url || t.tweet_url || `https://x.com/${username}/status/${t.tweet_id}`,
              created_at: t.twitter_created_at,
            });
          }
        } catch (error) {
          logger.error("[AI Tool] Twitter top content failed", { error });
        }
      }

      if ((platform === "tiktok" || platform === "all") && dataSources.tiktok) {
        try {
          const startDate = getStartDate(period);
          const videoRows = await getVideosByZone(zoneId, {
            limit: limit * 2,
            orderBy: "engagement",
          });

          const filtered = videoRows.filter((v) => {
            const createdAt = new Date(v.tiktok_created_at);
            return createdAt >= startDate;
          });

          const sortedVideos = filtered
            .sort((a, b) => Number(b.total_engagement || 0) - Number(a.total_engagement || 0))
            .slice(0, limit);

          for (const v of sortedVideos) {
            const video = v as typeof v & {
              author?: {
                username?: string;
                nickname?: string;
                is_verified?: boolean;
              };
            };
            videos.push({
              video_id: video.video_id,
              description: video.description || "",
              author_username: video.author?.username || "unknown",
              author_nickname: video.author?.nickname || video.author?.username || "Unknown",
              author_verified: Boolean(video.author?.is_verified),
              engagement: {
                views: video.play_count || 0,
                likes: video.digg_count || 0,
                comments: video.comment_count || 0,
                shares: video.share_count || 0,
              },
              video_url: video.share_url || "",
              created_at: video.tiktok_created_at,
            });
          }
        } catch (error) {
          logger.error("[AI Tool] TikTok top content failed", { error });
        }
      }

      return {
        _type: "top_content",
        platform,
        period,
        tweets,
        videos,
        total_results: tweets.length + videos.length,
      };
    } catch (error) {
      logger.error("[AI Tool] get_top_content error", { error });
      return {
        _type: "top_content",
        platform,
        period,
        tweets: [],
        videos: [],
        total_results: 0,
      };
    }
  },
};
