/**
 * TikTok Profiles API
 * Fetches profiles with aggregated stats for a zone
 */

import { NextRequest, NextResponse } from "next/server";
import { getProfilesWithStatsForZone } from "@/lib/data/tiktok/profiles-stats";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

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
    const sortBy = (searchParams.get("sort_by") || "engagement") as "engagement" | "followers" | "videos" | "recent";
    const profileTagType = searchParams.get("profile_tag_type") || undefined;
    const verifiedOnly = searchParams.get("verified_only") === "true";
    const minFollowers = searchParams.get("min_followers") ? parseInt(searchParams.get("min_followers")!) : undefined;
    const minVideos = searchParams.get("min_videos") ? parseInt(searchParams.get("min_videos")!) : undefined;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch profiles with stats
    const profiles = await getProfilesWithStatsForZone(zoneId, {
      search,
      sort_by: sortBy,
      profile_tag_type: profileTagType,
      verified_only: verifiedOnly,
      min_followers: minFollowers,
      min_videos: minVideos,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      profiles,
      count: profiles.length,
      offset,
      limit,
    });

  } catch (error) {
    logger.error("Error in GET /api/tiktok/profiles:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch profiles",
      },
      { status: 500 }
    );
  }
}

