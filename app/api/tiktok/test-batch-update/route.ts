/**
 * Test Batch Engagement Update (Development only)
 * Manually trigger batch engagement updates for testing
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getVideoById as getVideoFromAPI } from "@/lib/api/tiktok";

/**
 * POST /api/tiktok/test-batch-update
 * Force batch update for testing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zone_id, video_count = 5 } = body;

    if (!zone_id) {
      return NextResponse.json(
        { error: "zone_id is required" },
        { status: 400 }
      );
    }

    logger.info(`Test batch update for zone: ${zone_id}`);

    const supabase = createAdminClient();

    // Get recent videos from this zone
    const { data: videos } = await supabase
      .from("tiktok_videos")
      .select("id, video_id, play_count, digg_count, comment_count, share_count, collect_count, tiktok_created_at")
      .eq("zone_id", zone_id)
      .order("tiktok_created_at", { ascending: false })
      .limit(video_count);

    if (!videos || videos.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No videos found",
      });
    }

    logger.info(`Processing ${videos.length} videos`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const video of videos) {
      try {
        // Fetch latest stats from TikTok API
        const apiVideo = await getVideoFromAPI(video.video_id);
        
        if (!apiVideo) {
          logger.warn(`Video ${video.video_id} not found in API`);
          errorCount++;
          continue;
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

        const totalDelta = Object.values(deltas).reduce((sum, d) => sum + d, 0);

        // Create engagement snapshot
        await supabase
          .from("tiktok_engagement_history")
          .insert({
            video_id: video.id,
            ...newStats,
            ...deltas,
            engagement_velocity: totalDelta,
          });

        // Update video stats
        await supabase
          .from("tiktok_videos")
          .update(newStats)
          .eq("id", video.id);

        // Update tracking
        await supabase
          .from("tiktok_engagement_tracking")
          .update({
            last_updated_at: new Date().toISOString(),
            update_count: supabase.rpc("increment", { x: 1 }) as any,
          })
          .eq("video_db_id", video.id);

        successCount++;
        results.push({
          video_id: video.video_id,
          old_engagement: video.play_count + video.digg_count + video.comment_count,
          new_engagement: newStats.play_count + newStats.digg_count + newStats.comment_count,
          delta: totalDelta,
        });

      } catch (error) {
        logger.error(`Error updating video ${video.video_id}:`, error);
        errorCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logger.info(`Batch update completed: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      zone_id,
      videos_processed: videos.length,
      success_count: successCount,
      error_count: errorCount,
      results,
    });

  } catch (error) {
    logger.error("Error in test batch update:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
      },
      { status: 500 }
    );
  }
}

