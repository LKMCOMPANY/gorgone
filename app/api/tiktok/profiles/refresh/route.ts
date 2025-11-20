/**
 * Refresh TikTok Profile Stats
 * Updates profile stats from TikAPI (dev/test endpoint)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserByUsername } from "@/lib/api/tiktok";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zone_id } = body;

    if (!zone_id) {
      return NextResponse.json({ error: "zone_id required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get all profiles from videos in this zone
    const { data: videos } = await supabase
      .from("tiktok_videos")
      .select("author_profile_id")
      .eq("zone_id", zone_id);

    if (!videos) {
      return NextResponse.json({ error: "No videos found" }, { status: 404 });
    }

    const profileIds = [...new Set(videos.map(v => v.author_profile_id).filter(Boolean))];

    logger.info(`Refreshing stats for ${profileIds.length} profiles`);

    let updated = 0;
    let errors = 0;

    for (const profileId of profileIds) {
      try {
        // Get profile from DB
        const { data: profile } = await supabase
          .from("tiktok_profiles")
          .select("username")
          .eq("id", profileId)
          .single();

        if (!profile) continue;

        // Fetch from API
        const userInfo = await getUserByUsername(profile.username);
        
        if (!userInfo) {
          errors++;
          continue;
        }

        const stats = userInfo.stats;

        // Update profile with fresh stats
        await supabase
          .from("tiktok_profiles")
          .update({
            follower_count: stats.followerCount || 0,
            following_count: stats.followingCount || 0,
            heart_count: stats.heart || stats.heartCount || 0,
            video_count: stats.videoCount || 0,
            last_updated_at: new Date().toISOString(),
          })
          .eq("id", profileId);

        updated++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        logger.error(`Error updating profile ${profileId}:`, error);
        errors++;
      }
    }

    logger.info(`Profile stats refreshed: ${updated} updated, ${errors} errors`);

    return NextResponse.json({
      success: true,
      updated,
      errors,
      total: profileIds.length,
    });

  } catch (error) {
    logger.error("Error refreshing profile stats:", error);
    return NextResponse.json(
      { error: "Failed to refresh stats" },
      { status: 500 }
    );
  }
}

