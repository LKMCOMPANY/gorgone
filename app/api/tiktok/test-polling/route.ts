/**
 * Test TikTok Polling (Development only)
 * Manually trigger polling for testing
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchVideos, getUserPosts, getHashtagPosts, getUserByUsername } from "@/lib/api/tiktok";
import { batchProcessVideos } from "@/lib/workers/tiktok/deduplicator";
import { updateRulePollingStatsAdmin } from "@/lib/data/tiktok/rules-admin";

/**
 * POST /api/tiktok/test-polling
 * Test polling for a specific zone
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zone_id, rule_id } = body;

    if (!zone_id) {
      return NextResponse.json(
        { error: "zone_id is required" },
        { status: 400 }
      );
    }

    logger.info(`Test polling for zone: ${zone_id}`);

    // Get rules using admin client (bypass RLS for testing)
    const supabase = createAdminClient();
    const { data: allRules, error: rulesError } = await supabase
      .from("tiktok_rules")
      .select("*")
      .eq("zone_id", zone_id)
      .eq("is_active", true);

    if (rulesError) {
      throw rulesError;
    }

    const rules = rule_id 
      ? (allRules || []).filter((r) => r.id === rule_id)
      : (allRules || []);

    if (rules.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No active rules found",
      });
    }

    const results = [];

    for (const rule of rules) {
      try {
        logger.info(`Testing rule: ${rule.rule_name} (${rule.rule_type})`);

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
              count: 10, // Limit for testing
              country: rule.country || undefined,
            });
            videos = response.videos || [];
          }
        }

        logger.info(`Found ${videos.length} videos from API`);

        // Process videos
        const processResult = await batchProcessVideos(videos, zone_id);

        // Update stats (using admin)
        await updateRulePollingStatsAdmin(rule.id, processResult.created);

        results.push({
          rule_id: rule.id,
          rule_name: rule.rule_name,
          rule_type: rule.rule_type,
          videos_found: videos.length,
          videos_created: processResult.created,
          duplicates: processResult.duplicates,
          errors: processResult.errors,
        });

      } catch (error) {
        logger.error(`Error with rule ${rule.id}:`, error);
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
      results,
    });

  } catch (error) {
    logger.error("Error in test polling:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
      },
      { status: 500 }
    );
  }
}

