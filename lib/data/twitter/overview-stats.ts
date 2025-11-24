/**
 * Twitter Overview Statistics
 * Calculates aggregated stats for the overview page
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export interface TwitterOverviewStats {
  volume: number;
  engagement: number;
  reach: number;
  engaged_users: number;
  previous_volume?: number;
  previous_engagement?: number;
  previous_reach?: number;
  previous_engaged_users?: number;
}

/**
 * Parse period string to hours
 */
function periodToHours(period: string): number {
  const map: Record<string, number> = {
    "3h": 3,
    "6h": 6,
    "24h": 24,
    "7d": 24 * 7,
    "30d": 24 * 30,
  };
  return map[period] || 24;
}

/**
 * Get date range from period
 */
function getDateRange(period: string): { startDate: Date; endDate: Date } {
  const hours = periodToHours(period);
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);
  return { startDate, endDate };
}

/**
 * Get overview statistics for a zone and period
 * Includes comparison with previous period for percentage change
 */
export async function getTwitterOverviewStats(
  zoneId: string,
  period: string = "24h"
): Promise<TwitterOverviewStats> {
  try {
    const supabase = createAdminClient();
    
    // Current period
    const { startDate, endDate } = getDateRange(period);
    
    // Previous period (same duration, shifted back)
    const hours = periodToHours(period);
    const prevEndDate = new Date(startDate.getTime());
    const prevStartDate = new Date(prevEndDate.getTime() - hours * 60 * 60 * 1000);

    // Current period stats
    const { data: currentData, error: currentError } = await supabase
      .from("twitter_tweets")
      .select(`
        id,
        total_engagement,
        view_count,
        author_profile_id
      `)
      .eq("zone_id", zoneId)
      .gte("twitter_created_at", startDate.toISOString())
      .lte("twitter_created_at", endDate.toISOString());

    if (currentError) {
      logger.error("Error fetching current period stats", { zoneId, error: currentError });
      throw currentError;
    }

    // Previous period stats
    const { data: previousData, error: previousError } = await supabase
      .from("twitter_tweets")
      .select(`
        id,
        total_engagement,
        view_count,
        author_profile_id
      `)
      .eq("zone_id", zoneId)
      .gte("twitter_created_at", prevStartDate.toISOString())
      .lte("twitter_created_at", prevEndDate.toISOString());

    if (previousError) {
      logger.warn("Error fetching previous period stats", { zoneId, error: previousError });
    }

    // Calculate current stats
    const volume = currentData?.length || 0;
    const engagement = currentData?.reduce((sum, tweet) => sum + (tweet.total_engagement || 0), 0) || 0;
    const reach = currentData?.reduce((sum, tweet) => sum + (tweet.view_count || 0), 0) || 0;
    const uniqueAuthors = new Set(currentData?.map(t => t.author_profile_id) || []);
    const engaged_users = Array.from(uniqueAuthors).length;

    // Calculate previous stats
    const previous_volume = previousData?.length || 0;
    const previous_engagement = previousData?.reduce((sum, tweet) => sum + (tweet.total_engagement || 0), 0) || 0;
    const previous_reach = previousData?.reduce((sum, tweet) => sum + (tweet.view_count || 0), 0) || 0;
    const previousUniqueAuthors = new Set(previousData?.map(t => t.author_profile_id) || []);
    const previous_engaged_users = Array.from(previousUniqueAuthors).length;

    return {
      volume,
      engagement,
      reach,
      engaged_users,
      previous_volume,
      previous_engagement,
      previous_reach,
      previous_engaged_users,
    };
  } catch (error) {
    logger.error("Error getting Twitter overview stats", { zoneId, period, error });
    return {
      volume: 0,
      engagement: 0,
      reach: 0,
      engaged_users: 0,
    };
  }
}

