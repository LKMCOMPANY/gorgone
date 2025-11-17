/**
 * Manual Engagement Snapshot API
 * POST /api/twitter/engagement/snapshot
 * 
 * Triggers a manual engagement snapshot for a tweet
 * Fetches fresh data from TwitterAPI.io and updates database
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTweetsByIds } from "@/lib/api/twitter";
import { createEngagementSnapshot } from "@/lib/data/twitter/engagement";
import { calculateAndStoreTweetPredictions } from "@/lib/data/twitter/predictions";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface SnapshotRequest {
  tweet_id: string; // Internal database ID
}

interface SnapshotResponse {
  success: boolean;
  message?: string;
  snapshot?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    view_count: number;
    snapshot_at: string;
  };
  predictions_updated?: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SnapshotRequest;
    const { tweet_id } = body;

    if (!tweet_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing tweet_id in request body",
        } as SnapshotResponse,
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch tweet from database
    const { data: tweet, error: tweetError } = await supabase
      .from("twitter_tweets")
      .select("id, tweet_id, zone_id")
      .eq("id", tweet_id)
      .single();

    if (tweetError || !tweet) {
      logger.error(`Tweet not found: ${tweet_id}`, tweetError);
      return NextResponse.json(
        {
          success: false,
          error: "Tweet not found",
        } as SnapshotResponse,
        { status: 404 }
      );
    }

    // Fetch fresh tweet data from TwitterAPI.io (using batch endpoint)
    let freshTweetData;
    try {
      const tweets = await getTweetsByIds([tweet.tweet_id]);
      freshTweetData = tweets.length > 0 ? tweets[0] : null;
    } catch (apiError) {
      logger.error(`Failed to fetch tweet from Twitter API: ${tweet.tweet_id}`, apiError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch fresh data from Twitter API",
        } as SnapshotResponse,
        { status: 503 }
      );
    }

    if (!freshTweetData) {
      logger.warn(`Tweet ${tweet.tweet_id} not found on Twitter (deleted, suspended, or private)`);
      return NextResponse.json(
        {
          success: false,
          error: "Tweet not found on Twitter (deleted, account suspended, or private)",
        } as SnapshotResponse,
        { status: 404 }
      );
    }

    // Extract engagement metrics from API response
    const metrics = {
      retweet_count: freshTweetData.retweetCount || 0,
      reply_count: freshTweetData.replyCount || 0,
      like_count: freshTweetData.likeCount || 0,
      quote_count: freshTweetData.quoteCount || 0,
      view_count: freshTweetData.viewCount || 0,
      bookmark_count: freshTweetData.bookmarkCount || 0,
    };

    // Create engagement snapshot
    await createEngagementSnapshot(tweet.id, metrics);

    // Update current tweet metrics
    const { error: updateError } = await supabase
      .from("twitter_tweets")
      .update({
        retweet_count: metrics.retweet_count,
        reply_count: metrics.reply_count,
        like_count: metrics.like_count,
        quote_count: metrics.quote_count,
        view_count: metrics.view_count,
        bookmark_count: metrics.bookmark_count,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tweet.id);

    if (updateError) {
      logger.error(`Failed to update tweet metrics: ${tweet.id}`, updateError);
    }

    // Recalculate predictions based on new snapshot
    let predictionsUpdated = false;
    try {
      const predictions = await calculateAndStoreTweetPredictions(tweet.id);
      predictionsUpdated = predictions !== null;
    } catch (predError) {
      logger.error(`Failed to calculate predictions for tweet ${tweet.id}:`, predError);
    }

    const snapshotTime = new Date().toISOString();

    logger.info(`Manual snapshot created for tweet ${tweet.tweet_id}`, {
      tweet_id: tweet.tweet_id,
      metrics,
      predictions_updated: predictionsUpdated,
    });

    return NextResponse.json({
      success: true,
      message: "Engagement snapshot created successfully",
      snapshot: {
        ...metrics,
        snapshot_at: snapshotTime,
      },
      predictions_updated: predictionsUpdated,
    } as SnapshotResponse);
  } catch (error) {
    logger.error("Snapshot API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create engagement snapshot",
      } as SnapshotResponse,
      { status: 500 }
    );
  }
}

