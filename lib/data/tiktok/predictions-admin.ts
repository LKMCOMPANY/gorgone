/**
 * TikTok Predictions Admin Functions
 * Admin version for cron jobs
 */

import { logger } from "@/lib/logger";
import { calculateVideoPredictions, storeVideoPredictions } from "./predictions";
import { getEngagementHistoryAdmin } from "./engagement-admin";
import { createAdminClient } from "@/lib/supabase/admin";

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
function predictMetric(current: number, velocity: number) {
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
 * Calculate and store predictions (admin version for cron)
 */
export async function calculateAndStoreVideoPredictionsAdmin(
  videoDbId: string
): Promise<void> {
  try {
    // Get video_id from video_db_id
    const supabase = createAdminClient();
    const { data: video, error: videoError } = await supabase
      .from("tiktok_videos")
      .select("video_id")
      .eq("id", videoDbId)
      .single();

    if (videoError || !video) {
      logger.debug(`Video ${videoDbId} not found for predictions`);
      return;
    }

    const videoId = video.video_id;

    // Fetch engagement history
    const snapshots = await getEngagementHistoryAdmin(videoId);

    // Need at least 2 snapshots to calculate velocity
    if (snapshots.length < 2) {
      logger.debug(`Not enough snapshots for video ${videoId} (${snapshots.length}/2 minimum)`);
      return;
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
    const predictions = {
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

    // Store predictions
    await storeVideoPredictions(videoId, predictions as any);

    logger.debug(`Predictions calculated and stored for video ${videoId}`, {
      snapshots: snapshots.length,
      confidence: predictions.confidence,
    });
  } catch (error) {
    logger.error(`Error in calculateAndStoreVideoPredictionsAdmin for video ${videoDbId}:`, error);
    // Don't throw - predictions are optional
  }
}

