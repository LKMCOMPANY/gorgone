/**
 * TwitterAPI.io Client
 * Handles all communication with twitterapi.io API
 */

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { TwitterAPITweet } from "@/types";

const TWITTER_API_BASE_URL = "https://api.twitterapi.io";

/**
 * Base fetch wrapper with error handling
 */
async function twitterApiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${TWITTER_API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "X-API-Key": env.twitter.apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `TwitterAPI.io error (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    logger.error(`TwitterAPI.io request failed:`, error);
    throw error;
  }
}

/**
 * Advanced Search API
 */
export async function advancedSearch(params: {
  query: string;
  queryType?: "Top" | "Latest";
  count?: number;
  cursor?: string;
}): Promise<{
  tweets: TwitterAPITweet[];
  next_cursor?: string;
}> {
  const { query, queryType = "Latest", count = 100, cursor } = params;

  const queryParams = new URLSearchParams({
    query,
    queryType,
    count: count.toString(),
  });

  if (cursor) {
    queryParams.append("cursor", cursor);
  }

  const endpoint = `/twitter/tweet/advanced_search?${queryParams.toString()}`;

  const data = await twitterApiFetch<{
    results?: TwitterAPITweet[];
    tweets?: TwitterAPITweet[];
    next_cursor?: string;
  }>(endpoint, {
    method: "GET",
  });

  // Handle different response formats
  const tweets = data.results || data.tweets || [];

  return {
    tweets,
    next_cursor: data.next_cursor,
  };
}

/**
 * Get tweet by ID
 */
export async function getTweetById(
  tweetId: string
): Promise<TwitterAPITweet | null> {
  try {
    const endpoint = `/twitter/tweet?id=${tweetId}`;

    const data = await twitterApiFetch<{ tweet?: TwitterAPITweet }>(endpoint, {
      method: "GET",
    });

    return data.tweet || null;
  } catch (error) {
    logger.error(`Error fetching tweet ${tweetId}:`, error);
    return null;
  }
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<any | null> {
  try {
    const endpoint = `/twitter/user?username=${username}`;

    const data = await twitterApiFetch<{ user?: any }>(endpoint, {
      method: "GET",
    });

    return data.user || null;
  } catch (error) {
    logger.error(`Error fetching user ${username}:`, error);
    return null;
  }
}

/**
 * Webhook Rule Management
 */

export interface WebhookRule {
  id?: string;
  query: string;
  interval?: number;
  webhook_url?: string;
}

/**
 * Add webhook rule
 * @see https://docs.twitterapi.io/api-reference/endpoint/add_webhook_rule
 */
export async function addWebhookRule(rule: {
  tag: string;
  value: string;
  interval_seconds: number;
}): Promise<{ rule_id: string } | null> {
  try {
    const endpoint = "/oapi/tweet_filter/add_rule";

    const data = await twitterApiFetch<{ 
      rule_id?: string;
      status?: string;
      msg?: string;
    }>(endpoint, {
      method: "POST",
      body: JSON.stringify({
        tag: rule.tag,
        value: rule.value,
        interval_seconds: rule.interval_seconds,
      }),
    });

    if (!data.rule_id) {
      throw new Error(data.msg || "No rule_id returned from API");
    }

    logger.info(`Webhook rule created: ${data.rule_id}`, {
      tag: rule.tag,
      status: data.status,
    });

    return { rule_id: data.rule_id };
  } catch (error) {
    logger.error("Error adding webhook rule:", error);
    return null;
  }
}

/**
 * Get webhook rules
 * @see https://docs.twitterapi.io/api-reference/endpoint/get_webhook_rules
 */
export async function getWebhookRules(): Promise<WebhookRule[]> {
  try {
    const endpoint = "/oapi/tweet_filter/get_rules";

    const data = await twitterApiFetch<{ rules?: WebhookRule[] }>(endpoint, {
      method: "GET",
    });

    return data.rules || [];
  } catch (error) {
    logger.error("Error fetching webhook rules:", error);
    return [];
  }
}

/**
 * Update webhook rule
 * @see https://docs.twitterapi.io/api-reference/endpoint/update_webhook_rule
 * Note: All fields are REQUIRED, not partial updates
 */
export async function updateWebhookRule(
  ruleId: string,
  rule: {
    tag: string;
    value: string;
    interval_seconds: number;
    is_effect?: 0 | 1; // 1 = active, 0 = inactive
  }
): Promise<boolean> {
  try {
    const endpoint = "/oapi/tweet_filter/update_rule";

    const data = await twitterApiFetch<{
      status?: string;
      msg?: string;
    }>(endpoint, {
      method: "POST", // POST, not PUT!
      body: JSON.stringify({
        rule_id: ruleId,
        tag: rule.tag,
        value: rule.value,
        interval_seconds: rule.interval_seconds,
        is_effect: rule.is_effect ?? 1, // Default to active
      }),
    });

    if (data.status !== "success") {
      throw new Error(data.msg || "Update failed");
    }

    logger.info(`Webhook rule updated: ${ruleId}`);
    return true;
  } catch (error) {
    logger.error(`Error updating webhook rule ${ruleId}:`, error);
    return false;
  }
}

/**
 * Delete webhook rule
 * @see https://docs.twitterapi.io/api-reference/endpoint/delete_webhook_rule
 */
export async function deleteWebhookRule(ruleId: string): Promise<boolean> {
  try {
    const endpoint = "/oapi/tweet_filter/delete_rule";

    const data = await twitterApiFetch<{
      status?: string;
      msg?: string;
    }>(endpoint, {
      method: "DELETE",
      body: JSON.stringify({
        rule_id: ruleId,
      }),
    });

    if (data.status !== "success") {
      throw new Error(data.msg || "Delete failed");
    }

    logger.info(`Webhook rule deleted: ${ruleId}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting webhook rule ${ruleId}:`, error);
    return false;
  }
}

/**
 * Test API connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    // Try a simple search to test connectivity
    await advancedSearch({
      query: "test",
      count: 1,
    });

    logger.info("TwitterAPI.io connection test successful");
    return true;
  } catch (error) {
    logger.error("TwitterAPI.io connection test failed:", error);
    return false;
  }
}

/**
 * Get API rate limit status (if available in headers)
 */
export async function getRateLimitStatus(): Promise<{
  remaining: number | null;
  limit: number | null;
  reset: Date | null;
}> {
  // TwitterAPI.io may not expose rate limits in the same way as Twitter
  // This is a placeholder for future implementation
  return {
    remaining: null,
    limit: null,
    reset: null,
  };
}

