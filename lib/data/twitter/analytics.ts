/**
 * Twitter Analytics Data Layer
 * Handles aggregated stats, materialized views, and analytics queries
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type {
  TwitterZoneStatsHourly,
  TwitterTopProfile,
  TwitterTopTweet,
  TwitterShareOfVoice,
} from "@/types";

/**
 * Get zone stats for a time period
 */
export async function getZoneStats(
  zoneId: string,
  startDate: Date,
  endDate: Date
): Promise<TwitterZoneStatsHourly[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_zone_stats_hourly")
      .select("*")
      .eq("zone_id", zoneId)
      .gte("hour_timestamp", startDate.toISOString())
      .lte("hour_timestamp", endDate.toISOString())
      .order("hour_timestamp", { ascending: true });

    if (error) throw error;

    return (data as TwitterZoneStatsHourly[]) || [];
  } catch (error) {
    logger.error(`Error fetching zone stats for ${zoneId}:`, error);
    return [];
  }
}

/**
 * Get top profiles for a time period
 */
export async function getTopProfiles(
  zoneId: string,
  startDate: Date,
  endDate: Date,
  limit = 10
): Promise<TwitterTopProfile[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_top_profiles_3h")
      .select("*")
      .eq("zone_id", zoneId)
      .gte("period_start", startDate.toISOString())
      .lte("period_end", endDate.toISOString())
      .order("total_engagement", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data as TwitterTopProfile[]) || [];
  } catch (error) {
    logger.error(`Error fetching top profiles for ${zoneId}:`, error);
    return [];
  }
}

/**
 * Get top profiles by period (using correct materialized view)
 */
export async function getTopProfilesByPeriod(
  zoneId: string,
  period: "3h" | "6h" | "12h" | "24h" | "7d" | "30d",
  limit = 10
): Promise<TwitterTopProfile[]> {
  try {
    const supabase = createAdminClient();

    // Map period to materialized view
    const viewMap: Record<string, string> = {
      "3h": "twitter_top_profiles_3h",
      "6h": "twitter_top_profiles_6h",
      "12h": "twitter_top_profiles_12h",
      "24h": "twitter_top_profiles_24h",
      "7d": "twitter_top_profiles_7d",
      "30d": "twitter_top_profiles_30d",
    };

    const viewName = viewMap[period];
    if (!viewName) {
      throw new Error(`Invalid period: ${period}`);
    }

    const { data, error } = await supabase
      .from(viewName)
      .select("*")
      .eq("zone_id", zoneId)
      .order("total_engagement", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data as TwitterTopProfile[]) || [];
  } catch (error) {
    logger.error(
      `Error fetching top profiles for ${zoneId} (${period}):`,
      error
    );
    return [];
  }
}

/**
 * Get top tweets by period
 */
export async function getTopTweetsByPeriod(
  zoneId: string,
  period: "3h" | "6h" | "12h" | "24h" | "7d" | "30d",
  limit = 10
): Promise<TwitterTopTweet[]> {
  try {
    const supabase = createAdminClient();

    // Map period to materialized view
    const viewMap: Record<string, string> = {
      "3h": "twitter_top_tweets_3h",
      "6h": "twitter_top_tweets_6h",
      "12h": "twitter_top_tweets_12h",
      "24h": "twitter_top_tweets_24h",
      "7d": "twitter_top_tweets_7d",
      "30d": "twitter_top_tweets_30d",
    };

    const viewName = viewMap[period];
    if (!viewName) {
      throw new Error(`Invalid period: ${period}`);
    }

    const { data, error } = await supabase
      .from(viewName)
      .select("*")
      .eq("zone_id", zoneId)
      .order("current_engagement", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data as TwitterTopTweet[]) || [];
  } catch (error) {
    logger.error(`Error fetching top tweets for ${zoneId} (${period}):`, error);
    return [];
  }
}

/**
 * Get share of voice by profile tags
 */
export async function getShareOfVoice(
  zoneId: string,
  period: "3h" | "6h" | "12h" | "24h" | "7d" | "30d"
): Promise<TwitterShareOfVoice[]> {
  try {
    const supabase = createAdminClient();

    // Map period to materialized view
    const viewMap: Record<string, string> = {
      "3h": "twitter_share_of_voice_3h",
      "6h": "twitter_share_of_voice_6h",
      "12h": "twitter_share_of_voice_12h",
      "24h": "twitter_share_of_voice_24h",
      "7d": "twitter_share_of_voice_7d",
      "30d": "twitter_share_of_voice_30d",
    };

    const viewName = viewMap[period];
    if (!viewName) {
      throw new Error(`Invalid period: ${period}`);
    }

    const { data, error } = await supabase
      .from(viewName)
      .select("*")
      .eq("zone_id", zoneId)
      .order("volume", { ascending: false });

    if (error) throw error;

    return (data as TwitterShareOfVoice[]) || [];
  } catch (error) {
    logger.error(
      `Error fetching share of voice for ${zoneId} (${period}):`,
      error
    );
    return [];
  }
}

/**
 * Get volume trend (hourly breakdown)
 */
