/**
 * Twitter Backfill Endpoint (TEMPORARY - ONE-TIME USE)
 * Manually fetch historical tweets for a zone using twitterapi.io search API
 * 
 * USAGE:
 * http://localhost:3000/api/twitter/backfill?zoneId=YOUR_ZONE_ID&count=100
 * 
 * PARAMETERS:
 * - zoneId (required): The zone ID to backfill
 * - count (optional): Number of tweets to fetch (default: 100, max: 500)
 * - queryType (optional): "Latest" or "Top" (default: "Latest")
 * 
 * This will:
 * 1. Get the active rule for the zone
 * 2. Use the rule's query to search historical tweets
 * 3. Process them through the same pipeline as webhooks (deduplication, vectorization, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { advancedSearch } from "@/lib/api/twitter/client";
import { getRulesByZone } from "@/lib/data/twitter/rules";
import { processIncomingTweets } from "@/lib/workers/twitter/deduplicator";
import { Client } from "@upstash/qstash";
import { env } from "@/lib/env";

const qstash = new Client({
  token: env.qstash.token,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zoneId");
    const count = parseInt(searchParams.get("count") || "100");
    const queryType = (searchParams.get("queryType") || "Latest") as "Latest" | "Top";

    // Validate parameters
    if (!zoneId) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing zoneId parameter",
          usage: "?zoneId=YOUR_ZONE_ID&count=100&queryType=Latest"
        },
        { status: 400 }
      );
    }

    if (count > 500) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Count cannot exceed 500 tweets per request" 
        },
        { status: 400 }
      );
    }

    logger.info(`🔄 Backfill started for zone ${zoneId}`, { count, queryType });

    // =====================================================
    // STEP 1: Get active rules for the zone
    // =====================================================
    const rules = await getRulesByZone(zoneId);
    const activeRule = rules.find(r => r.is_active);

    if (!activeRule) {
      return NextResponse.json(
        { 
          success: false, 
          error: `No active rule found for zone ${zoneId}. Please create and activate a rule first.`,
          rulesFound: rules.length
        },
        { status: 404 }
      );
    }

    logger.info(`Found active rule: ${activeRule.tag}`, { 
      query: activeRule.query 
    });

    // =====================================================
    // STEP 2: Search historical tweets using the rule's query
    // =====================================================
    let allTweets: any[] = [];
    let nextCursor: string | undefined = undefined;
    let pageCount = 0;
    const maxPages = Math.ceil(count / 100); // 100 tweets per page

    try {
      while (allTweets.length < count && pageCount < maxPages) {
        logger.info(`Fetching page ${pageCount + 1}/${maxPages}...`);

        const searchResult = await advancedSearch({
          query: activeRule.query,
          queryType,
          count: Math.min(100, count - allTweets.length),
          cursor: nextCursor,
        });

        if (searchResult.tweets.length === 0) {
          logger.info("No more tweets found");
          break;
        }

        allTweets = [...allTweets, ...searchResult.tweets];
        nextCursor = searchResult.next_cursor;
        pageCount++;

        // If no more pages, break
        if (!nextCursor) break;
      }

      logger.info(`✅ Fetched ${allTweets.length} historical tweets`);

    } catch (searchError: any) {
      logger.error("Error fetching tweets from TwitterAPI.io:", searchError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to search tweets: ${searchError.message}`,
          hint: "Check if your query is valid and your TwitterAPI.io API key has search permissions"
        },
        { status: 500 }
      );
    }

    if (allTweets.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No tweets found for this query",
        query: activeRule.query,
        processed: 0,
      });
    }

    // =====================================================
    // STEP 3: Process tweets through the same pipeline as webhooks
    // =====================================================
    logger.info(`Processing ${allTweets.length} tweets...`);

    const result = await processIncomingTweets(
      allTweets,
      activeRule.external_rule_id // Pass rule ID for proper zone mapping
    );

    logger.info("✅ Backfill processing complete", {
      total: allTweets.length,
      created: result.created,
      duplicates: result.duplicates,
      errors: result.errors,
    });

    // =====================================================
    // STEP 4: Schedule background jobs (vectorization + engagement tracking)
    // =====================================================
    if (result.created > 0 && result.createdTweetIds.length > 0) {
      try {
        // Schedule vectorization (5 seconds delay)
        await qstash.publishJSON({
          url: `${env.appUrl}/api/webhooks/qstash/vectorize-tweets`,
          body: {
            tweetIds: result.createdTweetIds,
            zoneId,
          },
          delay: 5,
        });

        logger.info('✅ Scheduled vectorization', {
          tweetsCount: result.createdTweetIds.length,
        });

        // Schedule engagement tracking (1 hour delay)
        const lotId = `backfill_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await qstash.publishJSON({
          url: `${env.appUrl}/api/twitter/engagement/track-lot`,
          body: {
            lotId,
            tweetDbIds: result.createdTweetIds,
            updateNumber: 1,
            zoneId,
          },
          delay: 3600,
        });

        logger.info('✅ Scheduled engagement tracking', {
          lotId,
          tweetsCount: result.createdTweetIds.length,
        });
      } catch (scheduleError) {
        logger.error('Error scheduling background jobs:', scheduleError);
      }
    }

    // =====================================================
    // RETURN SUCCESS
    // =====================================================
    return NextResponse.json({
      success: true,
      message: `Backfill completed successfully for zone ${zoneId}`,
      zone_id: zoneId,
      rule_used: activeRule.tag,
      query: activeRule.query,
      stats: {
        fetched: allTweets.length,
        created: result.created,
        duplicates: result.duplicates,
        errors: result.errors,
      },
      background_jobs_scheduled: result.created > 0,
      note: "New tweets will be vectorized in ~5 seconds and engagement tracked in ~1 hour",
    });

  } catch (error: any) {
    logger.error("Error in backfill endpoint:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

