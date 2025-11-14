/**
 * Twitter Threads Data Layer
 * Handles conversation threads and reply chains
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { TwitterThreadView } from "@/types";

/**
 * Get full thread with context (uses view)
 */
export async function getThreadWithContext(
  conversationId: string
): Promise<TwitterThreadView[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_threads_with_context")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("depth", { ascending: true })
      .order("twitter_created_at", { ascending: true });

    if (error) throw error;

    return (data as TwitterThreadView[]) || [];
  } catch (error) {
    logger.error(`Error fetching thread ${conversationId}:`, error);
    return [];
  }
}

/**
 * Get thread tree structure
 */
export async function getThreadTree(
  conversationId: string
): Promise<any[]> {
  try {
    const supabase = createAdminClient();

    // Get all tweets in conversation
    const { data: tweets, error } = await supabase
      .from("twitter_threads_with_context")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("twitter_created_at", { ascending: true });

    if (error) throw error;
    if (!tweets || tweets.length === 0) return [];

    // Build tree structure
    const tweetMap = new Map();
    const tree: any[] = [];

    // First pass: create all nodes
    tweets.forEach((tweet) => {
      tweetMap.set(tweet.tweet_id, {
        ...tweet,
        replies: [],
      });
    });

    // Second pass: build tree
    tweets.forEach((tweet) => {
      const node = tweetMap.get(tweet.tweet_id);
      if (tweet.in_reply_to_tweet_id) {
        const parent = tweetMap.get(tweet.in_reply_to_tweet_id);
        if (parent) {
          parent.replies.push(node);
        } else {
          // Orphaned reply, add to root
          tree.push(node);
        }
      } else {
        // Root tweet
        tree.push(node);
      }
    });

    return tree;
  } catch (error) {
    logger.error(`Error building thread tree for ${conversationId}:`, error);
    return [];
  }
}

/**
 * Get orphaned tweets (replies without parent in database)
 */
export async function getOrphanedTweets(
  zoneId: string,
  limit = 100
): Promise<any[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_orphaned_replies")
      .select("*")
      .eq("zone_id", zoneId)
      .order("twitter_created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error(`Error fetching orphaned tweets for zone ${zoneId}:`, error);
    return [];
  }
}

/**
 * Check if a tweet is orphaned
 */
export async function isOrphaned(tweetId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    // Get tweet
    const { data: tweet, error } = await supabase
      .from("twitter_tweets")
      .select("in_reply_to_tweet_id, is_reply")
      .eq("id", tweetId)
      .single();

    if (error) throw error;
    if (!tweet || !tweet.is_reply || !tweet.in_reply_to_tweet_id) {
      return false;
    }

    // Check if parent exists
    const { data: parent } = await supabase
      .from("twitter_tweets")
      .select("id")
      .eq("tweet_id", tweet.in_reply_to_tweet_id)
      .single();

    return !parent;
  } catch (error) {
    logger.error(`Error checking if tweet ${tweetId} is orphaned:`, error);
    return false;
  }
}

/**
 * Get conversation starter (root tweet)
 */
export async function getConversationStarter(
  conversationId: string
): Promise<any | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_tweets")
      .select("*, author:twitter_profiles(*)")
      .eq("conversation_id", conversationId)
      .eq("is_reply", false)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(
      `Error fetching conversation starter for ${conversationId}:`,
      error
    );
    return null;
  }
}

/**
 * Get direct replies to a tweet
 */
export async function getDirectReplies(
  tweetId: string
): Promise<any[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_tweets")
      .select("*, author:twitter_profiles(*)")
      .eq("in_reply_to_tweet_id", tweetId)
      .order("twitter_created_at", { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error(`Error fetching direct replies for tweet ${tweetId}:`, error);
    return [];
  }
}

/**
 * Get all conversations in a zone (grouped by conversation_id)
 */
export async function getConversations(
  zoneId: string,
  options: {
    limit?: number;
    offset?: number;
    minReplies?: number;
  } = {}
): Promise<any[]> {
  try {
    const supabase = createAdminClient();
    const { limit = 20, offset = 0, minReplies = 2 } = options;

    // Use RPC to get conversations with stats
    const { data, error } = await supabase.rpc("get_zone_conversations", {
      p_zone_id: zoneId,
      p_limit: limit,
      p_offset: offset,
      p_min_replies: minReplies,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error(`Error fetching conversations for zone ${zoneId}:`, error);
    return [];
  }
}

/**
 * Get thread statistics
 */
export async function getThreadStats(
  conversationId: string
): Promise<{
  total_tweets: number;
  unique_authors: number;
  max_depth: number;
  total_engagement: number;
} | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("get_thread_stats", {
      p_conversation_id: conversationId,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error(`Error fetching thread stats for ${conversationId}:`, error);
    return null;
  }
}

/**
 * Mark orphaned tweet as resolved (parent was fetched)
 */
export async function resolveOrphanedTweet(
  tweetId: string,
  parentTweetId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Update tweet with correct parent reference
    const { error } = await supabase
      .from("twitter_tweets")
      .update({
        in_reply_to_tweet_id: parentTweetId,
      })
      .eq("id", tweetId);

    if (error) throw error;

    logger.info(`Orphaned tweet resolved: ${tweetId} -> ${parentTweetId}`);
  } catch (error) {
    logger.error(`Error resolving orphaned tweet ${tweetId}:`, error);
  }
}

