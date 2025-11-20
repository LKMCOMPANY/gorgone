/**
 * TikTok Profile Tags API Routes
 * POST /api/tiktok/profiles/tags - Add profile tag
 * GET /api/tiktok/profiles/tags - List profile tags
 * DELETE /api/tiktok/profiles/tags - Remove profile tag
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserProfile } from "@/lib/auth/utils";
import {
  getProfileTagsByZone,
  addProfileTag,
  removeProfileTag,
  TikTokProfileTagType,
} from "@/lib/data/tiktok";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

/**
 * GET /api/tiktok/profiles/tags?zone_id=xxx
 * Get all profile tags for a zone
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get("zone_id");

    if (!zoneId) {
      return NextResponse.json(
        { success: false, error: "zone_id is required" },
        { status: 400 }
      );
    }

    // Get user profile for permissions
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get tags
    const tags = await getProfileTagsByZone(zoneId);

    return NextResponse.json({ success: true, tags });
  } catch (error) {
    logger.error("Error in GET /api/tiktok/profiles/tags:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile tags" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tiktok/profiles/tags
 * Add a profile tag
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zone_id, username, tag_type, notes } = body;

    // Validate input
    if (!zone_id || !username || !tag_type) {
      return NextResponse.json(
        { success: false, error: "zone_id, username, and tag_type are required" },
        { status: 400 }
      );
    }

    // Get user profile for permissions
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has permission (manager or super_admin)
    if (!["super_admin", "manager"].includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Add tag
    const tag = await addProfileTag(
      zone_id,
      username,
      tag_type as TikTokProfileTagType,
      profile.id,
      notes
    );

    // Revalidate zone settings page
    revalidatePath(`/dashboard/zones/${zone_id}/settings`);

    return NextResponse.json({ success: true, tag }, { status: 201 });
  } catch (error: any) {
    logger.error("Error in POST /api/tiktok/profiles/tags:", error);

    // Check for unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "This profile is already tagged in this category" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to add profile tag" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tiktok/profiles/tags
 * Remove a profile tag
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { zone_id, username, tag_type } = body;

    // Validate input
    if (!zone_id || !username || !tag_type) {
      return NextResponse.json(
        { success: false, error: "zone_id, username, and tag_type are required" },
        { status: 400 }
      );
    }

    // Get user profile for permissions
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has permission (manager or super_admin)
    if (!["super_admin", "manager"].includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Remove tag
    await removeProfileTag(zone_id, username, tag_type as TikTokProfileTagType);

    // Revalidate zone settings page
    revalidatePath(`/dashboard/zones/${zone_id}/settings`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in DELETE /api/tiktok/profiles/tags:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove profile tag" },
      { status: 500 }
    );
  }
}

