/**
 * Twitter Engagement Lot Tracker
 * Processes engagement updates for a specific lot of tweets
 * Called by QStash 1h, 2h, 3h, 4h, 5h, 6h after webhook reception
 * 
 * POST /api/twitter/engagement/track-lot
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import * as twitterApi from "@/lib/api/twitter/client";
import { updateTweetEngagement } from "@/lib/data/twitter/tweets";
import { createEngagementSnapshot } from "@/lib/data/twitter/engagement";
import { getZoneEngagementThreshold } from "@/lib/data/twitter/zone-stats";
import { calculateAndStoreTweetPredictions } from "@/lib/data/twitter/predictions";
import { Client } from "@upstash/qstash";

// QStash client for scheduling next updates
const qstash = new Client({
  token: env.qstash.token,
});

interface TrackLotPayload {
  lotId: string;
  tweetDbIds: string[];
  updateNumber: number;
  zoneId: string;
}

interface ProcessedTweet {
  tweetDbId: string;
  twitterTweetId: string;
  shouldContinue: boolean;
  reason: string;
  newEngagement: number;
  delta: number;
}

/**
 * POST /api/twitter/engagement/track-lot
 * Process engagement updates for a specific lot of tweets
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // =====================================================
    // SECURITY: Verify request is from QStash
    // =====================================================
    
    const qstashSignature = request.headers.get("upstash-signature");
    
    if (!qstashSignature) {
      // Allow manual testing with Bearer token
      const authHeader = request.headers.get("authorization");
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        logger.warn("Unauthorized track-lot request");
        return NextResponse.json(
          { error: "Unauthorized: Missing QStash signature or auth token" },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      if (token !== env.twitter.apiKey) {
        return NextResponse.json(
          { error: "Unauthorized: Invalid API key" },
          { status: 401 }
        );
      }
    }

    // =====================================================
    // PARSE PAYLOAD
    // =====================================================

    const payload: TrackLotPayload = await request.json();

    if (!payload.tweetDbIds || !Array.isArray(payload.tweetDbIds) || payload.tweetDbIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: tweetDbIds required" },
        { status: 400 }
      );
    }

    const { lotId, tweetDbIds, updateNumber, zoneId } = payload;

    logger.info(`Processing lot ${lotId} - Update #${updateNumber} - ${tweetDbIds.length} tweets`);

    // =====================================================
    // FETCH TWEETS FROM DATABASE
    // =====================================================

    const supabase = createAdminClient();

    const { data: tweets, error: fetchError } = await supabase
      .from("twitter_tweets")
      .select("id, tweet_id, twitter_created_at, retweet_count, reply_count, like_count, quote_count, view_count, bookmark_count, total_engagement")
      .in("id", tweetDbIds);

    if (fetchError || !tweets) {
      throw new Error("Failed to fetch tweets from database");
    }

    logger.debug(`Fetched ${tweets.length} tweets from database`);

    // =====================================================
    // GET ZONE THRESHOLD (cached)
    // =====================================================

    const zoneThreshold = await getZoneEngagementThreshold(zoneId);
    logger.debug(`Zone threshold for ${zoneId}: ${zoneThreshold}`);

    // =====================================================
    // FETCH FRESH METRICS FROM TWITTER API (BATCH)
    // =====================================================

    const twitterIds = tweets.map(t => t.tweet_id);
    const apiTweets = await twitterApi.getTweetsByIds(twitterIds);

    // Create lookup map
    const apiTweetMap = new Map();
    apiTweets.forEach(t => apiTweetMap.set(t.id, t));

    logger.debug(`Fetched ${apiTweets.length} tweets from Twitter API`);

    // =====================================================
    // PROCESS EACH TWEET
    // =====================================================

    const processedTweets: ProcessedTweet[] = [];
    const activeTweetIds: string[] = [];

    for (const tweet of tweets) {
      const apiTweet = apiTweetMap.get(tweet.tweet_id);

      // Tweet not found in API (deleted or private)
      if (!apiTweet) {
        logger.warn(`Tweet ${tweet.tweet_id} not found in API, marking as cold`);
        
        await markTweetAsCold(tweet.id, "deleted_or_private");
        
        processedTweets.push({
          tweetDbId: tweet.id,
          twitterTweetId: tweet.tweet_id,
          shouldContinue: false,
          reason: "deleted_or_private",
          newEngagement: 0,
          delta: 0,
        });
        continue;
      }

      // Calculate new metrics
      const newEngagement = 
        (apiTweet.retweetCount || 0) +
        (apiTweet.replyCount || 0) +
        (apiTweet.likeCount || 0) +
        (apiTweet.quoteCount || 0);

      const delta = newEngagement - (tweet.total_engagement || 0);
      const tweetAgeHours = (Date.now() - new Date(tweet.twitter_created_at).getTime()) / (1000 * 60 * 60);

      // =====================================================
      // DECISION: Continue or Stop?
      // =====================================================

      const shouldContinue = decideTracking(
        newEngagement,
        tweet.total_engagement || 0,
        delta,
        tweetAgeHours,
        zoneThreshold
      );

      // Update metrics in database
      const metrics = {
        retweet_count: apiTweet.retweetCount || 0,
        reply_count: apiTweet.replyCount || 0,
        like_count: apiTweet.likeCount || 0,
        quote_count: apiTweet.quoteCount || 0,
        view_count: apiTweet.viewCount || 0,
        bookmark_count: apiTweet.bookmarkCount || 0,
      };

      await updateTweetEngagement(tweet.id, metrics);

      // Create engagement snapshot for history
      await createEngagementSnapshot(tweet.id, metrics);

      // Calculate and store predictions (if enough snapshots)
      await calculateAndStoreTweetPredictions(tweet.id);

      // Update tracking status
      if (shouldContinue.continue) {
        await updateTrackingStatus(tweet.id, "hot", updateNumber);
        activeTweetIds.push(tweet.id);
      } else {
        await markTweetAsCold(tweet.id, shouldContinue.reason);
      }

      processedTweets.push({
        tweetDbId: tweet.id,
        twitterTweetId: tweet.tweet_id,
        shouldContinue: shouldContinue.continue,
        reason: shouldContinue.reason,
        newEngagement,
        delta,
      });

      logger.debug(`Tweet ${tweet.tweet_id}: engagement=${newEngagement}, delta=${delta}, continue=${shouldContinue.continue}`);
    }

    // =====================================================
    // SCHEDULE NEXT UPDATE (if needed)
    // =====================================================

    const continuingCount = activeTweetIds.length;
    const stoppedCount = processedTweets.length - continuingCount;

    if (continuingCount > 0 && updateNumber < 6) {
      // Schedule next update in 1 hour
      const nextPayload: TrackLotPayload = {
        lotId,
        tweetDbIds: activeTweetIds,
        updateNumber: updateNumber + 1,
        zoneId,
      };

      await qstash.publishJSON({
        url: `${env.appUrl}/api/twitter/engagement/track-lot`,
        body: nextPayload,
        delay: 3600, // 1 hour in seconds
      });

      logger.info(`Scheduled update #${updateNumber + 1} for ${continuingCount} active tweets`);
    } else {
      logger.info(`Lot ${lotId} completed - no more updates needed`);
    }

    // =====================================================
    // RETURN RESULTS
    // =====================================================

    const duration = Date.now() - startTime;

    logger.info(`Lot ${lotId} processed`, {
      updateNumber,
      total: processedTweets.length,
      continuing: continuingCount,
      stopped: stoppedCount,
      duration_ms: duration,
    });

    return NextResponse.json({
      success: true,
      lotId,
      updateNumber,
      results: {
        total: processedTweets.length,
        continuing: continuingCount,
        stopped: stoppedCount,
        duration_ms: duration,
      },
      nextUpdate: continuingCount > 0 && updateNumber < 6 
        ? { scheduled: true, updateNumber: updateNumber + 1, tweetsCount: continuingCount }
        : null,
    });

  } catch (error) {
    logger.error("Error processing engagement lot:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DECISION LOGIC
// ============================================================================

/**
 * Decide if tracking should continue for a tweet
 * Simple, clear rule with 3 conditions
 */
