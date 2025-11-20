/**
 * TikTok Engagement Snapshot API
 * Manually create engagement snapshot for testing
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVideoById as getVideoFromAPI } from "@/lib/api/tiktok";
import { logger } from "@/lib/logger";

/**
 * POST /api/tiktok/engagement/snapshot
 * Create engagement snapshot for a video
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { video_db_id } = body;

    if (!video_db_id) {
      return NextResponse.json(
        { success: false, error: "video_db_id is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get video from database
    const { data: video, error: videoError } = await supabase
      .from("tiktok_videos")
      .select("*")
      .eq("id", video_db_id)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { success: false, error: "Video not found" },
        { status: 404 }
      );
    }

    // Fetch latest stats from TikTok API
    const apiVideo = await getVideoFromAPI(video.video_id);
    
    if (!apiVideo) {
      return NextResponse.json(
        { success: false, error: "Video not found in TikTok API" },
        { status: 404 }
      );
    }

    const newStats = {
      play_count: apiVideo.stats?.playCount || 0,
      digg_count: apiVideo.stats?.diggCount || 0,
      comment_count: apiVideo.stats?.commentCount || 0,
      share_count: apiVideo.stats?.shareCount || 0,
      collect_count: apiVideo.stats?.collectCount || 0,
    };

    // Calculate deltas
    const deltas = {
      delta_play_count: newStats.play_count - video.play_count,
      delta_digg_count: newStats.digg_count - video.digg_count,
      delta_comment_count: newStats.comment_count - video.comment_count,
      delta_share_count: newStats.share_count - video.share_count,
      delta_collect_count: newStats.collect_count - video.collect_count,
    };

    // Calculate velocity
    const totalDelta = Object.values(deltas).reduce((sum, d) => sum + d, 0);
    const velocity = totalDelta; // Simple velocity for now

    // Create snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("tiktok_engagement_history")
      .insert({
        video_id: video_db_id,
        ...newStats,
        ...deltas,
        engagement_velocity: velocity,
      })
      .select()
      .single();

    if (snapshotError) {
      logger.error("Error creating snapshot:", snapshotError);
      throw snapshotError;
    }

    // Update video stats
    await supabase
      .from("tiktok_videos")
      .update(newStats)
      .eq("id", video_db_id);

    logger.info(`Snapshot created for video ${video.video_id}`);

    return NextResponse.json({
      success: true,
      snapshot,
      deltas,
    });

  } catch (error) {
    logger.error("Error in POST /api/tiktok/engagement/snapshot:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create snapshot",
      },
      { status: 500 }
    );
  }
}

