/**
 * TikTok Videos Data Layer
 * Handles CRUD operations for TikTok videos
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface TikTokVideoRecord {
  id: string;
  zone_id: string;
  video_id: string;
  author_profile_id?: string;
  description?: string;
  duration?: number;
  height?: number;
  width?: number;
  cover_url?: string;
  share_url?: string;
  tiktok_created_at: string;
  collected_at: string;
  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  collect_count: number;
  total_engagement: number;
  music_id?: string;
  music_title?: string;
  music_author?: string;
  is_ad: boolean;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

export interface CreateVideoInput {
  zone_id: string;
  video_id: string;
  author_profile_id?: string;
  description?: string;
  duration?: number;
  height?: number;
  width?: number;
  cover_url?: string;
  share_url?: string;
  tiktok_created_at: string;
  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  collect_count: number;
  music_id?: string;
  music_title?: string;
  music_author?: string;
  is_ad?: boolean;
  raw_data: any;
}

/**
 * Check if video exists by video_id
 */
export async function videoExists(videoId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_videos")
      .select("id")
      .eq("video_id", videoId)
      .maybeSingle();

    if (error) throw error;

    return !!data;
  } catch (error) {
    logger.error(`Error checking video existence ${videoId}:`, error);
    return false;
  }
}

/**
 * Create a new video
 */
export async function createVideo(input: CreateVideoInput): Promise<TikTokVideoRecord> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_videos")
      .insert(input)
      .select()
      .single();

    if (error) {
      logger.error("Error creating TikTok video:", error);
      throw error;
    }

    logger.info(`TikTok video created: ${data.video_id}`);
    return data;
  } catch (error) {
    logger.error("Error in createVideo:", error);
    throw error;
  }
}

/**
 * Update video engagement stats
 */
export async function updateVideoEngagement(
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
    const supabase = await createClient();

    const { error } = await supabase
      .from("tiktok_videos")
      .update(stats)
      .eq("video_id", videoId);

    if (error) {
      logger.error(`Error updating video engagement ${videoId}:`, error);
      throw error;
    }
  } catch (error) {
    logger.error("Error in updateVideoEngagement:", error);
    throw error;
  }
}

/**
 * Get videos by zone
 */
export async function getVideosByZone(
  zoneId: string,
  options: {
    limit?: number;
    offset?: number;
    orderBy?: "created_at" | "engagement" | "tiktok_created_at";
  } = {}
): Promise<TikTokVideoRecord[]> {
  try {
    const supabase = await createClient();

    const { limit = 50, offset = 0, orderBy = "tiktok_created_at" } = options;

    let query = supabase
      .from("tiktok_videos")
      .select("*")
      .eq("zone_id", zoneId)
      .range(offset, offset + limit - 1);

    // Apply ordering
    if (orderBy === "engagement") {
      query = query.order("total_engagement", { ascending: false });
    } else if (orderBy === "created_at") {
      query = query.order("collected_at", { ascending: false });
    } else {
      query = query.order("tiktok_created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      logger.error(`Error fetching videos for zone ${zoneId}:`, error);
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error("Error in getVideosByZone:", error);
    throw error;
  }
}

/**
 * Get video by ID
 */
export async function getVideoById(videoId: string): Promise<TikTokVideoRecord | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_videos")
      .select("*")
      .eq("id", videoId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      logger.error(`Error fetching video ${videoId}:`, error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error("Error in getVideoById:", error);
    throw error;
  }
}

/**
 * Get video by TikTok video_id
 */
export async function getVideoByTikTokId(videoId: string): Promise<TikTokVideoRecord | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_videos")
      .select("*")
      .eq("video_id", videoId)
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error("Error in getVideoByTikTokId:", error);
    throw error;
  }
}

/**
 * Get videos by author
 */
export async function getVideosByAuthor(
  authorProfileId: string,
  limit = 50
): Promise<TikTokVideoRecord[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_videos")
      .select("*")
      .eq("author_profile_id", authorProfileId)
      .order("tiktok_created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error(`Error fetching videos by author ${authorProfileId}:`, error);
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error("Error in getVideosByAuthor:", error);
    throw error;
  }
}

/**
 * Get total video count for zone
 */
export async function getVideoCountByZone(zoneId: string): Promise<number> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("tiktok_videos")
      .select("*", { count: "exact", head: true })
      .eq("zone_id", zoneId);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    logger.error("Error in getVideoCountByZone:", error);
    return 0;
  }
}

