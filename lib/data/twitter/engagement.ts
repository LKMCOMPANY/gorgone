/**
 * Twitter Engagement Data Layer
 * Handles engagement tracking and history
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type {
  TwitterEngagementHistory,
  TwitterEngagementTracking,
  TwitterEngagementTier,
} from "@/types";

/**
 * Create engagement snapshot
 */
export async function createEngagementSnapshot(
  tweetId: string,
  metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    view_count?: number;
    bookmark_count?: number;
  }
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Get last snapshot for delta calculation
    const { data: lastSnapshot } = await supabase
      .from("twitter_engagement_history")
      .select("*")
      .eq("tweet_id", tweetId)
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .single();

    const deltaRetweets = lastSnapshot
      ? metrics.retweet_count - lastSnapshot.retweet_count
      : 0;
    const deltaReplies = lastSnapshot
      ? metrics.reply_count - lastSnapshot.reply_count
      : 0;
    const deltaLikes = lastSnapshot
      ? metrics.like_count - lastSnapshot.like_count
      : 0;
    const deltaQuotes = lastSnapshot
      ? metrics.quote_count - lastSnapshot.quote_count
      : 0;
    // Handle view_count explicitly to prevent drops to 0 if API returns undefined
    // Views are cumulative and cannot decrease
    let viewCount = metrics.view_count;
    if (viewCount === undefined || viewCount === null) {
      // If missing, carry over last known value
      viewCount = lastSnapshot?.view_count || 0;
    } else if (lastSnapshot?.view_count && viewCount < lastSnapshot.view_count) {
      // Safety check: if API returns lower value than before (unlikely), keep the max
      // Exception: if the drop is massive, maybe the tweet was deleted/re-indexed? 
      // But generally, views should be monotonic increasing.
      viewCount = lastSnapshot.view_count;
    }

    const deltaViews =
      lastSnapshot && viewCount !== undefined
        ? viewCount - (lastSnapshot.view_count || 0)
        : 0;

    // Calculate velocity (engagement per hour)
    let engagementVelocity = null;
    if (lastSnapshot) {
      const hoursSinceLastSnapshot =
        (new Date().getTime() - new Date(lastSnapshot.snapshot_at).getTime()) /
        (1000 * 60 * 60);
      const totalDelta = deltaRetweets + deltaReplies + deltaLikes + deltaQuotes;
      if (hoursSinceLastSnapshot > 0) {
        engagementVelocity = totalDelta / hoursSinceLastSnapshot;
      }
    }

    // Insert snapshot
    const { error } = await supabase
      .from("twitter_engagement_history")
      .insert({
        tweet_id: tweetId,
        retweet_count: metrics.retweet_count,
        reply_count: metrics.reply_count,
        like_count: metrics.like_count,
        quote_count: metrics.quote_count,
        view_count: viewCount,
        bookmark_count: metrics.bookmark_count || 0,
        delta_retweets: deltaRetweets,
        delta_replies: deltaReplies,
        delta_likes: deltaLikes,
        delta_quotes: deltaQuotes,
        delta_views: deltaViews,
        engagement_velocity: engagementVelocity,
      });

    if (error) throw error;

    logger.debug(`Engagement snapshot created for tweet: ${tweetId}`);
  } catch (error) {
    logger.error(`Error creating engagement snapshot for ${tweetId}:`, error);
  }
}

/**
 * Get engagement history for a tweet
 */
export async function getEngagementHistory(
  tweetId: string
): Promise<TwitterEngagementHistory[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_engagement_history")
      .select("*")
      .eq("tweet_id", tweetId)
      .order("snapshot_at", { ascending: true });

    if (error) throw error;

    return (data as TwitterEngagementHistory[]) || [];
  } catch (error) {
    logger.error(`Error fetching engagement history for ${tweetId}:`, error);
    return [];
  }
}

/**
 * Create engagement tracking record for a tweet
 * 
 * Strategy: Track every hour for 6 hours (6 updates total)
 * - 0-6h: Update every hour (tier: hot)
 * - 6h+: Stop tracking (tier: cold)
 * 
 * Note: Actual scheduling is handled by QStash (trigger-based)
 * This table is used for status tracking and analytics
 */
export async function createEngagementTracking(
  tweetDbId: string,
  tweetCreatedAt: Date
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Determine initial tier based on tweet age
    const ageHours =
      (new Date().getTime() - tweetCreatedAt.getTime()) / (1000 * 60 * 60);

    let tier: TwitterEngagementTier = "hot";
    const nextUpdateAt = new Date();

    // Simplified: track every hour for 6 hours
    if (ageHours < 6) {
      tier = "hot";
      nextUpdateAt.setHours(nextUpdateAt.getHours() + 1);
    } else {
      tier = "cold"; // Stop tracking after 6 hours
    }

    const { error } = await supabase
      .from("twitter_engagement_tracking")
      .insert({
        tweet_db_id: tweetDbId,
        tier,
        next_update_at: tier === "cold" ? null : nextUpdateAt.toISOString(),
        update_count: 0,
      });

    if (error) throw error;

    logger.debug(`Engagement tracking created for tweet: ${tweetDbId}`);
  } catch (error) {
    logger.error(
      `Error creating engagement tracking for ${tweetDbId}:`,
      error
    );
  }
}

/**
 * Get engagement velocity for trending detection
 */
export async function getHighVelocityTweets(
  zoneId: string,
  minVelocity = 100,
  limit = 10
): Promise<any[]> {
  try {
    const supabase = createAdminClient();

    // Get recent snapshots with high velocity
    const { data, error } = await supabase
      .from("twitter_engagement_history")
      .select("*, tweet:twitter_tweets!inner(*, author:twitter_profiles(*))")
      .gte("engagement_velocity", minVelocity)
      .eq("tweet.zone_id", zoneId)
      .order("engagement_velocity", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error(`Error fetching high velocity tweets for zone ${zoneId}:`, error);
    return [];
  }
}

/**
 * Clean up old engagement history (keep last 30 days)
 */
export async function cleanupOldEngagementHistory(
  olderThanDays = 30
): Promise<number> {
  try {
    const supabase = createAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await supabase
      .from("twitter_engagement_history")
      .delete()
      .lt("snapshot_at", cutoffDate.toISOString())
      .select("id");

    if (error) throw error;

    const deletedCount = data?.length || 0;
    logger.info(
      `Deleted ${deletedCount} engagement history records older than ${olderThanDays} days`
    );

    return deletedCount;
  } catch (error) {
    logger.error("Error cleaning up old engagement history:", error);
    return 0;
  }
}

