/**
 * Twitter Webhook Handler
 * Receives and processes tweets from TwitterAPI.io webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { processIncomingTweets } from "@/lib/workers/twitter/deduplicator";
import { getRuleByApiId } from "@/lib/data/twitter/rules";
import { Client } from "@upstash/qstash";
import type { TwitterAPITweet } from "@/types";

// QStash client for scheduling engagement updates
const qstash = new Client({
  token: env.qstash.token,
});

/**
 * POST /api/webhooks/twitter
 * Receives tweets from TwitterAPI.io webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Parse webhook payload first
    const payload = await request.json();

    logger.info("Twitter webhook received", {
      timestamp: new Date().toISOString(),
      event_type: payload.event_type || "unknown",
    });

    // =====================================================
    // HANDLE TEST WEBHOOK (twitterapi.io validation)
    // =====================================================
    
    // If empty payload or test request, return 200 OK
    if (!payload || Object.keys(payload).length === 0 || payload.event_type === "test_webhook_url") {
      logger.info("Twitter webhook test received - returning 200 OK");
      return NextResponse.json({
        status: "ok",
        message: "Webhook endpoint is ready",
        service: "twitter-webhook",
      });
    }

    // =====================================================
    // SECURITY: Verify X-API-Key for real data requests
    // =====================================================
    
    const receivedApiKey = request.headers.get("X-API-Key") || request.headers.get("x-api-key");
    
    if (!receivedApiKey) {
      logger.warn("Twitter webhook received without X-API-Key header", { payload });
      return NextResponse.json(
        { error: "Unauthorized: Missing X-API-Key" },
        { status: 401 }
      );
    }

    if (receivedApiKey !== env.twitter.apiKey) {
      logger.warn("Twitter webhook received with invalid X-API-Key");
      return NextResponse.json(
        { error: "Unauthorized: Invalid X-API-Key" },
        { status: 401 }
      );
    }

    // Extract tweets from payload
    // TwitterAPI.io may send tweets in different formats
    let tweets: TwitterAPITweet[] = [];

    if (Array.isArray(payload)) {
      // Payload is directly an array of tweets
      tweets = payload;
    } else if (payload.tweets && Array.isArray(payload.tweets)) {
      // Payload has a tweets field
      tweets = payload.tweets;
    } else if (payload.results && Array.isArray(payload.results)) {
      // Payload has a results field
      tweets = payload.results;
    } else if (payload.tweet) {
      // Single tweet
      tweets = [payload.tweet];
    } else {
      logger.warn("Unknown webhook payload format", { payload });
      return NextResponse.json(
        { error: "Invalid payload format" },
        { status: 400 }
      );
    }

    if (tweets.length === 0) {
      logger.info("No tweets in webhook payload");
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No tweets to process",
      });
    }

    logger.info(`Processing ${tweets.length} tweets from webhook`);

    // Extract rule ID if provided (to map to zone)
    const ruleId = payload.rule_id || payload.ruleId || null;

    // Process tweets asynchronously (deduplication + storage)
    const result = await processIncomingTweets(tweets, ruleId);

    logger.info("Webhook processing complete", {
      total: tweets.length,
      new: result.created,
      duplicates: result.duplicates,
      errors: result.errors,
    });

    // =====================================================
    // SCHEDULE ENGAGEMENT TRACKING (if new tweets created)
    // =====================================================

    if (result.created > 0 && result.createdTweetIds.length > 0) {
      try {
        // Get zone ID from rule
        const rule = ruleId ? await getRuleByApiId(ruleId) : null;
        const zoneId = rule?.zone_id;

        if (zoneId) {
          // Generate lot ID for tracking
          const lotId = `lot_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          // Schedule first update in 1 hour
          await qstash.publishJSON({
            url: `${env.appUrl}/api/twitter/engagement/track-lot`,
            body: {
              lotId,
              tweetDbIds: result.createdTweetIds,
              updateNumber: 1,
              zoneId,
            },
            delay: 3600, // 1 hour in seconds
          });

          logger.info(`Scheduled engagement tracking for lot ${lotId}`, {
            tweetsCount: result.createdTweetIds.length,
            zoneId,
            firstUpdateAt: new Date(Date.now() + 3600000).toISOString(),
          });
        } else {
          logger.warn("Cannot schedule engagement tracking: zone_id not found");
        }
      } catch (scheduleError) {
        // Don't fail the webhook if scheduling fails
        logger.error("Error scheduling engagement tracking:", scheduleError);
      }
    }

    return NextResponse.json({
      success: true,
      processed: tweets.length,
      created: result.created,
      duplicates: result.duplicates,
      errors: result.errors,
      engagement_tracking_scheduled: result.created > 0,
    });
  } catch (error) {
    logger.error("Error processing Twitter webhook:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/twitter
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "twitter-webhook",
    timestamp: new Date().toISOString(),
  });
}