function decideTracking(
  currentEngagement: number,
  previousEngagement: number,
  delta: number,
  ageHours: number,
  zoneThreshold: number
): { continue: boolean; reason: string } {
  // 1. Absolute limit: 6 hours max
  if (ageHours >= 6) {
    return { continue: false, reason: "age_limit_6h" };
  }

  // 2. If engagement increased: CONTINUE
  if (delta > 0) {
    return { continue: true, reason: "delta_positive" };
  }

  // 3. If above zone threshold: CONTINUE (give it a chance)
  if (currentEngagement >= zoneThreshold) {
    return { continue: true, reason: "above_threshold" };
  }

  // 4. Otherwise: STOP (confirmed dead)
  return { continue: false, reason: "no_change_below_threshold" };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Mark tweet as cold (stop tracking)
 */
async function markTweetAsCold(
  tweetDbId: string,
  reason: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase
      .from("twitter_engagement_tracking")
      .update({
        tier: "cold",
        next_update_at: null,
        last_updated_at: new Date().toISOString(),
      })
      .eq("tweet_db_id", tweetDbId);

    logger.debug(`Tweet ${tweetDbId} marked as cold: ${reason}`);
  } catch (error) {
    logger.error(`Error marking tweet ${tweetDbId} as cold:`, error);
  }
}

/**
 * Update tracking status for active tweet
 */
async function updateTrackingStatus(
  tweetDbId: string,
  tier: "hot",
  updateCount: number
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Next update will be in 1 hour
    const nextUpdateAt = new Date();
    nextUpdateAt.setHours(nextUpdateAt.getHours() + 1);

    await supabase
      .from("twitter_engagement_tracking")
      .update({
        tier,
        next_update_at: nextUpdateAt.toISOString(),
        last_updated_at: new Date().toISOString(),
        update_count: updateCount,
      })
      .eq("tweet_db_id", tweetDbId);

  } catch (error) {
    logger.error(`Error updating tracking status for ${tweetDbId}:`, error);
  }
}

/**
 * GET /api/twitter/engagement/track-lot
 * Health check and info endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    service: "twitter-engagement-lot-tracker",
    description: "Processes engagement updates for a specific lot of tweets",
    timestamp: new Date().toISOString(),
  });
}

