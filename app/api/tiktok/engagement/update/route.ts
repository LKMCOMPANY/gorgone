/**
 * TikTok Engagement Update Worker
 * Batch update engagement stats for tracked videos
 * Called by QStash on a schedule
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { 
  getVideosDueForUpdateAdmin, 
  updateTrackingTierAdmin, 
  incrementUpdateCountAdmin,
  createEngagementSnapshotAdmin 
} from "@/lib/data/tiktok/engagement-admin";
import { getVideoByIdAdmin, updateVideoEngagementAdmin } from "@/lib/data/tiktok/videos-admin";
import { calculateAndStoreVideoPredictionsAdmin } from "@/lib/data/tiktok/predictions-admin";
import { getVideoById as getVideoFromAPI } from "@/lib/api/tiktok";

/**
 * POST /api/tiktok/engagement/update
 * Batch update engagement stats
 */
export async function GET(request: NextRequest) {
  try {
    // =====================================================
    // SECURITY: Verify request is from Vercel Cron
    // =====================================================
    
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (authHeader !== expectedAuth) {
      logger.warn("[TikTok Engagement Update] Unauthorized: Invalid or missing cron secret");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    logger.info("TikTok engagement update worker started");

    // Get videos due for update (limit 20 per batch like Twitter)
    const videoDbIds = await getVideosDueForUpdateAdmin(20);

    if (videoDbIds.length === 0) {
      logger.info("No videos due for engagement update");
      return NextResponse.json({
        success: true,
        message: "No videos to update",
        updated: 0,
      });
    }

    logger.info(`Found ${videoDbIds.length} videos due for update`);

    let successCount = 0;
    let errorCount = 0;

    // Process each video
    for (const videoDbId of videoDbIds) {
      try {
        // Get video from database
        const video = await getVideoByIdAdmin(videoDbId);
        if (!video) {
          logger.warn(`Video ${videoDbId} not found in database`);
          continue;
        }

        // Fetch latest stats from TikTok API
        const apiVideo = await getVideoFromAPI(video.video_id);
        if (!apiVideo) {
          logger.warn(`Video ${video.video_id} not found in TikTok API`);
          
          // Stop tracking if video deleted
          await updateTrackingTierAdmin(videoDbId, "cold");
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

        // Calculate velocity (total engagement change per hour)
        const totalDelta = Object.values(deltas).reduce((sum, d) => sum + d, 0);
        const hoursElapsed = 0.5; // Assuming ~30min between checks on average
        const velocity = hoursElapsed > 0 ? totalDelta / hoursElapsed : 0;

        // Create engagement snapshot
        await createEngagementSnapshotAdmin(videoDbId, newStats, deltas, velocity);

        // Update video stats in main table
        await updateVideoEngagementAdmin(video.video_id, newStats);

        // Update tracking tier based on age
        const newTier = determineTier(new Date(video.tiktok_created_at));
        await updateTrackingTierAdmin(videoDbId, newTier);

        // Increment update count
        await incrementUpdateCountAdmin(videoDbId);

        // Calculate and store predictions (after we have enough snapshots)
        await calculateAndStoreVideoPredictionsAdmin(videoDbId);

        successCount++;
        logger.debug(`Updated engagement for video ${video.video_id}`);

      } catch (error) {
        logger.error(`Error updating video ${videoDbId}:`, error);
        errorCount++;
      }
    }

    logger.info(`Engagement update completed: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      updated: successCount,
      errors: errorCount,
      total: videoDbIds.length,
    });

  } catch (error) {
    logger.error("Error in TikTok engagement update worker:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Update failed",
      },
      { status: 500 }
    );
  }
}

/**
 * Determine tier based on video age (same logic as data layer)
 */
function determineTier(videoCreatedAt: Date): "ultra_hot" | "hot" | "warm" | "cold" {
  const now = new Date();
  const ageInHours = (now.getTime() - videoCreatedAt.getTime()) / (1000 * 60 * 60);

  if (ageInHours < 1) return "ultra_hot";
  if (ageInHours < 4) return "hot";
  if (ageInHours < 12) return "warm";
  return "cold";
}

