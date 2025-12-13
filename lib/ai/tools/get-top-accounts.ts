/**
 * AI Tool: Get Top Accounts
 * Returns most influential accounts by engagement or followers
 */

import { type Tool, type ToolCallOptions, zodSchema } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfilesWithStatsForZone } from "@/lib/data/tiktok/profiles-stats";
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
    .describe("Time period for engagement calculation"),
  limit: z.number().min(1).max(50).default(10).describe("Number of accounts to return"),
  sort_by: z
    .enum(["engagement", "followers"])
    .default("engagement")
    .describe("Sort by total engagement or follower count"),
});

type Parameters = z.infer<typeof parametersSchema>;
type Output = Record<string, unknown>;

export const getTopAccountsTool: Tool<Parameters, Output> = {
  description:
    "Identify the most influential accounts active in this zone, ranked by engagement or follower count. Use for questions like 'who are the key influencers?', 'top accounts', or 'most active users'. Returns profile data with engagement metrics and profile URLs.",

  inputSchema: zodSchema(parametersSchema),

  execute: async (
    { platform, period, limit, sort_by },
    options: ToolCallOptions
  ): Promise<Output> => {
    const { zoneId, dataSources } = getToolContext(options);
    try {
      logger.info(`[AI Tool] get_top_accounts called`, {
        zone_id: zoneId,
        platform,
        period,
        limit,
        sort_by,
      });

      const accounts: Array<Record<string, unknown>> = [];

      if ((platform === "twitter" || platform === "all") && dataSources.twitter) {
        try {
          const supabase = createAdminClient();
          const startDate = getStartDate(period);

          const { data: tweets } = await supabase
            .from("twitter_tweets")
            .select("author_profile_id, total_engagement, author:twitter_profiles(*)")
            .eq("zone_id", zoneId)
            .gte("twitter_created_at", startDate.toISOString())
            .not("author_profile_id", "is", null);

          if (tweets && tweets.length > 0) {
            const profileStats = new Map<string, {
              profile: Record<string, unknown>;
              tweet_count: number;
              total_engagement: number;
            }>();

            for (const tweet of tweets as unknown as Array<{
              author_profile_id: string;
              total_engagement: number;
              author: Record<string, unknown>;
            }>) {
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

            const profileArray = Array.from(profileStats.values()).map((stats) => ({
              ...stats,
              avg_engagement:
                stats.tweet_count > 0
                  ? Math.round(stats.total_engagement / stats.tweet_count)
                  : 0,
            }));

            if (sort_by === "engagement") {
              profileArray.sort((a, b) => b.total_engagement - a.total_engagement);
            } else {
              profileArray.sort(
                (a, b) =>
                  ((b.profile as { followers_count?: number }).followers_count || 0) -
                  ((a.profile as { followers_count?: number }).followers_count || 0)
              );
            }

            for (const stats of profileArray.slice(0, limit)) {
              const profile = stats.profile as {
                username?: string;
                name?: string;
                is_verified?: boolean;
                is_blue_verified?: boolean;
                followers_count?: number;
              };
              accounts.push({
                platform: "twitter",
                username: profile.username || "",
                name: profile.name,
                verified: profile.is_verified || profile.is_blue_verified || false,
                followers: profile.followers_count || 0,
                stats: {
                  tweet_count: stats.tweet_count,
                  total_engagement: stats.total_engagement,
                  avg_engagement: stats.avg_engagement,
                },
                profile_url: `https://x.com/${profile.username}`,
              });
            }
          }
        } catch (error) {
          logger.error("[AI Tool] Twitter accounts failed", { error });
        }
      }

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

      if (sort_by === "engagement") {
        accounts.sort(
          (a, b) =>
            ((b.stats as { total_engagement?: number })?.total_engagement || 0) -
            ((a.stats as { total_engagement?: number })?.total_engagement || 0)
        );
      } else {
        accounts.sort((a, b) => ((b.followers as number) || 0) - ((a.followers as number) || 0));
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
      return {
        platform,
        period,
        sort_by,
        error: "Failed to retrieve top accounts",
        accounts: [],
      };
    }
  },
};

// getStartDate imported from @/lib/ai/utils
