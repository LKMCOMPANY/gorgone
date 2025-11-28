/**
 * Trigger TikTok Polling (No Auth - Temporary)
 * Manual polling trigger for immediate data refresh
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchVideos, getUserPosts, getHashtagPosts, getUserByUsername } from "@/lib/api/tiktok";
import { batchProcessVideos } from "@/lib/workers/tiktok/deduplicator";
import { updateRulePollingStatsAdmin } from "@/lib/data/tiktok/rules-admin";

export async function POST(request: NextRequest) {
  try {
    const { zone_id } = await request.json();

    if (!zone_id) {
      return NextResponse.json(
        { error: "zone_id is required" },
        { status: 400 }
      );
    }

    logger.info(`[TikTok Trigger] Manual polling for zone: ${zone_id}`);

    const supabase = createAdminClient();

    // Get active rules for zone
    const { data: rules, error } = await supabase
      .from("tiktok_rules")
      .select("*")
      .eq("zone_id", zone_id)
      .eq("is_active", true);

    if (error || !rules || rules.length === 0) {
      return NextResponse.json(
        { error: "No active rules found for zone" },
        { status: 404 }
      );
    }

    const results = [];

    for (const rule of rules) {
      try {
        logger.info(`[TikTok Trigger] Processing rule: ${rule.rule_name}`);

        let videos: any[] = [];

        // Fetch based on type
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
          let secUid = rule.sec_uid;
          
          if (!secUid && rule.username) {
            const userInfo = await getUserByUsername(rule.username, rule.country);
            if (userInfo) {
              secUid = userInfo.user.secUid;
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

        logger.info(`[TikTok Trigger] Found ${videos.length} videos from API`);

        // Process videos
        const processResult = await batchProcessVideos(videos, zone_id);

        // Update stats
        await updateRulePollingStatsAdmin(rule.id, processResult.created);

        results.push({
          rule_id: rule.id,
          rule_name: rule.rule_name,
          videos_found: videos.length,
          videos_created: processResult.created,
          duplicates: processResult.duplicates,
        });

      } catch (error) {
        logger.error(`[TikTok Trigger] Error processing rule ${rule.rule_name}:`, error);
        results.push({
          rule_id: rule.id,
          rule_name: rule.rule_name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      zone_id,
      rules_processed: rules.length,
      results,
    });

  } catch (error) {
    logger.error("[TikTok Trigger] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to trigger polling",
      },
      { status: 500 }
    );
  }
}

