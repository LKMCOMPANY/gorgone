/**
 * Twitter Volume Analytics
 * Direct queries for volume trends (doesn't rely on materialized views)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export interface VolumeDataPoint {
  timestamp: string;
  tweet_count: number;
  total_engagement: number;
}

/**
 * Get volume trend by hour (direct query)
 */
export async function getHourlyVolumeTrend(
  zoneId: string,
  startDate: Date,
  endDate: Date
): Promise<VolumeDataPoint[]> {
  try {
    const supabase = createAdminClient();

    // Direct aggregation query
    const { data, error } = await supabase.rpc("get_hourly_volume_trend", {
      p_zone_id: zoneId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error) {
      // Fallback: manual aggregation if RPC doesn't exist
      logger.warn("RPC not available, using manual aggregation");
      return await manualHourlyAggregation(zoneId, startDate, endDate);
    }

    return (data as VolumeDataPoint[]) || [];
  } catch (error) {
    logger.error("Error fetching hourly volume trend:", error);
    return await manualHourlyAggregation(zoneId, startDate, endDate);
  }
}

/**
 * Manual aggregation fallback
 */
async function manualHourlyAggregation(
  zoneId: string,
  startDate: Date,
  endDate: Date
): Promise<VolumeDataPoint[]> {
  try {
    const supabase = createAdminClient();

    // Get all tweets in period
    const { data: tweets, error } = await supabase
      .from("twitter_tweets")
      .select("twitter_created_at, total_engagement")
      .eq("zone_id", zoneId)
      .gte("twitter_created_at", startDate.toISOString())
      .lte("twitter_created_at", endDate.toISOString());

    if (error) throw error;
    if (!tweets || tweets.length === 0) return [];

    // Group by hour
    const hourlyData = new Map<string, { count: number; engagement: number }>();

    for (const tweet of tweets) {
      const hour = new Date(tweet.twitter_created_at);
      hour.setMinutes(0, 0, 0);
      const hourKey = hour.toISOString();

      const existing = hourlyData.get(hourKey) || { count: 0, engagement: 0 };
      hourlyData.set(hourKey, {
        count: existing.count + 1,
        engagement: existing.engagement + (tweet.total_engagement || 0),
      });
    }

    // Convert to array and sort
    const result: VolumeDataPoint[] = Array.from(hourlyData.entries())
      .map(([timestamp, stats]) => ({
        timestamp,
        tweet_count: stats.count,
        total_engagement: stats.engagement,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return result;
  } catch (error) {
    logger.error("Error in manual hourly aggregation:", error);
    return [];
  }
}

/**
 * Get TikTok volume trend
 */
export async function getTikTokHourlyVolumeTrend(
  zoneId: string,
  startDate: Date,
  endDate: Date
): Promise<VolumeDataPoint[]> {
  try {
    const supabase = createAdminClient();

    const { data: videos, error } = await supabase
      .from("tiktok_videos")
      .select("tiktok_created_at, total_engagement")
      .eq("zone_id", zoneId)
      .gte("tiktok_created_at", startDate.toISOString())
      .lte("tiktok_created_at", endDate.toISOString());

    if (error) throw error;
    if (!videos || videos.length === 0) return [];

    // Group by hour
    const hourlyData = new Map<string, { count: number; engagement: number }>();

    for (const video of videos) {
      const hour = new Date(video.tiktok_created_at);
      hour.setMinutes(0, 0, 0);
      const hourKey = hour.toISOString();

      const existing = hourlyData.get(hourKey) || { count: 0, engagement: 0 };
      hourlyData.set(hourKey, {
        count: existing.count + 1,
        engagement: existing.engagement + Number(video.total_engagement || 0),
      });
    }

    const result: VolumeDataPoint[] = Array.from(hourlyData.entries())
      .map(([timestamp, stats]) => ({
        timestamp,
        tweet_count: stats.count, // Using same field name for consistency
        total_engagement: stats.engagement,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return result;
  } catch (error) {
    logger.error("Error fetching TikTok hourly volume:", error);
    return [];
  }
}

/**
 * Get Media volume trend (by day, not hour - less granular)
 */
export async function getMediaDailyVolumeTrend(
  zoneId: string,
  startDate: Date,
  endDate: Date
): Promise<VolumeDataPoint[]> {
  try {
    const supabase = createAdminClient();

    const { data: articles, error } = await supabase
      .from("media_articles")
      .select("published_at, social_score")
      .eq("zone_id", zoneId)
      .gte("published_at", startDate.toISOString())
      .lte("published_at", endDate.toISOString());

    if (error) throw error;
    if (!articles || articles.length === 0) return [];

    // Group by day (media is less frequent)
    const dailyData = new Map<string, { count: number; engagement: number }>();

    for (const article of articles) {
      const day = new Date(article.published_at);
      day.setHours(0, 0, 0, 0);
      const dayKey = day.toISOString();

      const existing = dailyData.get(dayKey) || { count: 0, engagement: 0 };
      dailyData.set(dayKey, {
        count: existing.count + 1,
        engagement: existing.engagement + (article.social_score || 0),
      });
    }

    const result: VolumeDataPoint[] = Array.from(dailyData.entries())
      .map(([timestamp, stats]) => ({
        timestamp,
        tweet_count: stats.count,
        total_engagement: stats.engagement,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return result;
  } catch (error) {
    logger.error("Error fetching media daily volume:", error);
    return [];
  }
}

