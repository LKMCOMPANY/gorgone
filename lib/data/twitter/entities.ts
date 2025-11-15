/**
 * Twitter Entities Data Layer
 * Handles hashtags, mentions, URLs extraction and storage
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { TwitterEntity, TwitterAPITweet } from "@/types";

/**
 * Extract and store entities from a tweet
 */
export async function extractAndStoreEntities(
  tweetDbId: string,
  zoneId: string,
  apiTweet: TwitterAPITweet
): Promise<void> {
  try {
    const entities: Partial<TwitterEntity>[] = [];

    // Extract hashtags (API uses hashtags[].text)
    if (apiTweet.entities?.hashtags) {
      for (const hashtag of apiTweet.entities.hashtags) {
        const tag = hashtag.text;
        entities.push({
          tweet_id: tweetDbId,
          zone_id: zoneId,
          entity_type: "hashtag",
          entity_value: tag,
          entity_normalized: tag.toLowerCase(),
          start_index: hashtag.indices?.[0] || null,
          end_index: hashtag.indices?.[1] || null,
        });
      }
    }

    // Extract mentions (API uses user_mentions[].screen_name)
    if (apiTweet.entities?.user_mentions) {
      for (const mention of apiTweet.entities.user_mentions) {
        const screenName = mention.screen_name;
        entities.push({
          tweet_id: tweetDbId,
          zone_id: zoneId,
          entity_type: "mention",
          entity_value: screenName,
          entity_normalized: screenName.toLowerCase(),
          start_index: mention.indices?.[0] || null,
          end_index: mention.indices?.[1] || null,
        });
      }
    }

    // Extract URLs
    if (apiTweet.entities?.urls) {
      for (const url of apiTweet.entities.urls) {
        const expandedUrl = url.expanded_url || url.url;
        entities.push({
          tweet_id: tweetDbId,
          zone_id: zoneId,
          entity_type: "url",
          entity_value: expandedUrl,
          entity_normalized: expandedUrl.toLowerCase(),
          start_index: url.indices?.[0] || null,
          end_index: url.indices?.[1] || null,
        });
      }
    }

    // Bulk insert entities
    if (entities.length > 0) {
      const supabase = createAdminClient();
      const { error } = await supabase.from("twitter_entities").insert(entities);

      if (error) throw error;

      logger.debug(`Stored ${entities.length} entities for tweet: ${tweetDbId}`);
    }
  } catch (error) {
    logger.error(`Error extracting entities for tweet ${tweetDbId}:`, error);
  }
}

/**
 * Get entities for a tweet
 */
export async function getEntitiesByTweet(
  tweetId: string,
  entityType?: "hashtag" | "mention" | "url" | "cashtag"
): Promise<TwitterEntity[]> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("twitter_entities")
      .select("*")
      .eq("tweet_id", tweetId);

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data as TwitterEntity[]) || [];
  } catch (error) {
    logger.error(`Error fetching entities for tweet ${tweetId}:`, error);
    return [];
  }
}

/**
 * Get trending hashtags in a zone
 */
export async function getTrendingHashtags(
  zoneId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
): Promise<{ hashtag: string; count: number }[]> {
  try {
    const supabase = createAdminClient();
    const { limit = 20, startDate, endDate } = options;

    let query = supabase.rpc("get_trending_hashtags", {
      p_zone_id: zoneId,
      p_limit: limit,
    });

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error(`Error fetching trending hashtags for zone ${zoneId}:`, error);
    return [];
  }
}

/**
 * Get top mentioned users in a zone
 */
export async function getTopMentions(
  zoneId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
): Promise<{ mention: string; count: number }[]> {
  try {
    const supabase = createAdminClient();
    const { limit = 20, startDate, endDate } = options;

    let query = supabase.rpc("get_top_mentions", {
      p_zone_id: zoneId,
      p_limit: limit,
    });

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error(`Error fetching top mentions for zone ${zoneId}:`, error);
    return [];
  }
}

/**
 * Get tweets containing a specific hashtag
 */
export async function getTweetsByHashtag(
  zoneId: string,
  hashtag: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<any[]> {
  try {
    const supabase = createAdminClient();
    const { limit = 50, offset = 0 } = options;

    const { data, error } = await supabase
      .from("twitter_entities")
      .select("*, tweet:twitter_tweets!inner(*, author:twitter_profiles(*))")
      .eq("entity_type", "hashtag")
      .eq("entity_value", hashtag.replace("#", ""))
      .eq("tweet.zone_id", zoneId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error(
      `Error fetching tweets by hashtag ${hashtag} in zone ${zoneId}:`,
      error
    );
    return [];
  }
}

/**
 * Get tweets mentioning a specific user
 */
export async function getTweetsByMention(
  zoneId: string,
  username: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<any[]> {
  try {
    const supabase = createAdminClient();
    const { limit = 50, offset = 0 } = options;

    const { data, error } = await supabase
      .from("twitter_entities")
      .select("*, tweet:twitter_tweets!inner(*, author:twitter_profiles(*))")
      .eq("entity_type", "mention")
      .eq("entity_value", username.replace("@", ""))
      .eq("tweet.zone_id", zoneId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error(
      `Error fetching tweets by mention @${username} in zone ${zoneId}:`,
      error
    );
    return [];
  }
}

/**
 * Search entities (autocomplete)
 */
export async function searchEntities(
  zoneId: string,
  entityType: "hashtag" | "mention" | "url" | "cashtag",
  searchTerm: string,
  limit = 10
): Promise<{ value: string; count: number }[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("search_entities", {
      p_zone_id: zoneId,
      p_entity_type: entityType,
      p_search_term: searchTerm,
      p_limit: limit,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error(
      `Error searching ${entityType} entities in zone ${zoneId}:`,
      error
    );
    return [];
  }
}

