/**
 * AI Tool: Get Trending Topics
 * Returns trending hashtags and topics across platforms
 */

import { type Tool, type ToolCallOptions, zodSchema } from "ai";
import { z } from "zod";
import { getTrendingHashtags as getTwitterHashtags } from "@/lib/data/twitter/entities";
import { getTrendingHashtags as getTikTokHashtags } from "@/lib/data/tiktok/entities";
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
    .describe("Time period to analyze"),
  limit: z.number().min(1).max(50).default(10).describe("Number of hashtags to return"),
});

type Parameters = z.infer<typeof parametersSchema>;
type Output = Record<string, unknown>;

export const getTrendingTopicsTool: Tool<Parameters, Output> = {
  description:
    "Return trending hashtags/topics in the zone for a given time window (counts + basic trend metadata).",

  inputSchema: zodSchema(parametersSchema),

  execute: async (
    { platform, period, limit },
    options: ToolCallOptions
  ): Promise<Output> => {
    const { zoneId, dataSources } = getToolContext(options);
    try {
      logger.info(`[AI Tool] get_trending_topics called`, {
        zone_id: zoneId,
        platform,
        period,
        limit,
      });

      const periodHours = getPeriodHours(period);
      const topics: Array<{
        platform: string;
        hashtag: string;
        count: number;
        unique_users?: number;
      }> = [];

      if ((platform === "twitter" || platform === "all") && dataSources.twitter) {
        try {
          const startDate = new Date(Date.now() - periodHours * 60 * 60 * 1000);
          const twitterHashtags = await getTwitterHashtags(zoneId, {
            startDate,
            endDate: new Date(),
            limit,
          });

          for (const hashtag of twitterHashtags) {
            topics.push({
              platform: "twitter",
              hashtag: hashtag.hashtag,
              count: hashtag.count,
              unique_users: 0,
            });
          }
        } catch (error) {
          logger.error("[AI Tool] Twitter hashtags failed", { error });
        }
      }

      if ((platform === "tiktok" || platform === "all") && dataSources.tiktok) {
        try {
          const tiktokHashtags = await getTikTokHashtags(zoneId, limit);

          for (const hashtag of tiktokHashtags) {
            topics.push({
              platform: "tiktok",
              hashtag: hashtag.hashtag,
              count: hashtag.count,
            });
          }
        } catch (error) {
          logger.error("[AI Tool] TikTok hashtags failed", { error });
        }
      }

      const merged = mergeDuplicateHashtags(topics);

      merged.sort((a, b) => b.total_count - a.total_count);

      return {
        platform,
        period,
        total_unique_hashtags: merged.length,
        trending_topics: merged.slice(0, limit),
      };
    } catch (error) {
      logger.error("[AI Tool] get_trending_topics error", { error });
      throw new Error("Failed to get trending topics");
    }
  },
};

function getPeriodHours(period: string): number {
  const map: Record<string, number> = {
    "3h": 3,
    "6h": 6,
    "12h": 12,
    "24h": 24,
    "7d": 168,
    "30d": 720,
  };
  return map[period] || 24;
}

interface TopicInput {
  platform: string;
  hashtag: string;
  count: number;
  unique_users?: number;
}

interface MergedTopic {
  hashtag: string;
  platforms: string[];
  counts: Record<string, number>;
  total_count: number;
  unique_users: number;
}

function mergeDuplicateHashtags(topics: TopicInput[]): MergedTopic[] {
  const hashtagMap = new Map<string, MergedTopic>();

  for (const topic of topics) {
    const key = topic.hashtag.toLowerCase();

    if (hashtagMap.has(key)) {
      const existing = hashtagMap.get(key)!;
      existing.platforms.push(topic.platform);
      existing.counts[topic.platform] = topic.count;
      existing.total_count += topic.count;
      if (topic.unique_users) {
        existing.unique_users = (existing.unique_users || 0) + topic.unique_users;
      }
    } else {
      hashtagMap.set(key, {
        hashtag: topic.hashtag,
        platforms: [topic.platform],
        counts: {
          [topic.platform]: topic.count,
        },
        total_count: topic.count,
        unique_users: topic.unique_users || 0,
      });
    }
  }

  return Array.from(hashtagMap.values());
}
