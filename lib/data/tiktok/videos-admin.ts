/**
 * TikTok Videos Admin Functions
 * Admin versions of video functions for cron jobs
 * Uses createAdminClient() to bypass RLS
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { TikTokVideoRecord } from "./videos";

/**
 * Get video by ID (admin version for cron)
 */
export async function getVideoByIdAdmin(videoDbId: string): Promise<TikTokVideoRecord | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("tiktok_videos")
      .select("*")
      .eq("id", videoDbId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      logger.error(`Error fetching video ${videoDbId}:`, error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error("Error in getVideoByIdAdmin:", error);
    throw error;
  }
}

/**
 * Update video engagement stats (admin version for cron)
 */
export async function updateVideoEngagementAdmin(
  videoId: string,
  stats: {
    play_count: number;
    digg_count: number;
    comment_count: number;
    share_count: number;
    collect_count: number;
  }
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("tiktok_videos")
      .update(stats)
      .eq("video_id", videoId);

    if (error) {
      logger.error(`Error updating video ${videoId}:`, error);
      throw error;
    }
  } catch (error) {
    logger.error("Error in updateVideoEngagementAdmin:", error);
    throw error;
  }
}

