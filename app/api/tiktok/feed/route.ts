/**
 * TikTok Feed API
 * Fetches videos with sorting, filtering and profile tags
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Date range to hours mapping
const DATE_RANGE_HOURS: Record<string, number> = {
  "1h": 1,
  "3h": 3,
  "6h": 6,
  "12h": 12,
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

// Sort options mapping
type SortOption = "recent" | "most_views" | "most_likes" | "most_comments" | "most_shares" | "most_engagement";

const SORT_COLUMNS: Record<SortOption, { column: string; ascending: boolean }> = {
  recent: { column: "tiktok_created_at", ascending: false },
  most_views: { column: "play_count", ascending: false },
  most_likes: { column: "digg_count", ascending: false },
  most_comments: { column: "comment_count", ascending: false },
  most_shares: { column: "share_count", ascending: false },
  most_engagement: { column: "total_engagement", ascending: false },
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get("zone_id");

    if (!zoneId) {
      return NextResponse.json(
        { success: false, error: "Missing zone_id parameter" },
        { status: 400 }
      );
    }

    // Parse parameters
    const search = searchParams.get("search") || undefined;
    const searchType = searchParams.get("search_type") as "keyword" | "user" | undefined;
    const sortBy = (searchParams.get("sort_by") || "recent") as SortOption;
    const profileTagType = searchParams.get("profile_tag_type") || undefined;
    const verified_only = searchParams.get("verified_only") === "true";
    const active_tracking_only = searchParams.get("active_tracking_only") === "true";
    const min_views = searchParams.get("min_views") ? parseInt(searchParams.get("min_views")!) : undefined;
    const min_likes = searchParams.get("min_likes") ? parseInt(searchParams.get("min_likes")!) : undefined;
    const min_comments = searchParams.get("min_comments") ? parseInt(searchParams.get("min_comments")!) : undefined;
    const date_range = searchParams.get("date_range") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Calculate date range
    let startDate: Date | undefined;
    if (date_range && DATE_RANGE_HOURS[date_range]) {
      startDate = new Date();
      startDate.setHours(startDate.getHours() - DATE_RANGE_HOURS[date_range]);
    }

    const supabase = createAdminClient();
    const sortConfig = SORT_COLUMNS[sortBy] || SORT_COLUMNS.recent;

    // Build base query
    let query = supabase
      .from("tiktok_videos")
      .select("*, author:tiktok_profiles(*)")
      .eq("zone_id", zoneId);

    // Apply search filters
    if (search && searchType === "user") {
      // Search by username
      const username = search.replace("@", "").toLowerCase();
      const { data: profile } = await supabase
        .from("tiktok_profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (profile) {
        query = query.eq("author_profile_id", profile.id);
      } else {
        // User not found
        return NextResponse.json({
          success: true,
          videos: [],
          count: 0,
          offset,
          limit,
        });
      }
    } else if (search && searchType === "keyword") {
      // Search in description
      query = query.ilike("description", `%${search}%`);
    }

    // Apply filters
    if (verified_only) {
      const { data: verifiedProfiles } = await supabase
        .from("tiktok_profiles")
        .select("id")
        .eq("is_verified", true);

      if (verifiedProfiles && verifiedProfiles.length > 0) {
        const verifiedIds = verifiedProfiles.map((p) => p.id);
        query = query.in("author_profile_id", verifiedIds);
      } else {
        return NextResponse.json({
          success: true,
          videos: [],
          count: 0,
          offset,
          limit,
        });
      }
    }

    if (profileTagType) {
      // Get usernames with this tag
      const { data: taggedProfiles } = await supabase
        .from("tiktok_profile_zone_tags")
        .select("username")
        .eq("zone_id", zoneId)
        .eq("tag_type", profileTagType);

      if (taggedProfiles && taggedProfiles.length > 0) {
        const usernames = taggedProfiles.map((t) => t.username);
        
        // Get profile IDs for these usernames
        const { data: profiles } = await supabase
          .from("tiktok_profiles")
          .select("id")
          .in("username", usernames);

        if (profiles && profiles.length > 0) {
          const profileIds = profiles.map((p) => p.id);
          query = query.in("author_profile_id", profileIds);
        } else {
          return NextResponse.json({
            success: true,
            videos: [],
            count: 0,
            offset,
            limit,
          });
        }
      } else {
        return NextResponse.json({
          success: true,
          videos: [],
          count: 0,
          offset,
          limit,
        });
      }
    }

    if (active_tracking_only) {
      // Get video IDs being tracked (not cold)
      const { data: trackedVideos } = await supabase
        .from("tiktok_engagement_tracking")
        .select("video_db_id")
        .neq("tier", "cold");

      if (trackedVideos && trackedVideos.length > 0) {
        const videoIds = trackedVideos.map((t) => t.video_db_id);
        query = query.in("id", videoIds);
      } else {
        return NextResponse.json({
          success: true,
          videos: [],
          count: 0,
          offset,
          limit,
        });
      }
    }

    // Apply engagement filters
    if (min_views) {
      query = query.gte("play_count", min_views);
    }
    if (min_likes) {
      query = query.gte("digg_count", min_likes);
    }
    if (min_comments) {
      query = query.gte("comment_count", min_comments);
    }

    // Apply date range
    if (startDate) {
      query = query.gte("tiktok_created_at", startDate.toISOString());
    }

    // Apply sorting
    query = query.order(sortConfig.column, { ascending: sortConfig.ascending });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: videos, error } = await query;

    if (error) {
      logger.error("Error fetching TikTok videos:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      videos: videos || [],
      count: videos?.length || 0,
      offset,
      limit,
    });

  } catch (error) {
    logger.error("Error in GET /api/tiktok/feed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch feed",
      },
      { status: 500 }
    );
  }
}

