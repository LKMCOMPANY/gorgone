/**
 * Twitter Profiles API
 * Fetches profiles with aggregated statistics and filtering
 */

import { NextRequest, NextResponse } from "next/server";
import { getProfilesWithStats, type TwitterProfileWithStats } from "@/lib/data/twitter/profiles";
import { logger } from "@/lib/logger";
import type { TwitterProfileTagType } from "@/types";

export const dynamic = "force-dynamic";

// Sort options type
type SortOption = "followers" | "engagement" | "tweets" | "recent";

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
    const sortBy = (searchParams.get("sort_by") || "followers") as SortOption;
    const profileTagType = searchParams.get("profile_tag_type") as TwitterProfileTagType | undefined;
    const verified_only = searchParams.get("verified_only") === "true";
    const min_followers = searchParams.get("min_followers") ? parseInt(searchParams.get("min_followers")!) : undefined;
    const min_tweets = searchParams.get("min_tweets") ? parseInt(searchParams.get("min_tweets")!) : undefined;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch profiles with stats using existing data layer functions
    const profiles = await getProfilesWithStats(zoneId, {
      limit,
      offset,
      sortBy,
      search,
      profileTagType,
      verified_only,
      min_followers,
      min_tweets,
    });

    logger.debug(`Fetched ${profiles.length} profiles for zone ${zoneId}`);

    return NextResponse.json({
      success: true,
      profiles,
      count: profiles.length,
      offset,
      limit,
    });
  } catch (error) {
    logger.error("Profiles API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch profiles",
      },
      { status: 500 }
    );
  }
}

