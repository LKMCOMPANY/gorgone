/**
 * Twitter Tweets Data Layer
 * Handles all tweet-related database operations
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type {
  TwitterTweet,
  TwitterTweetWithProfile,
  TwitterAPITweet,
} from "@/types";

/**
 * Get tweets by zone with pagination
 */
export async function getTweetsByZone(
  zoneId: string,
  options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    includeProfile?: boolean;
  } = {}
): Promise<TwitterTweet[] | TwitterTweetWithProfile[]> {
  try {
    const supabase = createAdminClient();
    const {
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      includeProfile = false,
    } = options;

    let query = supabase
      .from("twitter_tweets")
      .select(
        includeProfile
          ? "*, author:twitter_profiles(*)"
          : "*"
      )
      .eq("zone_id", zoneId)
      .order("twitter_created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (startDate) {
      query = query.gte("twitter_created_at", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("twitter_created_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data as any) || [];
  } catch (error) {
    logger.error(`Error fetching tweets for zone ${zoneId}:`, error);
    return [];
  }
}

/**
 * Get tweet by internal database ID
 */
export async function getTweetById(
  tweetId: string,
  includeProfile = false
): Promise<TwitterTweet | TwitterTweetWithProfile | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_tweets")
      .select(
        includeProfile
          ? "*, author:twitter_profiles(*)"
          : "*"
      )
      .eq("id", tweetId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data as any;
  } catch (error) {
    logger.error(`Error fetching tweet ${tweetId}:`, error);
    return null;
  }
}

/**
 * Get tweet by Twitter's external ID
 */
export async function getTweetByTwitterId(
  twitterTweetId: string
): Promise<TwitterTweet | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_tweets")
      .select("*")
      .eq("tweet_id", twitterTweetId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data as TwitterTweet;
  } catch (error) {
    logger.error(`Error fetching tweet by Twitter ID ${twitterTweetId}:`, error);
    return null;
  }
}

/**
 * Create a single tweet
 */
export async function createTweet(
  tweet: Partial<TwitterTweet>
): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_tweets")
      .insert(tweet)
      .select("id")
      .single();

    if (error) throw error;

    logger.debug(`Tweet created: ${data.id}`);
    return data.id;
  } catch (error) {
    logger.error("Error creating tweet:", error);
    return null;
  }
}

/**
 * Bulk create tweets (for webhook processing)
 * Returns array of created tweet IDs
 */
export async function bulkCreateTweets(
  tweets: Partial<TwitterTweet>[]
): Promise<string[]> {
  if (tweets.length === 0) return [];

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_tweets")
      .insert(tweets)
      .select("id");

    if (error) throw error;

    logger.info(`Bulk created ${data.length} tweets`);
    return data.map((t) => t.id);
  } catch (error) {
    logger.error("Error bulk creating tweets:", error);
    return [];
  }
}

/**
 * Upsert tweet (create or update based on tweet_id)
 * Used for updating engagement metrics
 */
export async function upsertTweet(
  tweet: Partial<TwitterTweet>
): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_tweets")
      .upsert(tweet, {
        onConflict: "tweet_id",
        ignoreDuplicates: false,
      })
      .select("id")
      .single();

    if (error) throw error;

    return data.id;
  } catch (error) {
    logger.error("Error upserting tweet:", error);
    return null;
  }
}

/**
 * Get tweets by conversation ID (thread)
 */