export async function getVolumeTrend(
  zoneId: string,
  startDate: Date,
  endDate: Date
): Promise<{ timestamp: string; volume: number; engagement: number }[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_zone_stats_hourly")
      .select("hour_timestamp, tweet_count, total_engagement")
      .eq("zone_id", zoneId)
      .gte("hour_timestamp", startDate.toISOString())
      .lte("hour_timestamp", endDate.toISOString())
      .order("hour_timestamp", { ascending: true });

    if (error) throw error;

    return (
      data?.map((row) => ({
        timestamp: row.hour_timestamp,
        volume: row.tweet_count,
        engagement: row.total_engagement,
      })) || []
    );
  } catch (error) {
    logger.error(`Error fetching volume trend for ${zoneId}:`, error);
    return [];
  }
}

/**
 * Get engagement rate over time
 */
export async function getEngagementRate(
  zoneId: string,
  startDate: Date,
  endDate: Date
): Promise<{ timestamp: string; rate: number }[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_zone_stats_hourly")
      .select("hour_timestamp, tweet_count, total_engagement")
      .eq("zone_id", zoneId)
      .gte("hour_timestamp", startDate.toISOString())
      .lte("hour_timestamp", endDate.toISOString())
      .order("hour_timestamp", { ascending: true });

    if (error) throw error;

    return (
      data?.map((row) => ({
        timestamp: row.hour_timestamp,
        rate: row.tweet_count > 0 ? row.total_engagement / row.tweet_count : 0,
      })) || []
    );
  } catch (error) {
    logger.error(`Error fetching engagement rate for ${zoneId}:`, error);
    return [];
  }
}

/**
 * Detect volume spikes (for alerts)
 */
export async function detectVolumeSpikes(
  zoneId: string,
  thresholdMultiplier = 2.0
): Promise<TwitterZoneStatsHourly[]> {
  try {
    const supabase = createAdminClient();

    // Get last 24 hours of stats
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);

    const { data, error } = await supabase
      .from("twitter_zone_stats_hourly")
      .select("*")
      .eq("zone_id", zoneId)
      .gte("hour_timestamp", last24h.toISOString())
      .order("hour_timestamp", { ascending: true });

    if (error) throw error;
    if (!data || data.length < 2) return [];

    // Calculate average
    const avgVolume =
      data.reduce((sum, row) => sum + row.tweet_count, 0) / data.length;

    // Find spikes
    const spikes = data.filter(
      (row) => row.tweet_count > avgVolume * thresholdMultiplier
    );

    return spikes as TwitterZoneStatsHourly[];
  } catch (error) {
    logger.error(`Error detecting volume spikes for ${zoneId}:`, error);
    return [];
  }
}

/**
 * Detect engagement acceleration (for alerts)
 */
export async function detectEngagementAcceleration(
  zoneId: string,
  thresholdMultiplier = 2.0
): Promise<TwitterZoneStatsHourly[]> {
  try {
    const supabase = createAdminClient();

    // Get last 24 hours of stats
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);

    const { data, error } = await supabase
      .from("twitter_zone_stats_hourly")
      .select("*")
      .eq("zone_id", zoneId)
      .gte("hour_timestamp", last24h.toISOString())
      .order("hour_timestamp", { ascending: true });

    if (error) throw error;
    if (!data || data.length < 2) return [];

    // Calculate average engagement
    const avgEngagement =
      data.reduce((sum, row) => sum + row.total_engagement, 0) / data.length;

    // Find acceleration
    const accelerations = data.filter(
      (row) => row.total_engagement > avgEngagement * thresholdMultiplier
    );

    return accelerations as TwitterZoneStatsHourly[];
  } catch (error) {
    logger.error(
      `Error detecting engagement acceleration for ${zoneId}:`,
      error
    );
    return [];
  }
}

/**
 * Refresh a materialized view
 */
export async function refreshMaterializedView(
  viewName: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.rpc("refresh_materialized_view", {
      view_name: viewName,
    });

    if (error) throw error;

    logger.info(`Materialized view refreshed: ${viewName}`);
  } catch (error) {
    logger.error(`Error refreshing materialized view ${viewName}:`, error);
  }
}

/**
 * Refresh all Twitter materialized views
 */
export async function refreshAllTwitterViews(): Promise<void> {
  const views = [
    "twitter_zone_stats_hourly",
    "twitter_top_profiles_3h",
    "twitter_top_profiles_6h",
    "twitter_top_profiles_12h",
    "twitter_top_profiles_24h",
    "twitter_top_profiles_7d",
    "twitter_top_profiles_30d",
    "twitter_top_tweets_3h",
    "twitter_top_tweets_6h",
    "twitter_top_tweets_12h",
    "twitter_top_tweets_24h",
    "twitter_top_tweets_7d",
    "twitter_top_tweets_30d",
    "twitter_share_of_voice_3h",
    "twitter_share_of_voice_6h",
    "twitter_share_of_voice_12h",
    "twitter_share_of_voice_24h",
    "twitter_share_of_voice_7d",
    "twitter_share_of_voice_30d",
  ];

  for (const view of views) {
    await refreshMaterializedView(view);
  }

  logger.info("All Twitter materialized views refreshed");
}

