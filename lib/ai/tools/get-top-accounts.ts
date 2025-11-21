/**
 * AI Tool: Get Top Accounts
 * Returns most influential accounts by engagement or followers
 */

import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfilesWithStatsForZone } from "@/lib/data/tiktok/profiles-stats";
import { logger } from "@/lib/logger";
import type { ToolContext } from "@/lib/ai/types";

export const getTopAccountsTool = tool({
  description: `Get the most influential accounts ranked by engagement or followers.

Use this tool when the user asks for:
- "Top accounts by engagement"
- "Most influential accounts"
- "Who has the most interactions?"
- "Best performing creators"
- "Top influencers"

Returns profiles with engagement statistics and growth metrics.`,

  parameters: z.object({
    platform: z
      .enum(["twitter", "tiktok", "all"])
      .default("all")
      .describe("Which platform to analyze"),
    period: z
      .enum(["3h", "6h", "12h", "24h", "7d", "30d"])
      .default("24h")
      .describe("Time period for engagement calculation"),
    limit: z.number().min(1).max(50).default(10).describe("Number of accounts to return"),
    sort_by: z
      .enum(["engagement", "followers"])
      .default("engagement")
      .describe("Sort by total engagement or follower count"),
  }),

  execute: async ({ platform, period, limit, sort_by }, context: ToolContext) => {
    const { zoneId, dataSources } = context;
    try {
      logger.info(`[AI Tool] get_top_accounts called`, {
        zone_id: zoneId,
        platform,
        period,
        limit,
        sort_by,
      });

      const accounts: any[] = [];

      // Twitter accounts - Direct aggregation (materialized views are empty)
      if ((platform === "twitter" || platform === "all") && dataSources.twitter) {
        try {
          const supabase = createAdminClient();
          const startDate = getStartDate(period);

          // Get all tweets with profiles in period
          const { data: tweets } = await supabase
            .from("twitter_tweets")
            .select("author_profile_id, total_engagement, author:twitter_profiles(*)")
            .eq("zone_id", zoneId)
            .gte("twitter_created_at", startDate.toISOString())
            .not("author_profile_id", "is", null);

          if (tweets && tweets.length > 0) {
            // Aggregate by profile
            const profileStats = new Map<string, any>();

            for (const tweet of tweets as any[]) {
              if (!tweet.author) continue;

              const profileId = tweet.author_profile_id;
              const existing = profileStats.get(profileId) || {
                profile: tweet.author,
                tweet_count: 0,
                total_engagement: 0,
              };

              existing.tweet_count++;
              existing.total_engagement += tweet.total_engagement || 0;
              profileStats.set(profileId, existing);
            }

            // Convert to array and calculate averages
            const profileArray = Array.from(profileStats.values()).map((stats) => ({
              ...stats,
              avg_engagement:
                stats.tweet_count > 0
                  ? Math.round(stats.total_engagement / stats.tweet_count)
                  : 0,
            }));

            // Sort by total engagement or followers
            if (sort_by === "engagement") {
              profileArray.sort((a, b) => b.total_engagement - a.total_engagement);
            } else {
              profileArray.sort(
                (a, b) => (b.profile.followers_count || 0) - (a.profile.followers_count || 0)
              );
            }

            // Take top N
            for (const stats of profileArray.slice(0, limit)) {
              accounts.push({
                platform: "twitter",
                username: stats.profile.username,
                name: stats.profile.name,
                verified: stats.profile.is_verified || stats.profile.is_blue_verified,
                followers: stats.profile.followers_count,
                stats: {
                  tweet_count: stats.tweet_count,
                  total_engagement: stats.total_engagement,
                  avg_engagement: stats.avg_engagement,
                },
                profile_url: `https://x.com/${stats.profile.username}`,
              });
            }
          }
        } catch (error) {
          logger.error("[AI Tool] Twitter accounts failed", { error });
        }
      }

      // TikTok accounts
      if ((platform === "tiktok" || platform === "all") && dataSources.tiktok) {
        try {
          const profiles = await getProfilesWithStatsForZone(zoneId, {
            limit,
            sort_by: sort_by === "engagement" ? "engagement" : "followers",
          });

          for (const profile of profiles) {
            accounts.push({
              platform: "tiktok",
              username: profile.username,
              nickname: profile.nickname,
              verified: profile.is_verified,
              followers: profile.follower_count,
              stats: {
                video_count: profile.video_count_in_zone,
                total_views: profile.total_play_count,
                total_engagement: profile.total_engagement,
                avg_engagement: profile.avg_engagement_per_video,
              },
              profile_url: `https://tiktok.com/@${profile.username}`,
            });
          }
        } catch (error) {
          logger.error("[AI Tool] TikTok accounts failed", { error });
        }
      }

      // Sort combined results
      if (sort_by === "engagement") {
        accounts.sort(
          (a, b) => (b.stats.total_engagement || 0) - (a.stats.total_engagement || 0)
        );
      } else {
        accounts.sort((a, b) => (b.followers || 0) - (a.followers || 0));
      }

      return {
        platform,
        period,
        sort_by,
        total_accounts: accounts.length,
        accounts: accounts.slice(0, limit),
      };
    } catch (error) {
      logger.error("[AI Tool] get_top_accounts error", { error });
      throw new Error("Failed to get top accounts");
    }
  },
});

// Helper function
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