export async function getTweetsByConversation(
  conversationId: string,
  includeProfile = true
): Promise<TwitterTweetWithProfile[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_tweets")
      .select("*, author:twitter_profiles(*)")
      .eq("conversation_id", conversationId)
      .order("twitter_created_at", { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error(
      `Error fetching tweets by conversation ${conversationId}:`,
      error
    );
    return [];
  }
}

/**
 * Search tweets by text (full-text search)
 */
export async function searchTweets(
  zoneId: string,
  searchTerm: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<TwitterTweetWithProfile[]> {
  try {
    const supabase = createAdminClient();
    const { limit = 50, offset = 0 } = options;

    const { data, error } = await supabase
      .from("twitter_tweets")
      .select("*, author:twitter_profiles(*)")
      .eq("zone_id", zoneId)
      .textSearch("text", searchTerm)
      .order("twitter_created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error(`Error searching tweets in zone ${zoneId}:`, error);
    return [];
  }
}

/**
 * Get top tweets by engagement
 */
export async function getTopTweets(
  zoneId: string,
  options: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<TwitterTweetWithProfile[]> {
  try {
    const supabase = createAdminClient();
    const { limit = 10, startDate, endDate } = options;

    let query = supabase
      .from("twitter_tweets")
      .select("*, author:twitter_profiles(*)")
      .eq("zone_id", zoneId)
      .order("total_engagement", { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte("twitter_created_at", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("twitter_created_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error(`Error fetching top tweets for zone ${zoneId}:`, error);
    return [];
  }
}

/**
 * Get tweets by author profile
 */
export async function getTweetsByAuthor(
  authorProfileId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<TwitterTweet[]> {
  try {
    const supabase = createAdminClient();
    const { limit = 50, offset = 0 } = options;

    const { data, error } = await supabase
      .from("twitter_tweets")
      .select("*")
      .eq("author_profile_id", authorProfileId)
      .order("twitter_created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return (data as TwitterTweet[]) || [];
  } catch (error) {
    logger.error(
      `Error fetching tweets by author ${authorProfileId}:`,
      error
    );
    return [];
  }
}

/**
 * Update tweet engagement metrics
 */
export async function updateTweetEngagement(
  tweetId: string,
  metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    view_count?: number;
    bookmark_count?: number;
  }
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("twitter_tweets")
      .update(metrics)
      .eq("id", tweetId);

    if (error) throw error;

    logger.debug(`Tweet engagement updated: ${tweetId}`);
  } catch (error) {
    logger.error(`Error updating tweet engagement ${tweetId}:`, error);
  }
}

/**
 * Get tweets with filters
 */
export async function getFilteredTweets(
  zoneId: string,
  filters: {
    has_media?: boolean;
    has_links?: boolean;
    has_hashtags?: boolean;
    is_reply?: boolean;
    verified_only?: boolean;
    min_engagement?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
): Promise<TwitterTweetWithProfile[]> {
  try {
    const supabase = createAdminClient();
    const { limit = 50, offset = 0 } = filters;

    let query = supabase
      .from("twitter_tweets")
      .select("*, author:twitter_profiles(*)")
      .eq("zone_id", zoneId);

    // Apply filters
    if (filters.has_media !== undefined) {
      query = query.eq("has_media", filters.has_media);
    }

    if (filters.has_links !== undefined) {
      query = query.eq("has_links", filters.has_links);
    }

    if (filters.has_hashtags !== undefined) {
      query = query.eq("has_hashtags", filters.has_hashtags);
    }

    if (filters.is_reply !== undefined) {
      query = query.eq("is_reply", filters.is_reply);
    }

    if (filters.min_engagement) {
      query = query.gte("total_engagement", filters.min_engagement);
    }

    if (filters.startDate) {
      query = query.gte("twitter_created_at", filters.startDate.toISOString());
    }

    if (filters.endDate) {
      query = query.lte("twitter_created_at", filters.endDate.toISOString());
    }

    // Filter by verified authors if requested
    if (filters.verified_only) {
      // Use a better approach: filter using a subquery-like pattern
      // Instead of loading all verified IDs, we use a join
      query = query
        .not("author_profile_id", "is", null)
        .filter("author:twitter_profiles.is_verified", "eq", true);
    }

    query = query
      .order("twitter_created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error(`Error fetching filtered tweets for zone ${zoneId}:`, error);
    return [];
  }
}

/**
 * Count tweets in a zone (with optional filters)
 */
export async function countTweets(
  zoneId: string,
  filters?: {
    startDate?: Date;
    endDate?: Date;
  }
): Promise<number> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("twitter_tweets")
      .select("*", { count: "exact", head: true })
      .eq("zone_id", zoneId);

    if (filters?.startDate) {
      query = query.gte("twitter_created_at", filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte("twitter_created_at", filters.endDate.toISOString());
    }

    const { count, error } = await query;

    if (error) throw error;

    return count || 0;
  } catch (error) {
    logger.error(`Error counting tweets for zone ${zoneId}:`, error);
    return 0;
  }
}

/**
 * Delete old tweets (cleanup/archival)
 */
export async function deleteOldTweets(
  zoneId: string,
  olderThanDays: number
): Promise<number> {
  try {
    const supabase = createAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await supabase
      .from("twitter_tweets")
      .delete()
      .eq("zone_id", zoneId)
      .lt("twitter_created_at", cutoffDate.toISOString())
      .select("id");

    if (error) throw error;

    const deletedCount = data?.length || 0;
    logger.info(
      `Deleted ${deletedCount} tweets older than ${olderThanDays} days from zone ${zoneId}`
    );

    return deletedCount;
  } catch (error) {
    logger.error(`Error deleting old tweets from zone ${zoneId}:`, error);
    return 0;
  }
}

