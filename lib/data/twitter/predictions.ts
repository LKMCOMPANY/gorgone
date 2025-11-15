/**
 * Twitter Engagement Predictions
 * Calculates velocity-based predictions for tweet engagement evolution
 * Simple, robust, production-ready algorithm
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getEngagementHistory } from "@/lib/data/twitter/engagement";
import type {
  TwitterEngagementHistory,
  MetricPrediction,
  TweetPredictions,
} from "@/types";

/**
 * Calculate velocity for a specific metric type
 * Returns average change per hour based on historical snapshots
 */
function calculateVelocityForMetric(
  snapshots: TwitterEngagementHistory[],
  metricKey: keyof Pick<TwitterEngagementHistory, 'like_count' | 'retweet_count' | 'reply_count' | 'quote_count' | 'view_count'>
): number {
  if (snapshots.length < 2) return 0;

  let totalDelta = 0;
  let totalHours = 0;

  for (let i = 1; i < snapshots.length; i++) {
    const currentValue = snapshots[i][metricKey] || 0;
    const previousValue = snapshots[i - 1][metricKey] || 0;
    const delta = currentValue - previousValue;

    const currentTime = new Date(snapshots[i].snapshot_at).getTime();
    const previousTime = new Date(snapshots[i - 1].snapshot_at).getTime();
    const hours = (currentTime - previousTime) / (1000 * 60 * 60);

    totalDelta += delta;
    totalHours += hours;
  }

  return totalHours > 0 ? totalDelta / totalHours : 0;
}

/**
 * Predict future values for a single metric
 * Uses simple linear extrapolation based on velocity
 */
function predictMetric(current: number, velocity: number): MetricPrediction {
  // Predictions for next 3 hours
  const p1h = Math.max(current, Math.round(current + velocity * 1));
  const p2h = Math.max(current, Math.round(current + velocity * 2));
  const p3h = Math.max(current, Math.round(current + velocity * 3));

  return {
    current,
    velocity: Math.round(velocity * 100) / 100, // Round to 2 decimals
    p1h,
    p2h,
    p3h,
  };
}

/**
 * Calculate complete predictions for a tweet
 * Based on engagement history snapshots
 */
export async function calculateTweetPredictions(
  tweetId: string
): Promise<TweetPredictions | null> {
  try {
    // Fetch engagement history (snapshots)
    const snapshots = await getEngagementHistory(tweetId);

    // Need at least 2 snapshots to calculate velocity
    if (snapshots.length < 2) {
      logger.debug(`Not enough snapshots for tweet ${tweetId} (${snapshots.length}/2 minimum)`);
      return null;
    }

    // Get current values from latest snapshot
    const latest = snapshots[snapshots.length - 1];

    // Calculate velocities for each metric type
    const velocityLikes = calculateVelocityForMetric(snapshots, 'like_count');
    const velocityRetweets = calculateVelocityForMetric(snapshots, 'retweet_count');
    const velocityReplies = calculateVelocityForMetric(snapshots, 'reply_count');
    const velocityQuotes = calculateVelocityForMetric(snapshots, 'quote_count');
    const velocityViews = calculateVelocityForMetric(snapshots, 'view_count');

    // Generate predictions for each metric
    const predictions: TweetPredictions = {
      calculated_at: new Date().toISOString(),
      snapshots_used: snapshots.length,
      confidence: Math.min(0.9, snapshots.length / 6), // Max confidence at 6 snapshots

      engagement: {
        likes: predictMetric(latest.like_count || 0, velocityLikes),
        retweets: predictMetric(latest.retweet_count || 0, velocityRetweets),
        replies: predictMetric(latest.reply_count || 0, velocityReplies),
        quotes: predictMetric(latest.quote_count || 0, velocityQuotes),
      },

      reach: {
        views: predictMetric(latest.view_count || 0, velocityViews),
      },

      model_version: 'velocity_linear_v1',
    };

    logger.debug(`Predictions calculated for tweet ${tweetId}`, {
      snapshots: snapshots.length,
      confidence: predictions.confidence,
    });

    return predictions;
  } catch (error) {
    logger.error(`Error calculating predictions for tweet ${tweetId}:`, error);
    return null;
  }
}

/**
 * Store predictions in database (twitter_tweets.predictions JSONB)
 */
export async function storeTweetPredictions(
  tweetId: string,
  predictions: TweetPredictions
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("twitter_tweets")
      .update({ predictions })
      .eq("id", tweetId);

    if (error) throw error;

    logger.debug(`Predictions stored for tweet ${tweetId}`);
  } catch (error) {
    logger.error(`Error storing predictions for tweet ${tweetId}:`, error);
  }
}

/**
 * Calculate and store predictions for a tweet
 * Main function called from worker
 */
export async function calculateAndStoreTweetPredictions(
  tweetId: string
): Promise<TweetPredictions | null> {
  try {
    const predictions = await calculateTweetPredictions(tweetId);

    if (predictions) {
      await storeTweetPredictions(tweetId, predictions);
      return predictions;
    }

    return null;
  } catch (error) {
    logger.error(`Error calculating and storing predictions for ${tweetId}:`, error);
    return null;
  }
}

/**
 * Get predictions for a tweet (from database)
 */
export async function getTweetPredictions(
  tweetId: string
): Promise<TweetPredictions | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_tweets")
      .select("predictions")
      .eq("id", tweetId)
      .single();

    if (error || !data) return null;

    return data.predictions as TweetPredictions | null;
  } catch (error) {
    logger.error(`Error fetching predictions for tweet ${tweetId}:`, error);
    return null;
  }
}

