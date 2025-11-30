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
import { getUserByUsername } from "@/lib/api/twitter/client";
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
    // STEP 1: FIND PROFILE (GLOBAL)
    // =====================================================

    let profile = await profilesData.getProfileByUsername(username);

    if (!profile) {
      logger.info(`Profile @${username} not found in DB, fetching from Twitter API...`);
      
      // Try to fetch from Twitter API
      const twitterUser = await getUserByUsername(username);
      
      if (twitterUser) {
        // Create new profile from API data
        const profileId = await profilesData.upsertProfile({
          twitter_user_id: twitterUser.id,
          username: twitterUser.userName || username, // API returns userName
          name: twitterUser.name,
          profile_picture_url: twitterUser.profilePicture,
          cover_picture_url: twitterUser.coverPicture,
          description: twitterUser.description,
          location: twitterUser.location,
          is_verified: twitterUser.isBlueVerified || false,
          followers_count: twitterUser.followers || 0,
          following_count: twitterUser.following || 0,
          tweets_count: twitterUser.statusesCount || 0,
          media_count: twitterUser.mediaCount || 0,
          favourites_count: twitterUser.favouritesCount || 0,
          twitter_created_at: twitterUser.createdAt,
          is_automated: twitterUser.isAutomated || false,
          can_dm: twitterUser.canDm || false,
          twitter_url: twitterUser.url,
          raw_data: twitterUser
        });
        
        // Fetch the newly created profile
        profile = await profilesData.getProfileById(profileId);
      } else {
        // Fallback: Create a stub profile if API fails or returns nothing
        // This allows tracking even if API lookup fails
        logger.warn(`Could not fetch @${username} from API, creating stub profile`);
        
        const profileId = await profilesData.upsertProfile({
          twitter_user_id: `stub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Temporary ID until we get real data
          username: username,
          name: username, // Use username as name initially
          raw_data: { is_stub: true }
        });
        
        profile = await profilesData.getProfileById(profileId);
      }
    }

    if (!profile) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to create or retrieve profile" 
        },
        { status: 500 }
      );
    }

    logger.info(`Using profile`, { profile_id: profile.id, username: profile.username });

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

