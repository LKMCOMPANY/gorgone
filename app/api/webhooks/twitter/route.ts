/**
 * Twitter Webhook Handler
 * Receives and processes tweets from TwitterAPI.io webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { processIncomingTweets } from "@/lib/workers/twitter/deduplicator";
import type { TwitterAPITweet } from "@/types";

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

    return NextResponse.json({
      success: true,
      processed: tweets.length,
      created: result.created,
      duplicates: result.duplicates,
      errors: result.errors,
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

