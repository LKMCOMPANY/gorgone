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
 */
export async function addWebhookRule(rule: {
  query: string;
  interval?: number;
  webhook_url: string;
}): Promise<{ rule_id: string } | null> {
  try {
    const endpoint = "/v1/webhook/add_rule";

    const data = await twitterApiFetch<{ rule_id?: string; id?: string }>(
      endpoint,
      {
        method: "POST",
        body: JSON.stringify({
          query: rule.query,
          interval: rule.interval || 100,
          webhook_url: rule.webhook_url,
        }),
      }
    );

    const ruleId = data.rule_id || data.id;
    if (!ruleId) {
      throw new Error("No rule_id returned from API");
    }

    logger.info(`Webhook rule created: ${ruleId}`);

    return { rule_id: ruleId };
  } catch (error) {
    logger.error("Error adding webhook rule:", error);
    return null;
  }
}

/**
 * Get webhook rules
 */
export async function getWebhookRules(): Promise<WebhookRule[]> {
  try {
    const endpoint = "/v1/webhook/get_rules";

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
 */
export async function updateWebhookRule(
  ruleId: string,
  updates: {
    query?: string;
    interval?: number;
    webhook_url?: string;
  }
): Promise<boolean> {
  try {
    const endpoint = "/v1/webhook/update_rule";

    await twitterApiFetch(endpoint, {
      method: "PUT",
      body: JSON.stringify({
        rule_id: ruleId,
        ...updates,
      }),
    });

    logger.info(`Webhook rule updated: ${ruleId}`);
    return true;
  } catch (error) {
    logger.error(`Error updating webhook rule ${ruleId}:`, error);
    return false;
  }
}

/**
 * Delete webhook rule
 */
export async function deleteWebhookRule(ruleId: string): Promise<boolean> {
  try {
    const endpoint = "/v1/webhook/delete_rule";

    await twitterApiFetch(endpoint, {
      method: "DELETE",
      body: JSON.stringify({
        rule_id: ruleId,
      }),
    });

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

