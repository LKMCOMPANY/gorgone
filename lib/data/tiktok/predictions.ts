/**
 * TikTok Engagement Predictions
 * Calculates velocity-based predictions for video engagement evolution
 * Same algorithm as Twitter, adapted for 5 metrics
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getEngagementHistory } from "@/lib/data/tiktok/engagement";

interface MetricPrediction {
  current: number;
  velocity: number;
  p1h: number;
  p2h: number;
  p3h: number;
}

export interface VideoPredictions {
  calculated_at: string;
  snapshots_used: number;
  confidence: number;
  engagement: {
    likes: MetricPrediction;
    comments: MetricPrediction;
    shares: MetricPrediction;
    saves: MetricPrediction;
  };
  reach: {
    views: MetricPrediction;
  };
  model_version: string;
}

/**
 * Calculate velocity for a specific metric
 */
function calculateVelocityForMetric(
  snapshots: any[],
  metricKey: "play_count" | "digg_count" | "comment_count" | "share_count" | "collect_count"
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
 */
function predictMetric(current: number, velocity: number): MetricPrediction {
  const p1h = Math.max(current, Math.round(current + velocity * 1));
  const p2h = Math.max(current, Math.round(current + velocity * 2));
  const p3h = Math.max(current, Math.round(current + velocity * 3));

  return {
    current,
    velocity: Math.round(velocity * 100) / 100,
    p1h,
    p2h,
    p3h,
  };
}

/**
 * Calculate complete predictions for a video
 */
export async function calculateVideoPredictions(
  videoId: string
): Promise<VideoPredictions | null> {
  try {
    // Fetch engagement history
    const snapshots = await getEngagementHistory(videoId);

    // Need at least 2 snapshots to calculate velocity
    if (snapshots.length < 2) {
      logger.debug(`Not enough snapshots for video ${videoId} (${snapshots.length}/2 minimum)`);
      return null;
    }

    // Get current values from latest snapshot
    const latest = snapshots[snapshots.length - 1];

    // Calculate velocities for each metric
    const velocityViews = calculateVelocityForMetric(snapshots, "play_count");
    const velocityLikes = calculateVelocityForMetric(snapshots, "digg_count");
    const velocityComments = calculateVelocityForMetric(snapshots, "comment_count");
    const velocityShares = calculateVelocityForMetric(snapshots, "share_count");
    const velocitySaves = calculateVelocityForMetric(snapshots, "collect_count");

    // Generate predictions
    const predictions: VideoPredictions = {
      calculated_at: new Date().toISOString(),
      snapshots_used: snapshots.length,
      confidence: Math.min(0.9, snapshots.length / 6),

      engagement: {
        likes: predictMetric(latest.digg_count || 0, velocityLikes),
        comments: predictMetric(latest.comment_count || 0, velocityComments),
        shares: predictMetric(latest.share_count || 0, velocityShares),
        saves: predictMetric(latest.collect_count || 0, velocitySaves),
      },

      reach: {
        views: predictMetric(latest.play_count || 0, velocityViews),
      },

      model_version: "velocity_linear_v1",
    };

    logger.debug(`Predictions calculated for video ${videoId}`, {
      snapshots: snapshots.length,
      confidence: predictions.confidence,
    });

    return predictions;
  } catch (error) {
    logger.error(`Error calculating predictions for video ${videoId}:`, error);
    return null;
  }
}

/**
 * Store predictions in database
 */
export async function storeVideoPredictions(
  videoId: string,
  predictions: VideoPredictions
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("tiktok_videos")
      .update({ predictions: predictions as any })
      .eq("id", videoId);

    if (error) throw error;

    logger.debug(`Predictions stored for video ${videoId}`);
  } catch (error) {
    logger.error(`Error storing predictions for video ${videoId}:`, error);
  }
}

/**
 * Calculate and store predictions
 */
export async function calculateAndStoreVideoPredictions(
  videoId: string
): Promise<VideoPredictions | null> {
  try {
    const predictions = await calculateVideoPredictions(videoId);

    if (predictions) {
      await storeVideoPredictions(videoId, predictions);
      return predictions;
    }

    return null;
  } catch (error) {
    logger.error(`Error calculating and storing predictions for ${videoId}:`, error);
    return null;
  }
}

