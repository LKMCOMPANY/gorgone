/**
 * AI Tool: Compare Accounts
 * Side-by-side comparison of multiple accounts
 */

import { type Tool, type ToolCallOptions, zodSchema } from "ai";
import { z } from "zod";
import { getProfileByUsername } from "@/lib/data/twitter/profiles";
import { getProfileByUsername as getTikTokProfile } from "@/lib/data/tiktok/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getToolContext } from "@/lib/ai/types";

const parametersSchema = z.object({
  usernames: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("Usernames to compare (2-5 accounts)"),
  platform: z
    .enum(["twitter", "tiktok"])
    .describe("Platform where accounts are"),
  period: z
    .enum(["3h", "6h", "12h", "24h", "7d", "30d"])
    .default("7d")
    .describe("Time period for activity comparison"),
});

type Parameters = z.infer<typeof parametersSchema>;
type Output = Record<string, unknown>;

export const compareAccountsTool: Tool<Parameters, Output> = {
  description:
    "Compare 2–5 accounts side-by-side on activity and engagement over a time window.",

  inputSchema: zodSchema(parametersSchema),

  execute: async (
    { usernames, platform, period },
    options: ToolCallOptions
  ): Promise<Output> => {
    const { zoneId } = getToolContext(options);
    try {
      logger.info(`[AI Tool] compare_accounts called`, { usernames, platform, period });

      const startDate = getStartDate(period);
      const supabase = createAdminClient();

      const comparisons: Array<Record<string, unknown>> = [];

      for (const username of usernames) {
        const cleanUsername = username.replace("@", "").trim().toLowerCase();

        if (platform === "twitter") {
          const profile = await getProfileByUsername(cleanUsername);

          if (!profile) {
            comparisons.push({ username: cleanUsername, found: false });
            continue;
          }

          const { data: tweets, count } = await supabase
            .from("twitter_tweets")
            .select("total_engagement", { count: "exact" })
            .eq("zone_id", zoneId)
            .eq("author_profile_id", profile.id)
            .gte("twitter_created_at", startDate.toISOString());

          const totalEngagement =
            tweets?.reduce((sum, t) => sum + (t.total_engagement || 0), 0) || 0;

          comparisons.push({
            username: profile.username,
            name: profile.name,
            found: true,
            followers: profile.followers_count,
            verified: profile.is_verified || profile.is_blue_verified,
            activity: {
              posts: count || 0,
              total_engagement: totalEngagement,
              avg_engagement: count && count > 0 ? Math.round(totalEngagement / count) : 0,
              engagement_rate:
                profile.followers_count > 0 && count && count > 0
                  ? ((totalEngagement / count / profile.followers_count) * 100).toFixed(3)
                  : "0",
            },
          });
        } else {
          const profile = await getTikTokProfile(cleanUsername);

          if (!profile) {
            comparisons.push({ username: cleanUsername, found: false });
            continue;
          }

          const { data: videos, count } = await supabase
            .from("tiktok_videos")
            .select("total_engagement, play_count", { count: "exact" })
            .eq("zone_id", zoneId)
            .eq("author_profile_id", profile.id)
            .gte("tiktok_created_at", startDate.toISOString());

          const totalEngagement =
            videos?.reduce((sum, v) => sum + Number(v.total_engagement || 0), 0) || 0;
          const totalViews =
            videos?.reduce((sum, v) => sum + Number(v.play_count || 0), 0) || 0;

          comparisons.push({
            username: profile.username,
            nickname: profile.nickname,
            found: true,
            followers: profile.follower_count,
            verified: profile.is_verified,
            activity: {
              videos: count || 0,
              total_engagement: totalEngagement,
              total_views: totalViews,
              avg_engagement: count && count > 0 ? Math.round(totalEngagement / count) : 0,
            },
          });
        }
      }

      return {
        platform,
        period,
        accounts_compared: comparisons.length,
        comparisons,
        winner:
          comparisons.length >= 2
            ? comparisons.reduce((prev, curr) =>
                ((curr.activity as Record<string, unknown>)?.total_engagement as number || 0) >
                ((prev.activity as Record<string, unknown>)?.total_engagement as number || 0)
                  ? curr
                  : prev
              ).username
            : null,
      };
    } catch (error) {
      logger.error("[AI Tool] compare_accounts error", { error });
      throw new Error("Failed to compare accounts");
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
  return new Date(Date.now() - (hours[period] || 168) * 60 * 60 * 1000);
}
