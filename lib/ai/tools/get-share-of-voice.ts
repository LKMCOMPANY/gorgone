/**
 * AI Tool: Get Share of Voice
 * Analyzes content distribution by profile tags (Attila, Ally, Adversary, etc.)
 */

import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { ToolContext } from "@/lib/ai/types";

export const getShareOfVoiceTool = tool({
  description: `Analyze share of voice by profile tags (Attila, Ally, Adversary, Surveillance, Target, Asset, Local Team).

Use this tool when the user asks for:
- "Share of voice by profile type"
- "Distribution between allies and adversaries"
- "Who is dominating the conversation?"
- "Volume by profile category"

Returns volume and engagement percentages for each profile tag type.`,

  parameters: z.object({
    platform: z
      .enum(["twitter", "tiktok", "all"])
      .default("all")
      .describe("Which platform to analyze"),
    period: z
      .enum(["3h", "6h", "12h", "24h", "7d", "30d"])
      .default("24h")
      .describe("Time period"),
  }),

  execute: async ({ platform, period }, context: any) => {
    try {
      logger.info(`[AI Tool] get_share_of_voice called`, {
        platform,
        period,
      });

      const { zoneId, dataSources } = context;
      const startDate = getStartDate(period);
      const supabase = createAdminClient();

      const shareOfVoice: any[] = [];
      let totalVolume = 0;
      let totalEngagement = 0;

      // Twitter Share of Voice
      if ((platform === "twitter" || platform === "all") && dataSources.twitter) {
        // Get tagged profiles
        const { data: tags } = await supabase
          .from("twitter_profile_zone_tags")
          .select("tag_type, profile_id")
          .eq("zone_id", zoneId);

        if (tags && tags.length > 0) {
          // Group by tag type
          const tagGroups = new Map<string, string[]>();
          for (const tag of tags) {
            const existing = tagGroups.get(tag.tag_type) || [];
            existing.push(tag.profile_id);
            tagGroups.set(tag.tag_type, existing);
          }

          // Calculate volume per tag
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

      // TikTok Share of Voice
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

      // Calculate percentages
      const withPercentages = shareOfVoice.map((sov) => ({
        ...sov,
        volume_percent: totalVolume > 0 ? ((sov.volume / totalVolume) * 100).toFixed(1) : "0",
        engagement_percent:
          totalEngagement > 0
            ? ((sov.engagement / totalEngagement) * 100).toFixed(1)
            : "0",
      }));

      // Sort by volume descending
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
});

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

