/**
 * TikTok Engagement History API
 * GET /api/tiktok/engagement/[videoId]
 * 
 * Fetches complete engagement history for a video:
 * - Initial video metrics (collected_at point)
 * - All engagement snapshots (historical data)
 * - Predictions for next 3 hours (TODO)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { calculateVideoPredictions } from "@/lib/data/tiktok/predictions";

export const dynamic = "force-dynamic";

interface EngagementDataPoint {
  timestamp: string;
  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  collect_count: number;
  total_engagement: number;
  type: "initial" | "snapshot" | "prediction";
}

interface EngagementHistoryResponse {
  success: boolean;
  video: {
    id: string;
    video_id: string;
    tiktok_created_at: string;
    collected_at: string;
  } | null;
  initial_metrics: EngagementDataPoint | null;
  snapshots: EngagementDataPoint[];
  predictions: any | null;
  tracking_status?: {
    tier: string;
    update_count: number;
    last_updated_at: string;
  } | null;
  error?: string;
}

/**
 * GET /api/tiktok/engagement/[videoId]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await context.params;

    if (!videoId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing videoId parameter",
          video: null,
          initial_metrics: null,
          snapshots: [],
          predictions: null,
        } as EngagementHistoryResponse,
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch video with current metrics and predictions
    const { data: video, error: videoError } = await supabase
      .from("tiktok_videos")
      .select("id, video_id, tiktok_created_at, collected_at, play_count, digg_count, comment_count, share_count, collect_count, total_engagement, predictions")
      .eq("id", videoId)
      .single();

    if (videoError || !video) {
      logger.error(`Video not found: ${videoId}`, videoError);
      return NextResponse.json(
        {
          success: false,
          error: "Video not found",
          video: null,
          initial_metrics: null,
          snapshots: [],
          predictions: null,
        } as EngagementHistoryResponse,
        { status: 404 }
      );
    }

    // Create initial data point (video at collection time)
    const initialMetrics: EngagementDataPoint = {
      timestamp: video.collected_at,
      play_count: video.play_count,
      digg_count: video.digg_count,
      comment_count: video.comment_count,
      share_count: video.share_count,
      collect_count: video.collect_count,
      total_engagement: video.total_engagement,
      type: "initial",
    };

    // Fetch all engagement snapshots
    const { data: snapshots, error: snapshotsError } = await supabase
      .from("tiktok_engagement_history")
      .select("*")
      .eq("video_id", videoId)
      .order("snapshot_at", { ascending: true });

    if (snapshotsError) {
      logger.error(`Error fetching snapshots for video ${videoId}:`, snapshotsError);
    }

    // Transform snapshots to data points
    const snapshotDataPoints: EngagementDataPoint[] = (snapshots || []).map((snapshot: any) => ({
      timestamp: snapshot.snapshot_at,
      play_count: snapshot.play_count,
      digg_count: snapshot.digg_count,
      comment_count: snapshot.comment_count,
      share_count: snapshot.share_count,
      collect_count: snapshot.collect_count,
      total_engagement: snapshot.total_engagement,
      type: "snapshot" as const,
    }));

    // Fetch tracking status
    const { data: trackingStatus } = await supabase
      .from("tiktok_engagement_tracking")
      .select("tier, update_count, last_updated_at")
      .eq("video_db_id", videoId)
      .maybeSingle();

    // Calculate predictions if we have enough snapshots
    let predictions = video.predictions || null;
    
    if (snapshotDataPoints.length >= 2 && !predictions) {
      predictions = await calculateVideoPredictions(videoId);
      
      // Store for future use
      if (predictions) {
        await supabase
          .from("tiktok_videos")
          .update({ predictions: predictions as any })
          .eq("id", videoId);
      }
    }

    const response: EngagementHistoryResponse = {
      success: true,
      video: {
        id: video.id,
        video_id: video.video_id,
        tiktok_created_at: video.tiktok_created_at,
        collected_at: video.collected_at,
      },
      initial_metrics: initialMetrics,
      snapshots: snapshotDataPoints,
      predictions,
      tracking_status: trackingStatus ? {
        tier: trackingStatus.tier,
        update_count: trackingStatus.update_count,
        last_updated_at: trackingStatus.last_updated_at,
      } : null,
    };

    logger.debug(`Engagement history fetched for video ${videoId}: ${snapshotDataPoints.length} snapshots`);

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Engagement history API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch engagement history",
        video: null,
        initial_metrics: null,
        snapshots: [],
        predictions: null,
      } as EngagementHistoryResponse,
      { status: 500 }
    );
  }
}


