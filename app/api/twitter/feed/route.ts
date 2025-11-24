/**
 * Twitter Feed API
 * Fetches tweets with sorting, filtering and profile tags
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { TwitterTweetWithProfile, TwitterProfileZoneTag } from "@/types";
import { enrichFeedWithClusters } from "@/lib/data/twitter/opinion-map";

export const dynamic = "force-dynamic";

// Date range to hours mapping
const DATE_RANGE_HOURS: Record<string, number> = {
  "1h": 1,
  "3h": 3,
  "6h": 6,
  "12h": 12,
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

// Sort options mapping to database columns
type SortOption = "recent" | "most_views" | "most_retweets" | "most_replies" | "most_likes" | "most_engagement";

const SORT_COLUMNS: Record<SortOption, { column: string; ascending: boolean }> = {
  recent: { column: "twitter_created_at", ascending: false },
  most_views: { column: "view_count", ascending: false },
  most_retweets: { column: "retweet_count", ascending: false },
  most_replies: { column: "reply_count", ascending: false },
  most_likes: { column: "like_count", ascending: false },
  most_engagement: { column: "total_engagement", ascending: false },
};

interface FeedTweetWithTags extends TwitterTweetWithProfile {
  profile_tags?: TwitterProfileZoneTag[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get("zone_id");

    if (!zoneId) {
      return NextResponse.json(
        { success: false, error: "Missing zone_id parameter" },
        { status: 400 }
      );
    }

    // Parse parameters
    const search = searchParams.get("search") || undefined;
    const searchType = searchParams.get("search_type") as "keyword" | "user" | undefined;
    const sortBy = (searchParams.get("sort_by") || "recent") as SortOption;
    const postType = searchParams.get("post_type") as "post" | "repost" | "reply" | "quote" | undefined;
    const profileTagType = searchParams.get("profile_tag_type") || undefined;
    const has_links = searchParams.get("has_links") === "true";
    const verified_only = searchParams.get("verified_only") === "true";
    const active_tracking_only = searchParams.get("active_tracking_only") === "true";
    const min_views = searchParams.get("min_views") ? parseInt(searchParams.get("min_views")!) : undefined;
    const min_retweets = searchParams.get("min_retweets") ? parseInt(searchParams.get("min_retweets")!) : undefined;
    const min_likes = searchParams.get("min_likes") ? parseInt(searchParams.get("min_likes")!) : undefined;
    const min_replies = searchParams.get("min_replies") ? parseInt(searchParams.get("min_replies")!) : undefined;
    const date_range = searchParams.get("date_range") || undefined;
    // Language & Location filters (NEW)
    const languages = searchParams.get("languages")?.split(",").filter(Boolean) || undefined;
    const locations = searchParams.get("locations")?.split("|").filter(Boolean) || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Calculate date range
    let startDate: Date | undefined;
    if (date_range && DATE_RANGE_HOURS[date_range]) {
      startDate = new Date();
      startDate.setHours(startDate.getHours() - DATE_RANGE_HOURS[date_range]);
    }

    const supabase = createAdminClient();
    const sortConfig = SORT_COLUMNS[sortBy] || SORT_COLUMNS.recent;

    // Build base query
    let query = supabase
      .from("twitter_tweets")
      .select("*, author:twitter_profiles(*)")
      .eq("zone_id", zoneId);

    // Apply search filters
    if (search && searchType === "user") {
      // Search by username
      const username = search.replace("@", "").toLowerCase();
      const { data: profile } = await supabase
        .from("twitter_profiles")
        .select("id")
        .eq("username", username)
        .single();

      if (profile) {
        query = query.eq("author_profile_id", profile.id);
      } else {
        // User not found - return empty results
        return NextResponse.json({
          success: true,
          tweets: [],
          count: 0,
          offset,
          limit,
        });
      }
    } else if (search && searchType === "keyword") {
      // Full-text search on tweet content
      query = query.textSearch("text", search);
    }

    // Apply filters
    if (has_links) {
      query = query.eq("has_links", true);
    }

    // Language filter (NEW)
    if (languages && languages.length > 0) {
      query = query.in("lang", languages);
    }

    // Location filter (NEW) - filter by profile location
    if (locations && locations.length > 0) {
      const { data: profilesWithLocation } = await supabase
        .from("twitter_profiles")
        .select("id")
        .in("location", locations);

      if (profilesWithLocation && profilesWithLocation.length > 0) {
        const profileIds = profilesWithLocation.map((p) => p.id);
        query = query.in("author_profile_id", profileIds);
      } else {
        // No profiles with these locations - return empty
        return NextResponse.json({
          success: true,
          tweets: [],
          count: 0,
          offset,
          limit,
        });
      }
    }

    if (verified_only) {
      // Get verified profile IDs first
      const { data: verifiedProfiles } = await supabase
        .from("twitter_profiles")
        .select("id")
        .or("is_verified.eq.true,is_blue_verified.eq.true");

      if (verifiedProfiles && verifiedProfiles.length > 0) {
        const verifiedIds = verifiedProfiles.map((p) => p.id);
        query = query.in("author_profile_id", verifiedIds);
      } else {
        // No verified profiles - return empty
        return NextResponse.json({
          success: true,
          tweets: [],
          count: 0,
          offset,
          limit,
        });
      }
    }

    if (profileTagType) {
      // Get profile IDs with this tag type in this zone
      const { data: taggedProfiles, error: tagError } = await supabase
        .from("twitter_profile_zone_tags")
        .select("profile_id")
        .eq("zone_id", zoneId)
        .eq("tag_type", profileTagType);

      if (tagError) {
        logger.error("Error fetching tagged profiles:", tagError);
      }

      if (taggedProfiles && taggedProfiles.length > 0) {
        const taggedProfileIds = taggedProfiles.map((p) => p.profile_id);
        query = query.in("author_profile_id", taggedProfileIds);
      } else {
        // No profiles with this tag - return empty
        return NextResponse.json({
          success: true,
          tweets: [],
          count: 0,
          offset,
          limit,
        });
      }
    }

    // Apply engagement filters
    if (min_views) {
      query = query.gte("view_count", min_views);
    }

    if (min_retweets) {
      query = query.gte("retweet_count", min_retweets);
    }

    if (min_likes) {
      query = query.gte("like_count", min_likes);
    }

    if (min_replies) {
      query = query.gte("reply_count", min_replies);
    }

    if (startDate) {
      query = query.gte("twitter_created_at", startDate.toISOString());
    }

    // Filter by tracking status (active only)
    if (active_tracking_only) {
      // Get tweet IDs with active tracking (tier = 'hot')
      const { data: activeTrackingTweets } = await supabase
        .from("twitter_engagement_tracking")
        .select("tweet_db_id")
        .eq("tier", "hot");

      if (activeTrackingTweets && activeTrackingTweets.length > 0) {
        const activeTweetIds = activeTrackingTweets.map((t) => t.tweet_db_id);
        query = query.in("id", activeTweetIds);
      } else {
        // No active tracking tweets - return empty
        return NextResponse.json({
          success: true,
          tweets: [],
          count: 0,
          offset,
          limit,
        });
      }
    }

    // Filter by post type BEFORE pagination (important for correct results)
    if (postType) {
      switch (postType) {
        case "reply":
          query = query.eq("is_reply", true);
          break;
        case "post":
          // Posts are: NOT reply AND NOT starting with "RT @"
          // We'll filter quotes in JS since they're in raw_data
          query = query.eq("is_reply", false);
          query = query.not("text", "like", "RT @%");
          break;
        case "repost":
          // Retweets start with "RT @"
          query = query.like("text", "RT @%");
          break;
        // Quote tweets need JS filtering (can't filter JSONB efficiently)
      }
    }

    // Apply sorting
    query = query.order(sortConfig.column, { ascending: sortConfig.ascending });

    // Apply pagination (AFTER post type filtering)
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: tweets, error } = await query;

    if (error) {
      logger.error("Feed query error:", error);
      throw error;
    }

    let typedTweets = (tweets as any) as TwitterTweetWithProfile[] || [];

    // Final filtering for quotes and posts (remove quotes from "post" filter)
    if (postType === "post") {
      // Remove quotes (have quoted_tweet in raw_data)
      typedTweets = typedTweets.filter((tweet) => {
        const hasQuotedTweet = tweet.raw_data?.quoted_tweet && 
                              tweet.raw_data?.quoted_tweet !== null &&
                              typeof tweet.raw_data?.quoted_tweet === 'object' &&
                              Object.keys(tweet.raw_data?.quoted_tweet).length > 0;
        return !hasQuotedTweet;
      });
    } else if (postType === "quote") {
      // Only quotes
      typedTweets = typedTweets.filter((tweet) => {
        const hasQuotedTweet = tweet.raw_data?.quoted_tweet && 
                              tweet.raw_data?.quoted_tweet !== null &&
                              typeof tweet.raw_data?.quoted_tweet === 'object' &&
                              Object.keys(tweet.raw_data?.quoted_tweet).length > 0;
        return hasQuotedTweet;
      });
    }

    // Fetch all profile tags in one query (more efficient than N queries)
    const uniqueProfileIds = [...new Set(typedTweets.map((t) => t.author_profile_id))];
    
    let allTags: TwitterProfileZoneTag[] = [];
    if (uniqueProfileIds.length > 0) {
      const { data: tagsData, error: tagsError } = await supabase
        .from("twitter_profile_zone_tags")
        .select("*")
        .eq("zone_id", zoneId)
        .in("profile_id", uniqueProfileIds);

      if (tagsError) {
        logger.error("Error fetching profile tags:", tagsError);
      } else {
        allTags = (tagsData as TwitterProfileZoneTag[]) || [];
      }
    }

    // Map tags to tweets
    const tweetsWithTags: FeedTweetWithTags[] = typedTweets.map((tweet) => ({
      ...tweet,
      profile_tags: allTags.filter((tag) => tag.profile_id === tweet.author_profile_id),
    }));

    logger.debug(`Fetched ${allTags.length} total tags for ${tweetsWithTags.length} tweets`);

    // Enrich tweets with opinion cluster data
    const enrichedTweets = await enrichFeedWithClusters(zoneId, tweetsWithTags);

    return NextResponse.json({
      success: true,
      tweets: enrichedTweets,
      count: enrichedTweets.length,
      offset,
      limit,
    });
  } catch (error) {
    logger.error("Feed API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tweets",
      },
      { status: 500 }
    );
  }
}

