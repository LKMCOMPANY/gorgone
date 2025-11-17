/**
 * Twitter Profile Tags API
 * Manages profile tagging for Share of Voice analysis
 * 
 * @route POST /api/twitter/profiles/tags - Add tag to profile
 * @route GET /api/twitter/profiles/tags - List tagged profiles for zone
 * @route DELETE /api/twitter/profiles/tags - Remove tag from profile
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import * as profilesData from "@/lib/data/twitter/profiles";
import type { TwitterProfileTagType } from "@/types";

/**
 * POST /api/twitter/profiles/tags
 * Tag a profile with a specific type
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!body.zone_id || !body.username || !body.tag_type) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: zone_id, username, tag_type" 
        },
        { status: 400 }
      );
    }

    const validTagTypes: TwitterProfileTagType[] = [
      "attila",
      "adversary",
      "surveillance",
      "target",
      "ally",
      "asset",
      "local_team",
    ];

    if (!validTagTypes.includes(body.tag_type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid tag_type. Must be one of: ${validTagTypes.join(", ")}` 
        },
        { status: 400 }
      );
    }

    const username = body.username.replace("@", "").trim().toLowerCase();

    if (!username) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Username cannot be empty" 
        },
        { status: 400 }
      );
    }

    logger.info(`Adding profile tag`, {
      username,
      zone_id: body.zone_id,
      tag_type: body.tag_type,
    });

    // =====================================================
    // STEP 1: FIND PROFILE IN ZONE
    // =====================================================

    // First, check if profile exists with tweets in this zone
    const supabase = createAdminClient();
    
    // Get profiles that have tweets in this zone
    const { data: tweetsData } = await supabase
      .from("twitter_tweets")
      .select("author_profile_id")
      .eq("zone_id", body.zone_id)
      .limit(1000); // Get a good sample

    if (!tweetsData || tweetsData.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No profiles found in this zone yet. Please wait for tweets to be collected." 
        },
        { status: 404 }
      );
    }

    const profileIdsInZone = [...new Set(tweetsData.map(t => t.author_profile_id))];

    // Search for profile by username among profiles that have tweets in this zone
    const { data: profileData } = await supabase
      .from("twitter_profiles")
      .select("*")
      .eq("username", username)
      .in("id", profileIdsInZone)
      .single();

    if (!profileData) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Profile @${username} not found in this zone. Make sure this user has tweets collected in this zone first.` 
        },
        { status: 404 }
      );
    }

    const profile = profileData;
    logger.info(`Found profile for @${username}`, { profile_id: profile.id });

    // =====================================================
    // STEP 2: ADD TAG
    // =====================================================

    await profilesData.addProfileTag(
      profile.id,
      body.zone_id,
      body.tag_type,
      body.notes || null
    );

    logger.info(`Profile tag added successfully`, {
      profile_id: profile.id,
      username,
      tag_type: body.tag_type,
    });

    return NextResponse.json({
      success: true,
      message: "Profile tagged successfully",
      profile_id: profile.id,
      username,
    }, { status: 201 });

  } catch (error: any) {
    // Handle unique constraint violation (already tagged)
    if (error?.code === "23505") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Profile is already tagged with this type in this zone" 
        },
        { status: 409 }
      );
    }

    logger.error("Error adding profile tag:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error while adding tag" 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/twitter/profiles/tags?zone_id=xxx
 * List all tagged profiles for a zone
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zone_id");

    if (!zoneId) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required parameter: zone_id" 
        },
        { status: 400 }
      );
    }

    logger.debug(`Fetching tagged profiles for zone ${zoneId}`);

    // =====================================================
    // FETCH TAGGED PROFILES
    // =====================================================

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_profile_zone_tags")
      .select(`
        *,
        profile:twitter_profiles(
          id,
          username,
          name,
          profile_picture_url,
          is_verified,
          is_blue_verified,
          followers_count
        )
      `)
      .eq("zone_id", zoneId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform to include username at top level for easier frontend use
    const tags = (data || []).map((tag: any) => ({
      id: tag.id,
      profile_id: tag.profile_id,
      zone_id: tag.zone_id,
      tag_type: tag.tag_type,
      username: tag.profile?.username,
      name: tag.profile?.name,
      profile_picture_url: tag.profile?.profile_picture_url,
      is_verified: tag.profile?.is_verified,
      followers_count: tag.profile?.followers_count,
      notes: tag.notes,
      created_at: tag.created_at,
    }));

    return NextResponse.json({
      success: true,
      tags,
      count: tags.length,
    });

  } catch (error) {
    logger.error("Error fetching tagged profiles:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error while fetching tags" 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/twitter/profiles/tags?zone_id=xxx&username=xxx&tag_type=xxx
 * Remove tag from a profile
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zone_id");
    const username = searchParams.get("username");
    const tagType = searchParams.get("tag_type");

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!zoneId || !username || !tagType) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required parameters: zone_id, username, tag_type" 
        },
        { status: 400 }
      );
    }

    logger.info(`Removing profile tag`, {
      username,
      zone_id: zoneId,
      tag_type: tagType,
    });

    // =====================================================
    // STEP 1: FIND PROFILE
    // =====================================================

    const profile = await profilesData.getProfileByUsername(username);

    if (!profile) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Profile not found" 
        },
        { status: 404 }
      );
    }

    // =====================================================
    // STEP 2: REMOVE TAG
    // =====================================================

    await profilesData.removeProfileTag(
      profile.id,
      zoneId,
      tagType as TwitterProfileTagType
    );

    logger.info(`Profile tag removed successfully`, {
      profile_id: profile.id,
      username,
      tag_type: tagType,
    });

    return NextResponse.json({
      success: true,
      message: "Profile tag removed successfully",
    });

  } catch (error) {
    logger.error("Error removing profile tag:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error while removing tag" 
      },
      { status: 500 }
    );
  }
}

