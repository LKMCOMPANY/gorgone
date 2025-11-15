/**
 * Batch Engagement Update API
 * Processes scheduled engagement updates for tweets
 * Called by QStash scheduler every 10 minutes
 * 
 * POST /api/twitter/engagement/update
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { 
  updateBatchTweetEngagement, 
  getEngagementTrackingStats 
} from "@/lib/data/twitter/engagement-updater";

/**
 * POST /api/twitter/engagement/update
 * Process batch engagement updates
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // =====================================================
    // SECURITY: Verify request is from QStash
    // =====================================================
    
    const qstashSignature = request.headers.get("upstash-signature");
    
    // QStash always sends a signature header
    // For now, we just check its presence (TODO: implement full verification)
    if (!qstashSignature) {
      // Allow manual testing with Bearer token
      const authHeader = request.headers.get("authorization");
      
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const expectedToken = env.twitter.apiKey;
        
        if (token !== expectedToken) {
          logger.warn("Invalid API key for engagement update");
          return NextResponse.json(
            { error: "Unauthorized: Invalid API key" },
            { status: 401 }
          );
        }
        logger.debug("Manual test with Bearer token authenticated");
      } else {
        logger.warn("Engagement update called without QStash signature or auth token");
        return NextResponse.json(
          { error: "Unauthorized: Missing QStash signature" },
          { status: 401 }
        );
      }
    } else {
      logger.debug("QStash signature detected, request accepted");
    }

    // =====================================================
    // PROCESS BATCH UPDATE
    // =====================================================

    logger.info("Starting scheduled engagement update batch");

    // Get optional parameters from body
    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 100; // Default to 100 tweets per run

    // Execute batch update
    const result = await updateBatchTweetEngagement(limit);

    // =====================================================
    // LOG AND RETURN RESULTS
    // =====================================================

    const totalDuration = Date.now() - startTime;

    logger.info("Engagement update batch completed", {
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      skipped: result.skipped,
      duration_ms: totalDuration,
      api_calls: result.stats.api_calls,
      avg_latency_ms: result.stats.avg_latency_ms,
    });

    // Get current tracking stats for monitoring
    const trackingStats = await getEngagementTrackingStats();

    return NextResponse.json({
      success: true,
      message: "Engagement update completed",
      timestamp: new Date().toISOString(),
      batch_result: {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        skipped: result.skipped,
        duration_ms: totalDuration,
      },
      api_stats: {
        calls: result.stats.api_calls,
        tweets_per_call: result.stats.tweets_per_call,
        avg_latency_ms: result.stats.avg_latency_ms,
      },
      tracking_stats: trackingStats,
    });
  } catch (error) {
    logger.error("Error in engagement update batch:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/twitter/engagement/update
 * Get status and statistics about engagement tracking
 */
export async function GET(request: NextRequest) {
  try {
    // Optional authentication (lighter for GET)
    const authHeader = request.headers.get("authorization");
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const expectedToken = env.twitter.apiKey;
      
      if (token !== expectedToken) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Get tracking statistics
    const stats = await getEngagementTrackingStats();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      info: {
        endpoint: "/api/twitter/engagement/update",
        method: "POST",
        description: "Processes scheduled engagement updates for tweets",
        scheduler: "QStash (every 10 minutes)",
        batch_size: "100 tweets per run",
      },
    });
  } catch (error) {
    logger.error("Error getting engagement stats:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

