/**
 * AI Tool: Analyze Account
 * Deep analysis of a specific account's activity and influence
 */

import { tool } from "ai";
import { z } from "zod";
import { getProfileByUsername } from "@/lib/data/twitter/profiles";
import { getProfileByUsername as getTikTokProfile } from "@/lib/data/tiktok/profiles";
import { getProfilesWithStatsForZone } from "@/lib/data/tiktok/profiles-stats";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { ToolContext } from "@/lib/ai/types";

export const analyzeAccountTool = tool({
  description: `Analyze a specific account in detail (profile, stats, top content, tags).

Use this tool when the user asks for:
- "Analyze @username"
- "Tell me about @account"
- "Profile analysis for @user"
- "Stats for @username"
- "Who is @account?"

Returns comprehensive profile analysis with engagement metrics and top posts.`,

  parameters: z.object({
    username: z.string().describe("Username to analyze (with or without @)"),
    platform: z
      .enum(["twitter", "tiktok"])
      .describe("Which platform the account is on"),
    period: z
      .enum(["3h", "6h", "12h", "24h", "7d", "30d"])
      .default("7d")
      .describe("Time period for activity analysis"),
  }),

  execute: async ({ username, platform, period }, context: any) => {
    try {
      logger.info(`[AI Tool] analyze_account called`, {
        username,
        platform,
        period,
      });

      const { zoneId } = context;
      const cleanUsername = username.replace("@", "").trim().toLowerCase();
      const startDate = getStartDate(period);
      const supabase = createAdminClient();

      if (platform === "twitter") {
        // Get profile
        const profile = await getProfileByUsername(cleanUsername);

        if (!profile) {
          return {
            found: false,
            message: `Twitter profile @${cleanUsername} not found in monitored data.`,
          };
        }

        // Get activity stats
        const { data: tweets, count } = await supabase
          .from("twitter_tweets")
          .select("total_engagement, text, twitter_created_at, tweet_id", {
            count: "exact",
          })
          .eq("zone_id", zoneId)
          .eq("author_profile_id", profile.id)
          .gte("twitter_created_at", startDate.toISOString())
          .order("total_engagement", { ascending: false })
          .limit(5);

        // Get profile tags
        const { data: tags } = await supabase
          .from("twitter_profile_zone_tags")
          .select("tag_type, notes")
          .eq("zone_id", zoneId)
          .eq("profile_id", profile.id);

        const totalEngagement =
          tweets?.reduce((sum, t) => sum + (t.total_engagement || 0), 0) || 0;
        const avgEngagement =
          count && count > 0 ? Math.round(totalEngagement / count) : 0;

        return {
          found: true,
          platform: "twitter",
          profile: {
            username: profile.username,
            name: profile.name,
            bio: profile.description,
            followers: profile.followers_count,
            following: profile.following_count,
            verified: profile.is_verified || profile.is_blue_verified,
            location: profile.location,
          },
          activity: {
            tweet_count: count || 0,
            total_engagement: totalEngagement,
            avg_engagement: avgEngagement,
            engagement_rate:
              profile.followers_count > 0
                ? ((avgEngagement / profile.followers_count) * 100).toFixed(3)
                : "0",
          },
          tags: tags?.map((t) => t.tag_type) || [],
          top_posts: tweets?.map((t) => ({
            text: t.text.substring(0, 150) + (t.text.length > 150 ? "..." : ""),
            engagement: t.total_engagement,
            date: t.twitter_created_at,
          })),
        };
      } else {
        // TikTok
        const profile = await getTikTokProfile(cleanUsername);

        if (!profile) {
          return {
            found: false,
            message: `TikTok profile @${cleanUsername} not found in monitored data.`,
          };
        }

        // Get stats
        const profilesWithStats = await getProfilesWithStatsForZone(zoneId, {
          search: cleanUsername,
          limit: 1,
        });

        const stats = profilesWithStats[0];

        // Get top videos
        const { data: videos } = await supabase
          .from("tiktok_videos")
          .select("description, total_engagement, tiktok_created_at, video_id")
          .eq("zone_id", zoneId)
          .eq("author_profile_id", profile.id)
          .gte("tiktok_created_at", startDate.toISOString())
          .order("total_engagement", { ascending: false })
          .limit(5);

        // Get tags
        const { data: tags } = await supabase
          .from("tiktok_profile_zone_tags")
          .select("tag_type, notes")
          .eq("zone_id", zoneId)
          .eq("profile_id", profile.id);

        return {
          found: true,
          platform: "tiktok",
          profile: {
            username: profile.username,
            nickname: profile.nickname,
            bio: profile.signature,
            followers: profile.follower_count,
            verified: profile.is_verified,
            region: profile.region,
          },
          activity: stats
            ? {
                video_count: stats.video_count_in_zone,
                total_engagement: stats.total_engagement,
                avg_engagement: Math.round(stats.avg_engagement_per_video),
                total_views: stats.total_play_count,
              }
            : null,
          tags: tags?.map((t) => t.tag_type) || [],
          top_videos: videos?.map((v) => ({
            description: v.description?.substring(0, 150),
            engagement: Number(v.total_engagement),
            date: v.tiktok_created_at,
          })),
        };
      }
    } catch (error) {
      logger.error("[AI Tool] analyze_account error", { error });
      throw new Error("Failed to analyze account");
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

