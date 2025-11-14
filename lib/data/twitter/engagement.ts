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
    const deltaViews =
      lastSnapshot && metrics.view_count
        ? metrics.view_count - (lastSnapshot.view_count || 0)
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
        view_count: metrics.view_count || 0,
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
 * Get tweets that need engagement update (based on tier and schedule)
 */
export async function getTweetsForEngagementUpdate(
  limit = 1000
): Promise<TwitterEngagementTracking[]> {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("twitter_engagement_tracking")
      .select("*")
      .lte("next_update_at", now)
      .neq("tier", "cold")
      .order("next_update_at", { ascending: true })
      .limit(limit);

    if (error) throw error;

    return (data as TwitterEngagementTracking[]) || [];
  } catch (error) {
    logger.error("Error fetching tweets for engagement update:", error);
    return [];
  }
}

/**
 * Create engagement tracking record for a tweet
 */
export async function createEngagementTracking(
  tweetDbId: string,
  tweetCreatedAt: Date
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Determine initial tier based on tweet age
    const ageMinutes =
      (new Date().getTime() - tweetCreatedAt.getTime()) / (1000 * 60);

    let tier: TwitterEngagementTier = "ultra_hot";
    let nextUpdateAt = new Date();

    if (ageMinutes < 60) {
      // Ultra hot: first hour, update every 10 min
      tier = "ultra_hot";
      nextUpdateAt.setMinutes(nextUpdateAt.getMinutes() + 10);
    } else if (ageMinutes < 240) {
      // Hot: 1-4h, update every 30 min
      tier = "hot";
      nextUpdateAt.setMinutes(nextUpdateAt.getMinutes() + 30);
    } else if (ageMinutes < 720) {
      // Warm: 4-12h, update every 1h
      tier = "warm";
      nextUpdateAt.setHours(nextUpdateAt.getHours() + 1);
    } else {
      // Cold: 12h+, stop tracking
      tier = "cold";
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
 * Update engagement tracking tier and schedule
 */
export async function updateEngagementTracking(
  trackingId: string,
  tweetCreatedAt: Date
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Calculate tweet age
    const ageMinutes =
      (new Date().getTime() - tweetCreatedAt.getTime()) / (1000 * 60);
    const ageHours = ageMinutes / 60;

    // Determine tier and next update time
    let tier: TwitterEngagementTier;
    let nextUpdateAt: Date | null = new Date();

    if (ageMinutes < 60) {
      tier = "ultra_hot";
      nextUpdateAt.setMinutes(nextUpdateAt.getMinutes() + 10);
    } else if (ageHours < 4) {
      tier = "hot";
      nextUpdateAt.setMinutes(nextUpdateAt.getMinutes() + 30);
    } else if (ageHours < 12) {
      tier = "warm";
      nextUpdateAt.setHours(nextUpdateAt.getHours() + 1);
    } else {
      tier = "cold";
      nextUpdateAt = null; // Stop tracking
    }

    // Update tracking record
    const { error } = await supabase
      .from("twitter_engagement_tracking")
      .update({
        tier,
        next_update_at: nextUpdateAt?.toISOString() || null,
        last_updated_at: new Date().toISOString(),
      })
      .eq("id", trackingId);

    if (error) throw error;

    // Increment update count
    await supabase.rpc("increment", {
      table_name: "twitter_engagement_tracking",
      row_id: trackingId,
      column_name: "update_count",
    });

    logger.debug(`Engagement tracking updated: ${trackingId} -> ${tier}`);
  } catch (error) {
    logger.error(`Error updating engagement tracking ${trackingId}:`, error);
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

