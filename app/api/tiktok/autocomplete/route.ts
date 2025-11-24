/**
 * TikTok Autocomplete API
 * Provides autocomplete suggestions for users and hashtags
 * 
 * Optimized for production with:
 * - Proper batch processing to avoid header size limits
 * - Correct metadata field mapping (avatar_thumb, follower_count)
 * - Efficient hashtag counting and ranking
 * - Comprehensive error handling and logging
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface AutocompleteResult {
  type: "user" | "keyword";
  value: string;
  label: string;
  metadata?: {
    avatar_thumb?: string;
    follower_count?: number;
    is_verified?: boolean;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get("zone_id");
    const query = searchParams.get("q");

    logger.info(`TikTok autocomplete called: zone=${zoneId}, query="${query}"`);

    if (!zoneId || !query) {
      return NextResponse.json(
        { success: false, error: "Missing zone_id or query parameter" },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
      });
    }

    const supabase = createAdminClient();
    const results: AutocompleteResult[] = [];

    // Search for users (profiles)
    const cleanQuery = query.replace("@", "").toLowerCase();

    // Get unique profile IDs from videos in this zone
    const { data: videoData, error: videoError } = await supabase
      .from("tiktok_videos")
      .select("author_profile_id")
      .eq("zone_id", zoneId);

    if (videoError) {
      logger.error("Error fetching videos for autocomplete:", videoError);
    }

    logger.debug(`TikTok autocomplete: Found ${videoData?.length || 0} videos in zone`);

    if (videoData && videoData.length > 0) {
      const uniqueProfileIds = [...new Set(videoData.map((v) => v.author_profile_id).filter(Boolean))];

      logger.debug(`TikTok autocomplete: Searching "${cleanQuery}" in ${uniqueProfileIds.length} profiles`);

      // Fetch profiles in batches to avoid HTTP header size limits
      const BATCH_SIZE = 100;
      const allProfiles = [];
      
      for (let i = 0; i < uniqueProfileIds.length; i += BATCH_SIZE) {
        const batch = uniqueProfileIds.slice(i, i + BATCH_SIZE);
        const { data: batchProfiles, error: batchError } = await supabase
          .from("tiktok_profiles")
          .select("id, username, nickname, avatar_thumb, follower_count, is_verified")
          .in("id", batch);

        if (batchError) {
          logger.error(`Error fetching profiles batch ${i / BATCH_SIZE + 1}:`, batchError);
          continue;
        }

        if (batchProfiles) {
          allProfiles.push(...batchProfiles);
        }
      }

      logger.debug(`TikTok autocomplete: Fetched ${allProfiles.length} total profiles`);

      // Filter profiles by username or nickname (case-insensitive)
      const matchingProfiles = allProfiles
        .filter((p) => 
          p.username?.toLowerCase().includes(cleanQuery) ||
          p.nickname?.toLowerCase().includes(cleanQuery)
        )
        .sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0))
        .slice(0, 8);

      logger.debug(`TikTok autocomplete: Found ${matchingProfiles.length} matching profiles`);

      matchingProfiles.forEach((profile) => {
        results.push({
          type: "user",
          value: `@${profile.username}`,
          label: `${profile.nickname} (@${profile.username})`,
          metadata: {
            avatar_thumb: profile.avatar_thumb || undefined,
            follower_count: profile.follower_count || 0,
            is_verified: profile.is_verified || false,
          },
        });
      });
    }

    // Search for hashtags
    if (cleanQuery.length >= 2) {
      const { data: hashtags, error: hashtagError } = await supabase
        .from("tiktok_entities")
        .select("entity_value, entity_normalized")
        .eq("zone_id", zoneId)
        .eq("entity_type", "hashtag")
        .ilike("entity_normalized", `%${cleanQuery}%`)
        .limit(20); // Fetch more for better ranking

      if (hashtagError) {
        logger.error("Error searching hashtags:", hashtagError);
      } else if (hashtags) {
        // Count occurrences and rank by popularity
        const uniqueHashtags = new Map<string, number>();
        hashtags.forEach((tag) => {
          const count = uniqueHashtags.get(tag.entity_normalized) || 0;
          uniqueHashtags.set(tag.entity_normalized, count + 1);
        });

        logger.debug(`TikTok autocomplete: Found ${uniqueHashtags.size} unique hashtags`);

        Array.from(uniqueHashtags.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([hashtag]) => {
            results.push({
              type: "keyword",
              value: `#${hashtag}`,
              label: `#${hashtag}`,
            });
          });
      }
    }

    logger.debug(`TikTok autocomplete: Total results before dedup: ${results.length}`);

    // Remove duplicates and limit total results
    const uniqueResults = results
      .filter(
        (result, index, self) =>
          index === self.findIndex((r) => r.value === result.value)
      )
      .slice(0, 10);

    logger.debug(`TikTok autocomplete: Returning ${uniqueResults.length} final results`);

    return NextResponse.json({
      success: true,
      results: uniqueResults,
    });
  } catch (error) {
    logger.error("TikTok autocomplete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to perform autocomplete search",
      },
      { status: 500 }
    );
  }
}

