/**
 * TikTok Profile Stats Data Layer
 * Handles profile aggregation with video stats
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export interface TikTokProfileWithStats {
  // Profile fields
  id: string;
  tiktok_user_id: string;
  sec_uid: string;
  username: string;
  nickname: string;
  signature?: string;
  avatar_thumb?: string;
  avatar_medium?: string;
  avatar_larger?: string;
  region?: string;
  language?: string;
  is_verified: boolean;
  is_private: boolean;
  follower_count: number;
  following_count: number;
  heart_count: number;
  video_count: number;
  bio_link_url?: string;
  first_seen_at: string;
  last_seen_at: string;
  last_updated_at: string;
  total_videos_collected: number;
  created_at: string;
  updated_at: string;
  
  // Aggregated stats
  video_count_in_zone: number;
  total_engagement: number;
  avg_engagement_per_video: number;
  total_play_count: number;
  total_digg_count: number;
  total_comment_count: number;
  total_share_count: number;
  total_collect_count: number;
}

/**
 * Get profiles with aggregated stats for a zone
 */
export async function getProfilesWithStatsForZone(
  zoneId: string,
  options: {
    search?: string;
    sort_by?: "engagement" | "followers" | "videos" | "recent";
    profile_tag_type?: string;
    verified_only?: boolean;
    min_followers?: number;
    min_videos?: number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<TikTokProfileWithStats[]> {
  try {
    const supabase = createAdminClient();

    // Call RPC function
    const { data, error } = await supabase
      .rpc("get_tiktok_profiles_with_stats_for_zone", {
        p_zone_id: zoneId,
      });

    if (error) {
      logger.error(`Error fetching TikTok profiles with stats:`, error);
      throw error;
    }

    let profiles = (data || []) as TikTokProfileWithStats[];

    // Apply search filter
    if (options.search) {
      const searchLower = options.search.toLowerCase().replace("@", "");
      profiles = profiles.filter(
        (p) =>
          p.username.toLowerCase().includes(searchLower) ||
          p.nickname.toLowerCase().includes(searchLower) ||
          (p.signature && p.signature.toLowerCase().includes(searchLower))
      );
    }

    // Apply profile tag filter
    if (options.profile_tag_type) {
      const { data: taggedProfiles } = await supabase
        .from("tiktok_profile_zone_tags")
        .select("username")
        .eq("zone_id", zoneId)
        .eq("tag_type", options.profile_tag_type);

      if (taggedProfiles) {
        const usernames = new Set(taggedProfiles.map((t) => t.username));
        profiles = profiles.filter((p) => usernames.has(p.username));
      }
    }

    // Apply verified filter
    if (options.verified_only) {
      profiles = profiles.filter((p) => p.is_verified);
    }

    // Apply min followers filter
    if (options.min_followers) {
      profiles = profiles.filter((p) => p.follower_count >= options.min_followers!);
    }

    // Apply min videos filter
    if (options.min_videos) {
      profiles = profiles.filter((p) => p.video_count_in_zone >= options.min_videos!);
    }

    // Apply sorting
    if (options.sort_by === "engagement") {
      profiles.sort((a, b) => b.total_engagement - a.total_engagement);
    } else if (options.sort_by === "followers") {
      profiles.sort((a, b) => b.follower_count - a.follower_count);
    } else if (options.sort_by === "videos") {
      profiles.sort((a, b) => b.video_count_in_zone - a.video_count_in_zone);
    } else if (options.sort_by === "recent") {
      profiles.sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());
    }

    // Apply pagination
    const start = options.offset || 0;
    const end = start + (options.limit || 20);
    profiles = profiles.slice(start, end);

    return profiles;
  } catch (error) {
    logger.error("Error in getProfilesWithStatsForZone:", error);
    throw error;
  }
}

