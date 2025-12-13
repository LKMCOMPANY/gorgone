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
    .default("30d")
    .describe("Time period for engagement calculation (default 30d for overall view)"),
  limit: z.number().min(1).max(50).default(10).describe("Number of accounts to return"),
  sort_by: z
    .enum(["engagement", "followers"])
    .default("engagement")
    .describe("Sort by total engagement or follower count"),
});

type Parameters = z.infer<typeof parametersSchema>;

/** Structured account for UI rendering */
type AccountResult = {
  platform: "twitter" | "tiktok";
  username: string;
  name: string;
  nickname?: string;
  verified: boolean;
  followers: number;
  avatar_url: string | null;
  stats: {
    post_count: number;
    total_engagement: number;
    avg_engagement: number;
    total_views?: number;
  };
  profile_url: string;
};

type Output = {
  _type: "top_accounts";
  platform: string;
  period: string;
  sort_by: string;
  accounts: AccountResult[];
  total_accounts: number;
};

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

      const accounts: AccountResult[] = [];

      if ((platform === "twitter" || platform === "all") && dataSources.twitter) {
        try {
          const supabase = createAdminClient();
          const startDate = getStartDate(period);

          // Use the FK relationship name for nested select
          const { data: tweets, error: twitterError } = await supabase
            .from("twitter_tweets")
            .select(`
              author_profile_id, 
              total_engagement, 
              twitter_profiles!author_profile_id (
                id, 
                username, 
                name, 
                is_verified, 
                is_blue_verified, 
                followers_count, 
                profile_picture_url
              )
            `)
            .eq("zone_id", zoneId)
            .gte("twitter_created_at", startDate.toISOString())
            .not("author_profile_id", "is", null);

          if (twitterError) {
            logger.error("[AI Tool] Twitter accounts query error", { error: twitterError });
          }

          logger.info("[AI Tool] Twitter accounts query result", {
            zone_id: zoneId,
            tweets_count: tweets?.length || 0,
            first_tweet_has_profile: tweets?.[0]?.twitter_profiles ? true : false,
          });

          if (tweets && tweets.length > 0) {
            const profileStats = new Map<string, {
              profile: Record<string, unknown>;
              tweet_count: number;
              total_engagement: number;
            }>();

            for (const tweet of tweets as unknown as Array<{
              author_profile_id: string;
              total_engagement: number;
              twitter_profiles: Record<string, unknown> | null;
            }>) {
              if (!tweet.twitter_profiles) continue;

              const profileId = tweet.author_profile_id;
              const existing = profileStats.get(profileId) || {
                profile: tweet.twitter_profiles,
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
                profile_picture_url?: string;
              };
              accounts.push({
                platform: "twitter",
                username: profile.username || "",
                name: profile.name || profile.username || "Unknown",
                verified: profile.is_verified || profile.is_blue_verified || false,
                followers: profile.followers_count || 0,
                avatar_url: profile.profile_picture_url || null,
                stats: {
                  post_count: stats.tweet_count,
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

      logger.info("[AI Tool] After Twitter, accounts count", { count: accounts.length });

      if ((platform === "tiktok" || platform === "all") && dataSources.tiktok) {
        try {
          const profiles = await getProfilesWithStatsForZone(zoneId, {
            limit,
            sort_by: sort_by === "engagement" ? "engagement" : "followers",
          });

          logger.info("[AI Tool] TikTok profiles fetched", { count: profiles?.length || 0 });

          for (const profile of profiles) {
            accounts.push({
              platform: "tiktok",
              username: profile.username,
              name: profile.nickname || profile.username,
              nickname: profile.nickname,
              verified: profile.is_verified,
              followers: profile.follower_count,
              avatar_url: profile.avatar_thumb || null,
              stats: {
                post_count: profile.video_count_in_zone,
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
        _type: "top_accounts",
        platform,
        period,
        sort_by,
        accounts: accounts.slice(0, limit),
        total_accounts: accounts.length,
      };
    } catch (error) {
      logger.error("[AI Tool] get_top_accounts error", { error });
      return {
        _type: "top_accounts",
        platform,
        period,
        sort_by,
        accounts: [],
        total_accounts: 0,
      };
    }
  },
};

// getStartDate imported from @/lib/ai/utils
