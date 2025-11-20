/**
 * TikTok Engagement Tracking Data Layer
 * Handles engagement snapshots and tiered tracking
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export type EngagementTier = "ultra_hot" | "hot" | "warm" | "cold";

export interface EngagementSnapshot {
  id: string;
  video_id: string;
  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  collect_count: number;
  total_engagement: number;
  delta_play_count: number;
  delta_digg_count: number;
  delta_comment_count: number;
  delta_share_count: number;
  delta_collect_count: number;
  engagement_velocity?: number;
  snapshot_at: string;
  created_at: string;
}

export interface EngagementTracking {
  id: string;
  video_db_id: string;
  tier: EngagementTier;
  last_updated_at: string;
  next_update_at?: string;
  update_count: number;
  created_at: string;
}

/**
 * Create engagement snapshot
 */
export async function createEngagementSnapshot(
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
): Promise<EngagementSnapshot> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_engagement_history")
      .insert({
        video_id: videoId,
        ...stats,
        ...deltas,
        engagement_velocity: velocity,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating engagement snapshot:", error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error("Error in createEngagementSnapshot:", error);
    throw error;
  }
}

/**
 * Get engagement history for a video
 */
export async function getEngagementHistory(
  videoId: string,
  limit = 50
): Promise<EngagementSnapshot[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_engagement_history")
      .select("*")
      .eq("video_id", videoId)
      .order("snapshot_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error(`Error fetching engagement history for ${videoId}:`, error);
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error("Error in getEngagementHistory:", error);
    throw error;
  }
}

/**
 * Start tracking video engagement
 */
export async function startTrackingVideo(
  videoDbId: string,
  tier: EngagementTier = "ultra_hot"
): Promise<EngagementTracking> {
  try {
    const supabase = await createClient();

    // Calculate next_update_at based on tier
    const nextUpdateAt = calculateNextUpdateTime(tier);

    const { data, error } = await supabase
      .from("tiktok_engagement_tracking")
      .insert({
        video_db_id: videoDbId,
        tier,
        next_update_at: nextUpdateAt,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error starting video tracking:", error);
      throw error;
    }

    logger.info(`Started tracking video: ${videoDbId} (tier: ${tier})`);
    return data;
  } catch (error) {
    logger.error("Error in startTrackingVideo:", error);
    throw error;
  }
}

/**
 * Update tracking tier
 */
export async function updateTrackingTier(
  videoDbId: string,
  newTier: EngagementTier
): Promise<void> {
  try {
    const supabase = await createClient();

    const nextUpdateAt = newTier === "cold" ? null : calculateNextUpdateTime(newTier);

    const { error } = await supabase
      .from("tiktok_engagement_tracking")
      .update({
        tier: newTier,
        next_update_at: nextUpdateAt,
        last_updated_at: new Date().toISOString(),
      })
      .eq("video_db_id", videoDbId);

    if (error) {
      logger.error("Error updating tracking tier:", error);
      throw error;
    }
  } catch (error) {
    logger.error("Error in updateTrackingTier:", error);
    throw error;
  }
}

/**
 * Get videos due for engagement update
 */
export async function getVideosDueForUpdate(limit = 20): Promise<string[]> {
  try {
    const supabase = await createClient();

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("tiktok_engagement_tracking")
      .select("video_db_id")
      .neq("tier", "cold")
      .or(`next_update_at.is.null,next_update_at.lte.${now}`)
      .order("next_update_at", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (error) {
      logger.error("Error fetching videos due for update:", error);
      throw error;
    }

    return data?.map((row) => row.video_db_id) || [];
  } catch (error) {
    logger.error("Error in getVideosDueForUpdate:", error);
    throw error;
  }
}

/**
 * Increment tracking update count
 */
export async function incrementUpdateCount(videoDbId: string): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc("increment_tiktok_tracking_count", {
      p_video_db_id: videoDbId,
    });

    if (error) {
      // If function doesn't exist, fallback to manual increment
      const { data: tracking } = await supabase
        .from("tiktok_engagement_tracking")
        .select("update_count")
        .eq("video_db_id", videoDbId)
        .single();

      if (tracking) {
        await supabase
          .from("tiktok_engagement_tracking")
          .update({ update_count: tracking.update_count + 1 })
          .eq("video_db_id", videoDbId);
      }
    }
  } catch (error) {
    logger.error("Error in incrementUpdateCount:", error);
  }
}

/**
 * Calculate next update time based on tier
 */
function calculateNextUpdateTime(tier: EngagementTier): string {
  const now = new Date();
  
  switch (tier) {
    case "ultra_hot": // 0-1h: every 10 min
      now.setMinutes(now.getMinutes() + 10);
      break;
    case "hot": // 1-4h: every 30 min
      now.setMinutes(now.getMinutes() + 30);
      break;
    case "warm": // 4-12h: every 1h
      now.setHours(now.getHours() + 1);
      break;
    case "cold": // 12h+: stop
      return "";
  }
  
  return now.toISOString();
}

/**
 * Determine tier based on video age
 */
export function determineTier(videoCreatedAt: Date): EngagementTier {
  const now = new Date();
  const ageInHours = (now.getTime() - videoCreatedAt.getTime()) / (1000 * 60 * 60);

  if (ageInHours < 1) return "ultra_hot";
  if (ageInHours < 4) return "hot";
  if (ageInHours < 12) return "warm";
  return "cold";
}

/**
 * Get tracking status for video
 */
export async function getTrackingStatus(videoDbId: string): Promise<EngagementTracking | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_engagement_tracking")
      .select("*")
      .eq("video_db_id", videoDbId)
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error("Error in getTrackingStatus:", error);
    return null;
  }
}

