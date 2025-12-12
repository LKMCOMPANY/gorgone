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
type Output = Record<string, unknown>;

export const getTopContentTool: Tool<Parameters, Output> = {
  description:
    "Return top content ranked by engagement (tweets/videos) for a given time window and platform.",

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

      const results: {
        platform: string;
        period: string;
        content: Array<Record<string, unknown>>;
      } = {
        platform,
        period,
        content: [],
      };

      if ((platform === "twitter" || platform === "all") && dataSources.twitter) {
        try {
          const supabase = createAdminClient();
          const startDate = getStartDate(period);

          // Direct query (robust): do not depend on materialized views that may not exist.
          const { data: tweets, error } = await supabase
            .from("twitter_tweets")
            .select(
              "tweet_id, text, like_count, retweet_count, reply_count, quote_count, total_engagement, twitter_created_at, twitter_url, tweet_url, author:twitter_profiles(username, name, is_verified, is_blue_verified)"
            )
            .eq("zone_id", zoneId)
            .gte("twitter_created_at", startDate.toISOString())
            .order("total_engagement", { ascending: false })
            .limit(limit);

          if (error) throw error;

          for (const row of tweets || []) {
            const t = row as unknown as {
              tweet_id: string;
              text: string;
              like_count: number;
              retweet_count: number;
              reply_count: number;
              quote_count: number;
              total_engagement: number;
              twitter_created_at: string;
              twitter_url?: string | null;
              tweet_url?: string | null;
              author?: {
                username?: string | null;
                name?: string | null;
                is_verified?: boolean | null;
                is_blue_verified?: boolean | null;
              } | null;
            };

            results.content.push({
              platform: "twitter",
              type: "tweet",
              id: t.tweet_id,
              author: {
                username: t.author?.username ?? undefined,
                name: t.author?.name ?? undefined,
                verified: Boolean(t.author?.is_verified || t.author?.is_blue_verified),
              },
              text: t.text,
              engagement: {
                likes: t.like_count,
                retweets: t.retweet_count,
                replies: t.reply_count,
                quotes: t.quote_count,
                total: t.total_engagement,
              },
              created_at: t.twitter_created_at,
              url: (t.twitter_url || t.tweet_url) ?? undefined,
            });
          }
        } catch (error) {
          logger.error("[AI Tool] Twitter top content failed", { error });
        }
      }

      if ((platform === "tiktok" || platform === "all") && dataSources.tiktok) {
        try {
          const startDate = getStartDate(period);
          const videos = await getVideosByZone(zoneId, {
            limit: limit * 2,
            orderBy: "engagement",
          });

          const filtered = videos.filter((v) => {
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
            results.content.push({
              platform: "tiktok",
              type: "video",
              id: video.video_id,
              author: {
                username: video.author?.username,
                nickname: video.author?.nickname,
                verified: video.author?.is_verified,
              },
              description: video.description || undefined,
              engagement: {
                views: video.play_count,
                likes: video.digg_count,
                comments: video.comment_count,
                shares: video.share_count,
                total: Number(video.total_engagement),
              },
              created_at: video.tiktok_created_at,
              url: video.share_url || undefined,
            });
          }
        } catch (error) {
          logger.error("[AI Tool] TikTok top content failed", { error });
        }
      }

      results.content.sort(
        (a, b) =>
          ((b.engagement as { total?: number })?.total || 0) -
          ((a.engagement as { total?: number })?.total || 0)
      );

      results.content = results.content.slice(0, limit);

      return results;
    } catch (error) {
      logger.error("[AI Tool] get_top_content error", { error });
      throw new Error("Failed to get top content");
    }
  },
};

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
