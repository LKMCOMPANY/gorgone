/**
 * Manual Engagement Refresh API
 * Allows users to manually update engagement metrics for a specific tweet
 * 
 * POST /api/twitter/tweets/[id]/refresh
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/auth/utils";
import { canAccessZone } from "@/lib/auth/permissions";
import { getTweetById } from "@/lib/data/twitter/tweets";
import { forceUpdateTweetEngagement } from "@/lib/data/twitter/engagement-updater";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tweetDbId = params.id;

    // 1. Authentication check
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get tweet to verify it exists and get zone_id
    const tweet = await getTweetById(tweetDbId);
    
    if (!tweet) {
      return NextResponse.json(
        { error: "Tweet not found" },
        { status: 404 }
      );
    }

    // 3. Check if user has access to this zone
    const hasAccess = await canAccessZone(user.id, tweet.zone_id);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this zone" },
        { status: 403 }
      );
    }

    logger.info(`Manual refresh requested for tweet ${tweet.tweet_id} by user ${user.id}`);

    // 4. Force update engagement metrics
    const result = await forceUpdateTweetEngagement(tweetDbId);

    // 5. Return result
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Engagement metrics updated successfully",
        data: {
          tweet_id: tweetDbId,
          twitter_tweet_id: tweet.tweet_id,
          metrics: result.metrics,
          snapshot_created: result.snapshot_created,
          tier_updated: result.tier_updated,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to update engagement metrics",
          data: {
            tweet_id: tweetDbId,
            twitter_tweet_id: tweet.tweet_id,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Error in manual engagement refresh:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/twitter/tweets/[id]/refresh
 * Get current engagement metrics without updating
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tweetDbId = params.id;

    // Authentication check
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get tweet with metrics
    const tweet = await getTweetById(tweetDbId);
    
    if (!tweet) {
      return NextResponse.json(
        { error: "Tweet not found" },
        { status: 404 }
      );
    }

    // Check access
    const hasAccess = await canAccessZone(user.id, tweet.zone_id);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Return current metrics
    return NextResponse.json({
      success: true,
      data: {
        tweet_id: tweetDbId,
        twitter_tweet_id: tweet.tweet_id,
        metrics: {
          retweet_count: tweet.retweet_count,
          reply_count: tweet.reply_count,
          like_count: tweet.like_count,
          quote_count: tweet.quote_count,
          view_count: tweet.view_count,
          bookmark_count: tweet.bookmark_count,
          total_engagement: tweet.total_engagement,
        },
        last_updated: tweet.updated_at,
      },
    });
  } catch (error) {
    logger.error("Error getting engagement metrics:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

