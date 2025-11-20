/**
 * TikTok Polling Worker
 * QStash endpoint to poll TikTok API for new videos
 * Called every hour by QStash cron
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRulesDueForPolling, updateRulePollingStats } from "@/lib/data/tiktok/rules";
import { searchVideos, getUserPosts, getHashtagPosts, getUserByUsername } from "@/lib/api/tiktok";
import { batchProcessVideos } from "@/lib/workers/tiktok/deduplicator";

/**
 * POST /api/tiktok/polling
 * Poll TikTok API for new videos based on active rules
 */
export async function POST(request: NextRequest) {
  try {
    // =====================================================
    // SECURITY: Verify request is from QStash
    // =====================================================
    
    const qstashSignature = request.headers.get("upstash-signature");
    
    if (!qstashSignature) {
      logger.warn("[TikTok Polling] Unauthorized: Missing QStash signature");
      return NextResponse.json(
        { error: "Unauthorized: Missing QStash signature" },
        { status: 401 }
      );
    }

    logger.info("TikTok polling worker started");

    // Get rules due for polling
    const rules = await getRulesDueForPolling();

    if (rules.length === 0) {
      logger.info("No rules due for polling");
      return NextResponse.json({
        success: true,
        message: "No rules to poll",
        processed: 0,
      });
    }

    logger.info(`Found ${rules.length} rules due for polling`);

    let totalVideosCollected = 0;
    const results: Array<{ ruleId: string; videos: number }> = [];

    const supabase = createAdminClient();

    // Process each rule
    for (const rule of rules) {
      try {
        logger.info(`Processing rule: ${rule.rule_name} (${rule.rule_type})`);

        let videos: any[] = [];

        // Fetch videos based on rule type
        if (rule.rule_type === "keyword" || rule.rule_type === "combined") {
          const response = await searchVideos({
            query: rule.query || "",
            country: rule.country || undefined,
          });
          videos = response.videos || [];
        } else if (rule.rule_type === "hashtag") {
          const response = await getHashtagPosts({
            name: rule.hashtag || "",
            country: rule.country || undefined,
          });
          videos = response.videos || [];
        } else if (rule.rule_type === "user") {
          // Need secUid - fetch if not cached
          let secUid = rule.sec_uid;
          
          if (!secUid && rule.username) {
            const userInfo = await getUserByUsername(rule.username, rule.country);
            if (userInfo) {
              secUid = userInfo.user.secUid;
              
              // Cache secUid for future use
              await supabase
                .from("tiktok_rules")
                .update({ sec_uid: secUid })
                .eq("id", rule.id);
            }
          }

          if (secUid) {
            const response = await getUserPosts({
              secUid,
              country: rule.country || undefined,
            });
            videos = response.videos || [];
          }
        }

        logger.info(`Fetched ${videos.length} videos for rule ${rule.rule_name}`);

        // Process videos (deduplication + storage)
        if (videos.length > 0) {
          const processResult = await batchProcessVideos(videos, rule.zone_id);
          
          totalVideosCollected += processResult.created;
          results.push({
            ruleId: rule.id,
            videos: processResult.created,
          });

          // Update rule polling stats
          await updateRulePollingStats(rule.id, processResult.created);
        } else {
          // Update polling stats even if no videos
          await updateRulePollingStats(rule.id, 0);
        }

      } catch (error) {
        logger.error(`Error processing rule ${rule.id}:`, error);
      }
    }

    logger.info(`Polling completed: ${totalVideosCollected} new videos collected`);

    return NextResponse.json({
      success: true,
      processed: rules.length,
      totalVideos: totalVideosCollected,
      results,
    });

  } catch (error) {
    logger.error("Error in TikTok polling worker:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Polling failed",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tiktok/polling
 * Health check endpoint for QStash
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "tiktok-polling",
    timestamp: new Date().toISOString(),
  });
}

