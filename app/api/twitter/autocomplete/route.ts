/**
 * Twitter Autocomplete API
 * Provides autocomplete suggestions for users and keywords
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
    profile_picture_url?: string;
    followers_count?: number;
    is_verified?: boolean;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get("zone_id");
    const query = searchParams.get("q");

    logger.info(`Autocomplete API called: zone=${zoneId}, query="${query}"`);

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

    // Get unique profile IDs from tweets in this zone
    const { data: tweetData, error: tweetError } = await supabase
      .from("twitter_tweets")
      .select("author_profile_id")
      .eq("zone_id", zoneId);

    if (tweetError) {
      logger.error("Error fetching tweets for autocomplete:", tweetError);
    }

    logger.debug(`Autocomplete: Found ${tweetData?.length || 0} tweets in zone`);

    if (tweetData && tweetData.length > 0) {
      // Get unique profile IDs from zone
      const uniqueProfileIds = [...new Set(tweetData.map((t) => t.author_profile_id))];

      logger.debug(`Autocomplete: Searching for "${cleanQuery}" in zone with ${uniqueProfileIds.length} unique profiles`);

      // Fetch profiles in batches to avoid "Request Header Too Large" error
      // .in() has HTTP header size limits with many UUIDs
      const BATCH_SIZE = 100;
      const allProfiles = [];
      
      for (let i = 0; i < uniqueProfileIds.length; i += BATCH_SIZE) {
        const batch = uniqueProfileIds.slice(i, i + BATCH_SIZE);
        const { data: batchProfiles, error: batchError } = await supabase
          .from("twitter_profiles")
          .select("id, username, name, profile_picture_url, followers_count, is_verified, is_blue_verified")
          .in("id", batch);

        if (batchError) {
          logger.error(`Error fetching profiles batch ${i / BATCH_SIZE + 1}:`, batchError);
          continue; // Skip this batch but continue with others
        }

        if (batchProfiles) {
          allProfiles.push(...batchProfiles);
        }
      }

      logger.debug(`Autocomplete: Fetched ${allProfiles.length} total profiles from zone`);

      if (allProfiles.length > 0) {
        // Filter profiles by username or name (case-insensitive)
        const matchingProfiles = allProfiles
          .filter((p) => 
            p.username.toLowerCase().includes(cleanQuery) ||
            p.name.toLowerCase().includes(cleanQuery)
          )
          .sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0))
          .slice(0, 8);

        logger.debug(`Autocomplete: Found ${matchingProfiles.length} matching profiles`);

        matchingProfiles.forEach((profile) => {
          results.push({
            type: "user",
            value: `@${profile.username}`,
            label: `${profile.name} (@${profile.username})`,
            metadata: {
              profile_picture_url: profile.profile_picture_url || undefined,
              followers_count: profile.followers_count,
              is_verified: profile.is_verified || profile.is_blue_verified,
            },
          });
        });
      }
    }

    // Search for keywords in tweet text
    // Always search keywords unless query is very short
    if (cleanQuery.length >= 2) {
      // Get most common words from tweets containing the query
      const { data: tweets, error: tweetError } = await supabase
        .from("twitter_tweets")
        .select("text")
        .eq("zone_id", zoneId)
        .textSearch("text", cleanQuery)
        .order("total_engagement", { ascending: false })
        .limit(20);

      if (tweetError) {
        logger.error("Error searching tweets:", tweetError);
      } else if (tweets) {
        // Extract keywords from tweets
        const keywords = new Set<string>();
        tweets.forEach((tweet) => {
          const words = tweet.text
            .toLowerCase()
            .split(/\s+/)
            .filter((word: string) => {
              // Remove URLs, mentions, and short words
              return (
                word.length > 2 &&
                !word.startsWith("http") &&
                !word.startsWith("@") &&
                word.includes(cleanQuery)
              );
            });
          words.forEach((word: string) => {
            // Clean word (remove punctuation)
            const cleanWord = word.replace(/[^\w]/g, "");
            if (cleanWord.length > 2) {
              keywords.add(cleanWord);
            }
          });
        });

        // Add unique keywords to results (max 5)
        Array.from(keywords)
          .slice(0, 5)
          .forEach((keyword) => {
            results.push({
              type: "keyword",
              value: keyword,
              label: keyword,
            });
          });
      }
    }

    // Also search hashtags
    if (cleanQuery.length >= 2) {
      const { data: hashtags, error: hashtagError } = await supabase
        .from("twitter_entities")
        .select("entity_value, entity_normalized")
        .eq("zone_id", zoneId)
        .eq("entity_type", "hashtag")
        .ilike("entity_normalized", `%${cleanQuery}%`)
        .limit(5);

      if (hashtagError) {
        logger.error("Error searching hashtags:", hashtagError);
      } else if (hashtags) {
        // Count occurrences and add unique hashtags
        const uniqueHashtags = new Map<string, number>();
        hashtags.forEach((tag) => {
          const count = uniqueHashtags.get(tag.entity_normalized) || 0;
          uniqueHashtags.set(tag.entity_normalized, count + 1);
        });

        Array.from(uniqueHashtags.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .forEach(([hashtag]) => {
            results.push({
              type: "keyword",
              value: `#${hashtag}`,
              label: `#${hashtag}`,
            });
          });
      }
    }

    logger.debug(`Autocomplete: Total results before dedup: ${results.length}`);

    // Remove duplicates and limit total results
    const uniqueResults = results
      .filter(
        (result, index, self) =>
          index === self.findIndex((r) => r.value === result.value)
      )
      .slice(0, 10);

    logger.debug(`Autocomplete: Returning ${uniqueResults.length} final results`);

    return NextResponse.json({
      success: true,
      results: uniqueResults,
    });
  } catch (error) {
    logger.error("Autocomplete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to perform autocomplete search",
      },
      { status: 500 }
    );
  }
}

