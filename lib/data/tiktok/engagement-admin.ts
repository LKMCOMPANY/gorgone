/**
 * TikTok Engagement Admin Functions
 * Admin versions of engagement functions for cron jobs
 * Uses createAdminClient() to bypass RLS
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { EngagementTier } from "./engagement";

/**
 * Get videos due for engagement update (admin version for cron)
 */
export async function getVideosDueForUpdateAdmin(limit = 20): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("tiktok_engagement_tracking")
      .select("video_db_id")
      .or(`next_update_at.is.null,next_update_at.lte.${now}`)
      .order("next_update_at", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (error) {
      logger.error("Error fetching videos due for update:", error);
      throw error;
    }

    return (data || []).map((row) => row.video_db_id);
  } catch (error) {
    logger.error("Error in getVideosDueForUpdateAdmin:", error);
    throw error;
  }
}

/**
 * Update tracking tier (admin version for cron)
 */
export async function updateTrackingTierAdmin(
  videoDbId: string,
  tier: EngagementTier
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("tiktok_engagement_tracking")
      .update({ tier })
      .eq("video_db_id", videoDbId);

    if (error) {
      logger.error(`Error updating tracking tier for video ${videoDbId}:`, error);
      throw error;
    }
  } catch (error) {
    logger.error("Error in updateTrackingTierAdmin:", error);
    throw error;
  }
}

/**
 * Increment update count (admin version for cron)
 */
export async function incrementUpdateCountAdmin(videoDbId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.rpc("increment_tiktok_video_update_count", {
      video_id: videoDbId,
    });

    if (error) {
      logger.error(`Error incrementing update count for video ${videoDbId}:`, error);
      throw error;
    }
  } catch (error) {
    logger.error("Error in incrementUpdateCountAdmin:", error);
    throw error;
  }
}

/**
 * Create engagement snapshot (admin version for cron)
 */
export async function createEngagementSnapshotAdmin(
  videoId: string,
  stats: {
    play_count: number;
    digg_count: number;
    comment_count: number;
    share_count: number;
    collect_count: number;
  },
  deltas: {
    delta_play_count: number;
    delta_digg_count: number;
    delta_comment_count: number;
    delta_share_count: number;
    delta_collect_count: number;
  },
  velocity?: number
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("tiktok_engagement_history")
      .insert({
        video_id: videoId,
        ...stats,
        ...deltas,
        engagement_velocity: velocity,
      });

    if (error) {
      logger.error("Error creating engagement snapshot:", error);
      throw error;
    }
  } catch (error) {
    logger.error("Error in createEngagementSnapshotAdmin:", error);
    throw error;
  }
}

/**
 * Get engagement history (admin version for predictions in cron)
 */
export async function getEngagementHistoryAdmin(
  videoId: string,
  limit = 50
): Promise<any[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("tiktok_engagement_history")
      .select("*")
      .eq("video_id", videoId)
      .order("snapshot_at", { ascending: true })
      .limit(limit);

    if (error) {
      logger.error(`Error fetching engagement history for video ${videoId}:`, error);
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error("Error in getEngagementHistoryAdmin:", error);
    throw error;
  }
}

