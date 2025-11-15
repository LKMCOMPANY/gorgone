/**
 * Twitter Engagement Updater
 * Handles periodic and manual engagement metrics updates
 */

import { logger } from "@/lib/logger";
import * as twitterApi from "@/lib/api/twitter/client";
import { getTweetById } from "@/lib/data/twitter/tweets";
import { updateTweetEngagement } from "@/lib/data/twitter/tweets";
import { createEngagementSnapshot } from "@/lib/data/twitter/engagement";
import { getTweetsForEngagementUpdate } from "@/lib/data/twitter/engagement";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TwitterAPITweet } from "@/types";

// ============================================================================
// Types
// ============================================================================

export interface UpdateResult {
  success: boolean;
  tweetId: string;
  error?: string;
  metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    view_count: number;
    bookmark_count: number;
  };
  snapshot_created: boolean;
  tier_updated: boolean;
}

export interface BatchUpdateResult {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  results: UpdateResult[];
  stats: {
    api_calls: number;
    tweets_per_call: number;
    avg_latency_ms: number;
  };
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Update engagement metrics for a single tweet
 * This is the core reusable function
 */
export async function updateSingleTweetEngagement(
  tweetDbId: string
): Promise<UpdateResult> {
  const result: UpdateResult = {
    success: false,
    tweetId: tweetDbId,
    snapshot_created: false,
    tier_updated: false,
  };

  try {
    // 1. Get tweet from database
    const tweet = await getTweetById(tweetDbId);

    if (!tweet) {
      result.error = "Tweet not found in database";
      return result;
    }

    // 2. Fetch fresh metrics from Twitter API
    const apiTweet = await twitterApi.getTweetById(tweet.tweet_id);

    if (!apiTweet) {
      result.error = "Failed to fetch tweet from Twitter API (may be deleted)";
      logger.warn(`Tweet ${tweet.tweet_id} not found on Twitter API`);
      
      // Mark as cold to stop tracking deleted tweets
      await markTweetAsCold(tweetDbId);
      return result;
    }

    // 3. Prepare metrics
    const metrics = {
      retweet_count: apiTweet.retweetCount || 0,
      reply_count: apiTweet.replyCount || 0,
      like_count: apiTweet.likeCount || 0,
      quote_count: apiTweet.quoteCount || 0,
      view_count: apiTweet.viewCount || 0,
      bookmark_count: apiTweet.bookmarkCount || 0,
    };

    // 4. Update metrics in twitter_tweets table
    await updateTweetEngagement(tweetDbId, metrics);

    // 5. Create engagement snapshot for history
    await createEngagementSnapshot(tweetDbId, metrics);
    result.snapshot_created = true;

    // 6. Update tracking tier based on age
    await updateTrackingTier(tweetDbId, new Date(tweet.twitter_created_at));
    result.tier_updated = true;

    // 7. Success!
    result.success = true;
    result.metrics = metrics;

    logger.debug(`Successfully updated engagement for tweet ${tweet.tweet_id}`, {
      total_engagement: metrics.retweet_count + metrics.reply_count + metrics.like_count + metrics.quote_count,
    });

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error updating engagement for tweet ${tweetDbId}:`, error);
    return result;
  }
}

/**
 * Update engagement metrics for a batch of tweets
 * Uses batch API calls for better performance
 */
export async function updateBatchTweetEngagement(
  limit = 100
): Promise<BatchUpdateResult> {
  const startTime = Date.now();

  const result: BatchUpdateResult = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    duration_ms: 0,
    results: [],
    stats: {
      api_calls: 0,
      tweets_per_call: 0,
      avg_latency_ms: 0,
    },
  };

  try {
    // 1. Get tweets that need updating (based on tier and schedule)
    const trackingRecords = await getTweetsForEngagementUpdate(limit);
    
    if (trackingRecords.length === 0) {
      logger.info("No tweets due for engagement update");
      result.duration_ms = Date.now() - startTime;
      return result;
    }

    result.total = trackingRecords.length;
    logger.info(`Starting batch update for ${trackingRecords.length} tweets`);

    // 2. Get full tweet data (need tweet_id for API call)
    const supabase = createAdminClient();
    const tweetDbIds = trackingRecords.map(r => r.tweet_db_id);
    
    const { data: tweets, error } = await supabase
      .from("twitter_tweets")
      .select("id, tweet_id, twitter_created_at")
      .in("id", tweetDbIds);

    if (error || !tweets) {
      throw new Error("Failed to fetch tweets from database");
    }

    // 3. Process in batches (10-20 tweets per API call)
    const BATCH_SIZE = 20; // Can be adjusted based on API limits
    const batches: Array<typeof tweets> = [];
    
    for (let i = 0; i < tweets.length; i += BATCH_SIZE) {
      batches.push(tweets.slice(i, i + BATCH_SIZE));
    }

    logger.info(`Processing ${batches.length} batches (${BATCH_SIZE} tweets per batch)`);

    // 4. Process each batch
    let totalApiLatency = 0;

    for (const batch of batches) {
      const batchStartTime = Date.now();
      
      try {
        // Call batch API
        const tweetIds = batch.map(t => t.tweet_id);
        const apiTweets = await twitterApi.getTweetsByIds(tweetIds);
        
        result.stats.api_calls++;
        totalApiLatency += Date.now() - batchStartTime;

        // Create a map for quick lookup
        const apiTweetMap = new Map<string, TwitterAPITweet>();
        apiTweets.forEach((t: TwitterAPITweet) => apiTweetMap.set(t.id, t));

        // Update each tweet
        for (const tweet of batch) {
          const apiTweet = apiTweetMap.get(tweet.tweet_id);

          if (!apiTweet) {
            // Tweet not found in API response (deleted or private)
            result.skipped++;
            await markTweetAsCold(tweet.id);
            
            result.results.push({
              success: false,
              tweetId: tweet.id,
              error: "Tweet not found in API (deleted or private)",
              snapshot_created: false,
              tier_updated: false,
            });
            continue;
          }

          // Update metrics
          const metrics = {
            retweet_count: apiTweet.retweetCount || 0,
            reply_count: apiTweet.replyCount || 0,
            like_count: apiTweet.likeCount || 0,
            quote_count: apiTweet.quoteCount || 0,
            view_count: apiTweet.viewCount || 0,
            bookmark_count: apiTweet.bookmarkCount || 0,
          };

          try {
            await updateTweetEngagement(tweet.id, metrics);
            await createEngagementSnapshot(tweet.id, metrics);
            await updateTrackingTier(tweet.id, new Date(tweet.twitter_created_at));

            result.successful++;
            result.results.push({
              success: true,
              tweetId: tweet.id,
              metrics,
              snapshot_created: true,
              tier_updated: true,
            });
          } catch (updateError) {
            result.failed++;
            result.results.push({
              success: false,
              tweetId: tweet.id,
              error: updateError instanceof Error ? updateError.message : "Update failed",
              snapshot_created: false,
              tier_updated: false,
            });
          }
        }

        // Small delay between batches to avoid rate limiting
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (batchError) {
        logger.error(`Error processing batch:`, batchError);
        
        // Mark all tweets in this batch as failed
        for (const tweet of batch) {
          result.failed++;
          result.results.push({
            success: false,
            tweetId: tweet.id,
            error: batchError instanceof Error ? batchError.message : "Batch processing failed",
            snapshot_created: false,
            tier_updated: false,
          });
        }
      }
    }

    // 5. Calculate stats
    result.duration_ms = Date.now() - startTime;
    result.stats.tweets_per_call = result.total / result.stats.api_calls;
    result.stats.avg_latency_ms = totalApiLatency / result.stats.api_calls;

    logger.info("Batch update completed", {
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      skipped: result.skipped,
      duration_ms: result.duration_ms,
      api_calls: result.stats.api_calls,
      avg_latency_ms: result.stats.avg_latency_ms,
    });

    return result;
  } catch (error) {
    logger.error("Error in batch engagement update:", error);
    result.duration_ms = Date.now() - startTime;
    return result;
  }
}

/**
 * Force update engagement for a specific tweet (for manual UI refresh)
 * Bypasses the tier system and updates immediately
 */
export async function forceUpdateTweetEngagement(
  tweetDbId: string
): Promise<UpdateResult> {
  logger.info(`Force updating engagement for tweet ${tweetDbId}`);
  
  // Use the same logic as single update
  const result = await updateSingleTweetEngagement(tweetDbId);
  
  if (result.success) {
    logger.info(`Force update successful for tweet ${tweetDbId}`);
  } else {
    logger.warn(`Force update failed for tweet ${tweetDbId}: ${result.error}`);
  }
  
  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Update tracking tier based on tweet age
 * 
 * Strategy: Track every hour for 6 hours (6 updates total)
 * - 0-6h: Update every hour (6 snapshots)
 * - 6h+: Stop tracking (cold)
 */
async function updateTrackingTier(
  tweetDbId: string,
  tweetCreatedAt: Date
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Calculate tweet age in hours
    const ageHours = (Date.now() - tweetCreatedAt.getTime()) / (1000 * 60 * 60);

    // Determine tier and next update time
    let tier: "ultra_hot" | "hot" | "warm" | "cold";
    let nextUpdateAt: Date | null = new Date();

    // Simplified tier system: track every hour for 6 hours
    if (ageHours < 6) {
      tier = "hot"; // Active tracking
      nextUpdateAt.setHours(nextUpdateAt.getHours() + 1);
    } else {
      tier = "cold"; // Stop tracking after 6 hours
      nextUpdateAt = null;
    }

    // Update tracking record
    const { error } = await supabase
      .from("twitter_engagement_tracking")
      .update({
        tier,
        next_update_at: nextUpdateAt?.toISOString() || null,
        last_updated_at: new Date().toISOString(),
      })
      .eq("tweet_db_id", tweetDbId);

    if (error) {
      throw error;
    }

    // Increment update count
    await supabase.rpc("increment_update_count", {
      tweet_id: tweetDbId,
      }).catch(() => {
      // Fallback if RPC doesn't exist - manually increment
      supabase
        .from("twitter_engagement_tracking")
        .select("update_count")
        .eq("tweet_db_id", tweetDbId)
        .single()
        .then(({ data }: { data: { update_count: number } | null }) => {
          if (data) {
            supabase
              .from("twitter_engagement_tracking")
              .update({ update_count: data.update_count + 1 })
              .eq("tweet_db_id", tweetDbId);
          }
        });
    });

    logger.debug(`Updated tracking tier for tweet ${tweetDbId}: ${tier}`);
  } catch (error) {
    logger.error(`Error updating tracking tier for ${tweetDbId}:`, error);
  }
}

/**
 * Mark a tweet as cold (stop tracking)
 * Used when a tweet is deleted or no longer accessible
 */
async function markTweetAsCold(tweetDbId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("twitter_engagement_tracking")
      .update({
        tier: "cold",
        next_update_at: null,
        last_updated_at: new Date().toISOString(),
      })
      .eq("tweet_db_id", tweetDbId);

    if (error) {
      throw error;
    }

    logger.info(`Marked tweet ${tweetDbId} as cold (no longer tracked)`);
  } catch (error) {
    logger.error(`Error marking tweet ${tweetDbId} as cold:`, error);
  }
}

/**
 * Get statistics about current engagement tracking
 */
export async function getEngagementTrackingStats(): Promise<{
  total: number;
  ultra_hot: number;
  hot: number;
  warm: number;
  cold: number;
  next_batch_size: number;
  next_batch_due: Date | null;
}> {
  try {
    const supabase = createAdminClient();

    // Count by tier
    const { data: stats } = await supabase
      .from("twitter_engagement_tracking")
      .select("tier");

    const tierCounts = {
      total: stats?.length || 0,
      ultra_hot: 0,
      hot: 0,
      warm: 0,
      cold: 0,
    };

    stats?.forEach((record: { tier: string }) => {
      if (record.tier === "ultra_hot") tierCounts.ultra_hot++;
      else if (record.tier === "hot") tierCounts.hot++;
      else if (record.tier === "warm") tierCounts.warm++;
      else if (record.tier === "cold") tierCounts.cold++;
    });

    // Get next batch info
    const dueTweets = await getTweetsForEngagementUpdate(1000);
    const nextBatchSize = dueTweets.length;
    
    let nextBatchDue: Date | null = null;
    if (dueTweets.length > 0 && dueTweets[0].next_update_at) {
      nextBatchDue = new Date(dueTweets[0].next_update_at);
    }

    return {
      ...tierCounts,
      next_batch_size: nextBatchSize,
      next_batch_due: nextBatchDue,
    };
  } catch (error) {
    logger.error("Error fetching engagement tracking stats:", error);
    return {
      total: 0,
      ultra_hot: 0,
      hot: 0,
      warm: 0,
      cold: 0,
      next_batch_size: 0,
      next_batch_due: null,
    };
  }
}

