/**
 * Twitter Engagement History API
 * GET /api/twitter/engagement/[tweetId]
 * 
 * Fetches complete engagement history for a tweet:
 * - Initial tweet metrics (collected_at point)
 * - All engagement snapshots (historical data)
 * - Predictions for next 3 hours
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { 
  TwitterTweet, 
  TwitterEngagementHistory,
  TweetPredictions 
} from "@/types";

export const dynamic = "force-dynamic";

interface EngagementDataPoint {
  timestamp: string;
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  view_count: number;
  total_engagement: number;
  type: "initial" | "snapshot" | "prediction";
}

interface EngagementHistoryResponse {
  success: boolean;
  tweet: {
    id: string;
    tweet_id: string;
    twitter_created_at: string;
    collected_at: string;
  } | null;
  initial_metrics: EngagementDataPoint | null;
  snapshots: EngagementDataPoint[];
  predictions: TweetPredictions | null;
  tracking_status?: {
    tier: string;
    update_count: number;
    last_updated_at: string;
  } | null;
  error?: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tweetId: string }> }
) {
  try {
    const { tweetId } = await context.params;

    if (!tweetId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing tweetId parameter",
          tweet: null,
          initial_metrics: null,
          snapshots: [],
          predictions: null,
        } as EngagementHistoryResponse,
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch tweet with current metrics and predictions
    const { data: tweet, error: tweetError } = await supabase
      .from("twitter_tweets")
      .select("id, tweet_id, twitter_created_at, collected_at, retweet_count, reply_count, like_count, quote_count, view_count, total_engagement, predictions")
      .eq("id", tweetId)
      .single();

    if (tweetError || !tweet) {
      logger.error(`Tweet not found: ${tweetId}`, tweetError);
      return NextResponse.json(
        {
          success: false,
          error: "Tweet not found",
          tweet: null,
          initial_metrics: null,
          snapshots: [],
          predictions: null,
        } as EngagementHistoryResponse,
        { status: 404 }
      );
    }

    // Fetch all engagement snapshots
    const { data: snapshots, error: snapshotsError } = await supabase
      .from("twitter_engagement_history")
      .select("*")
      .eq("tweet_id", tweetId)
      .order("snapshot_at", { ascending: true });

    if (snapshotsError) {
      logger.error(`Error fetching snapshots for tweet ${tweetId}:`, snapshotsError);
    }

    // Transform snapshots to data points
    const snapshotDataPoints: EngagementDataPoint[] = (snapshots || []).map((snapshot: TwitterEngagementHistory) => ({
      timestamp: snapshot.snapshot_at,
      retweet_count: snapshot.retweet_count,
      reply_count: snapshot.reply_count,
      like_count: snapshot.like_count,
      quote_count: snapshot.quote_count,
      view_count: snapshot.view_count,
      total_engagement: snapshot.total_engagement,
      type: "snapshot" as const,
    }));

    // Create initial data point logic:
    // If we have snapshots, we don't want to use the CURRENT tweet metrics as the "initial" point
    // because tweet.* metrics are updated to current values, while collected_at is in the past.
    // This causes a graph artifact where it starts high (current value at old date), drops to first snapshot, then rises.
    
    let initialMetrics: EngagementDataPoint | null = null;

    if (snapshotDataPoints.length === 0) {
      // Only use current metrics as initial point if we have NO history yet
      initialMetrics = {
        timestamp: tweet.collected_at,
        retweet_count: tweet.retweet_count,
        reply_count: tweet.reply_count,
        like_count: tweet.like_count,
        quote_count: tweet.quote_count,
        view_count: tweet.view_count,
        total_engagement: tweet.total_engagement,
        type: "initial",
      };
    } else {
        // If we have snapshots, check if the first snapshot is significantly later than collected_at
        // If so, we might want an initial point at 0 or at the first snapshot value
        // For now, let's just omit the artificial initial point to avoid the "drop" artifact
        initialMetrics = null;
    }

    // Fetch tracking status
    const { data: trackingStatus } = await supabase
      .from("twitter_engagement_tracking")
      .select("tier, update_count, last_updated_at")
      .eq("tweet_db_id", tweetId)
      .single();

    const response: EngagementHistoryResponse = {
      success: true,
      tweet: {
        id: tweet.id,
        tweet_id: tweet.tweet_id,
        twitter_created_at: tweet.twitter_created_at,
        collected_at: tweet.collected_at,
      },
      initial_metrics: initialMetrics,
      snapshots: snapshotDataPoints,
      predictions: tweet.predictions as TweetPredictions | null,
      tracking_status: trackingStatus ? {
        tier: trackingStatus.tier,
        update_count: trackingStatus.update_count,
        last_updated_at: trackingStatus.last_updated_at,
      } : null,
    };

    logger.debug(`Engagement history fetched for tweet ${tweetId}: ${snapshotDataPoints.length} snapshots`);

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Engagement history API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch engagement history",
        tweet: null,
        initial_metrics: null,
        snapshots: [],
        predictions: null,
      } as EngagementHistoryResponse,
      { status: 500 }
    );
  }
}

