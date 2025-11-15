/**
 * Twitter Zone Statistics
 * Calculates dynamic thresholds and stats per zone for intelligent tracking
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

// Redis client for caching
const redis = new Redis({
  url: env.redis.url,
  token: env.redis.token,
});

// Cache TTL: 1 hour
const CACHE_TTL = 3600;

/**
 * Get zone engagement threshold (P25 - 25th percentile)
 * Tweets above this threshold are considered "active" and worth tracking
 * Cached in Redis for 1 hour
 */
export async function getZoneEngagementThreshold(
  zoneId: string
): Promise<number> {
  try {
    // 1. Check cache
    const cacheKey = `zone:${zoneId}:threshold`;
    const cached = await redis.get<number>(cacheKey);
    
    if (cached !== null) {
      logger.debug(`Zone threshold cache hit for ${zoneId}: ${cached}`);
      return cached;
    }

    logger.debug(`Zone threshold cache miss for ${zoneId}, calculating...`);

    // 2. Calculate P25 (25th percentile) from last 24 hours
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from("twitter_tweets")
      .select("total_engagement")
      .eq("zone_id", zoneId)
      .gte("twitter_created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("total_engagement", { ascending: true });

    if (error) {
      logger.error(`Error calculating zone threshold for ${zoneId}:`, error);
      return 1; // Fallback to safe default
    }

    if (!data || data.length === 0) {
      logger.warn(`No tweets found for zone ${zoneId} in last 24h, using default threshold`);
      return 1; // Default for new zones
    }

    // Calculate P25 (25th percentile)
    const sortedEngagements = data.map(t => t.total_engagement || 0).sort((a, b) => a - b);
    const p25Index = Math.floor(sortedEngagements.length * 0.25);
    const threshold = Math.max(1, sortedEngagements[p25Index] || 0);

    logger.info(`Zone ${zoneId} threshold calculated: ${threshold} (from ${data.length} tweets)`);

    // 3. Cache for 1 hour
    await redis.set(cacheKey, threshold, { ex: CACHE_TTL });

    return threshold;
  } catch (error) {
    logger.error(`Error getting zone threshold for ${zoneId}:`, error);
    return 1; // Safe fallback
  }
}

/**
 * Get zone statistics (for monitoring and analytics)
 */
export async function getZoneEngagementStats(zoneId: string): Promise<{
  total_tweets: number;
  avg_engagement: number;
  median_engagement: number;
  p25_engagement: number;
  p75_engagement: number;
  max_engagement: number;
}> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_tweets")
      .select("total_engagement")
      .eq("zone_id", zoneId)
      .gte("twitter_created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error || !data || data.length === 0) {
      return {
        total_tweets: 0,
        avg_engagement: 0,
        median_engagement: 0,
        p25_engagement: 0,
        p75_engagement: 0,
        max_engagement: 0,
      };
    }

    const engagements = data.map(t => t.total_engagement || 0).sort((a, b) => a - b);
    const sum = engagements.reduce((acc, val) => acc + val, 0);

    return {
      total_tweets: engagements.length,
      avg_engagement: Math.round(sum / engagements.length),
      median_engagement: engagements[Math.floor(engagements.length * 0.5)] || 0,
      p25_engagement: engagements[Math.floor(engagements.length * 0.25)] || 0,
      p75_engagement: engagements[Math.floor(engagements.length * 0.75)] || 0,
      max_engagement: engagements[engagements.length - 1] || 0,
    };
  } catch (error) {
    logger.error(`Error getting zone stats for ${zoneId}:`, error);
    return {
      total_tweets: 0,
      avg_engagement: 0,
      median_engagement: 0,
      p25_engagement: 0,
      p75_engagement: 0,
      max_engagement: 0,
    };
  }
}

/**
 * Invalidate zone threshold cache (call after bulk data changes)
 */
export async function invalidateZoneThresholdCache(zoneId: string): Promise<void> {
  try {
    const cacheKey = `zone:${zoneId}:threshold`;
    await redis.del(cacheKey);
    logger.debug(`Zone threshold cache invalidated for ${zoneId}`);
  } catch (error) {
    logger.error(`Error invalidating cache for ${zoneId}:`, error);
  }
}

