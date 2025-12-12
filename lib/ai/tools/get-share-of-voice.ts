/**
 * AI Tool: Get Share of Voice
 * Analyzes content distribution by profile tags (Attila, Ally, Adversary, etc.)
 */

import { type Tool, type ToolCallOptions, zodSchema } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
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
});

type Parameters = z.infer<typeof parametersSchema>;
type Output = Record<string, unknown>;

export const getShareOfVoiceTool: Tool<Parameters, Output> = {
  description:
    "Compute share-of-voice distribution by profile tags (volume + engagement) over a time window.",

  inputSchema: zodSchema(parametersSchema),

  execute: async (
    { platform, period },
    options: ToolCallOptions
  ): Promise<Output> => {
    const { zoneId, dataSources } = getToolContext(options);
    try {
      logger.info(`[AI Tool] get_share_of_voice called`, { platform, period });

      const startDate = getStartDate(period);
      const supabase = createAdminClient();

      const shareOfVoice: Array<{
        platform: string;
        tag_type: string;
        volume: number;
        engagement: number;
      }> = [];
      let totalVolume = 0;
      let totalEngagement = 0;

      if ((platform === "twitter" || platform === "all") && dataSources.twitter) {
        const { data: tags } = await supabase
          .from("twitter_profile_zone_tags")
          .select("tag_type, profile_id")
          .eq("zone_id", zoneId);

        if (tags && tags.length > 0) {
          const tagGroups = new Map<string, string[]>();
          for (const tag of tags) {
            const existing = tagGroups.get(tag.tag_type) || [];
            existing.push(tag.profile_id);
            tagGroups.set(tag.tag_type, existing);
          }

          for (const [tagType, profileIds] of tagGroups) {
            const { data: tweets, count } = await supabase
              .from("twitter_tweets")
              .select("total_engagement", { count: "exact" })
              .eq("zone_id", zoneId)
              .in("author_profile_id", profileIds)
              .gte("twitter_created_at", startDate.toISOString());

            const engagement =
              tweets?.reduce((sum, t) => sum + (t.total_engagement || 0), 0) || 0;
            const volume = count || 0;

            shareOfVoice.push({
              platform: "twitter",
              tag_type: tagType,
              volume,
              engagement,
            });

            totalVolume += volume;
            totalEngagement += engagement;
          }
        }
      }

      if ((platform === "tiktok" || platform === "all") && dataSources.tiktok) {
        const { data: tags } = await supabase
          .from("tiktok_profile_zone_tags")
          .select("tag_type, profile_id")
          .eq("zone_id", zoneId);

        if (tags && tags.length > 0) {
          const tagGroups = new Map<string, string[]>();
          for (const tag of tags) {
            const existing = tagGroups.get(tag.tag_type) || [];
            existing.push(tag.profile_id!);
            tagGroups.set(tag.tag_type, existing);
          }

          for (const [tagType, profileIds] of tagGroups) {
            const { data: videos, count } = await supabase
              .from("tiktok_videos")
              .select("total_engagement", { count: "exact" })
              .eq("zone_id", zoneId)
              .in("author_profile_id", profileIds)
              .gte("tiktok_created_at", startDate.toISOString());

            const engagement =
              videos?.reduce((sum, v) => sum + Number(v.total_engagement || 0), 0) || 0;
            const volume = count || 0;

            shareOfVoice.push({
              platform: "tiktok",
              tag_type: tagType,
              volume,
              engagement,
            });

            totalVolume += volume;
            totalEngagement += engagement;
          }
        }
      }

      const withPercentages = shareOfVoice.map((sov) => ({
        ...sov,
        volume_percent: totalVolume > 0 ? ((sov.volume / totalVolume) * 100).toFixed(1) : "0",
        engagement_percent:
          totalEngagement > 0
            ? ((sov.engagement / totalEngagement) * 100).toFixed(1)
            : "0",
      }));

      withPercentages.sort((a, b) => b.volume - a.volume);

      return {
        platform,
        period,
        total_volume: totalVolume,
        total_engagement: totalEngagement,
        share_of_voice: withPercentages,
        note:
          withPercentages.length === 0
            ? "No profiles have been tagged yet. Tag profiles in Settings > Tracked Profiles."
            : undefined,
      };
    } catch (error) {
      logger.error("[AI Tool] get_share_of_voice error", { error });
      throw new Error("Failed to get share of voice");
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
