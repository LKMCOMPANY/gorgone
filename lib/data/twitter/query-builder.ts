/**
 * Twitter Query Builder
 * Generates Twitter search queries from simplified UI config
 */

import type { TwitterQueryBuilderConfig } from "@/types";

/**
 * Generate Twitter search query from builder config
 * Implements Twitter Advanced Search syntax
 */
export function generateQuery(config: TwitterQueryBuilderConfig): string {
  const parts: string[] = [];

  // User operators (OR logic within each group)
  const userParts: string[] = [];

  if (config.from_users.length > 0) {
    userParts.push(...config.from_users.map((u) => `from:${u.replace(/^@/, "")}`));
  }

  if (config.to_users.length > 0) {
    userParts.push(...config.to_users.map((u) => `to:${u.replace(/^@/, "")}`));
  }

  if (config.mentions.length > 0) {
    userParts.push(...config.mentions.map((u) => `@${u.replace(/^@/, "")}`));
  }

  // Keywords (OR logic)
  if (config.keywords.length > 0) {
    userParts.push(
      ...config.keywords.map((k) => (k.includes(" ") ? `"${k}"` : k))
    );
  }

  // Hashtags (OR logic)
  if (config.hashtags.length > 0) {
    userParts.push(...config.hashtags.map((h) => `#${h.replace(/^#/, "")}`));
  }

  // Combine user parts with OR
  if (userParts.length > 0) {
    parts.push(userParts.join(" OR "));
  }

  // Exclude keywords (AND logic)
  if (config.exclude_keywords.length > 0) {
    parts.push(...config.exclude_keywords.map((k) => `-${k}`));
  }

  // Exclude users (AND logic)
  if (config.exclude_users.length > 0) {
    parts.push(...config.exclude_users.map((u) => `-from:${u.replace(/^@/, "")}`));
  }

  // Filters (AND logic)
  if (config.verified_only) {
    parts.push("filter:verified");
  }

  if (config.has_media) {
    parts.push("filter:media");
  }

  if (config.has_links) {
    parts.push("filter:links");
  }

  // Engagement thresholds (AND logic)
  if (config.min_retweets !== null && config.min_retweets > 0) {
    parts.push(`min_retweets:${config.min_retweets}`);
  }

  if (config.min_likes !== null && config.min_likes > 0) {
    parts.push(`min_faves:${config.min_likes}`);
  }

  if (config.min_replies !== null && config.min_replies > 0) {
    parts.push(`min_replies:${config.min_replies}`);
  }

  return parts.join(" ");
}

/**
 * Validate query builder config
 */
export function validateConfig(
  config: TwitterQueryBuilderConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if at least one query operator is provided
  const hasQueryOperators =
    config.from_users.length > 0 ||
    config.to_users.length > 0 ||
    config.mentions.length > 0 ||
    config.keywords.length > 0 ||
    config.hashtags.length > 0;

  if (!hasQueryOperators) {
    errors.push(
      "At least one query operator is required (users, keywords, mentions, or hashtags)"
    );
  }

  // Validate engagement thresholds
  if (config.min_retweets !== null && config.min_retweets < 0) {
    errors.push("Minimum retweets cannot be negative");
  }

  if (config.min_likes !== null && config.min_likes < 0) {
    errors.push("Minimum likes cannot be negative");
  }

  if (config.min_replies !== null && config.min_replies < 0) {
    errors.push("Minimum replies cannot be negative");
  }

  // Validate interval
  if (config.interval && config.interval < 60) {
    errors.push("Interval must be at least 60 seconds");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse a simple query string into builder config (basic reverse engineering)
 */
export function parseQueryToConfig(query: string): TwitterQueryBuilderConfig {
  const config: TwitterQueryBuilderConfig = {
    from_users: [],
    to_users: [],
    mentions: [],
    keywords: [],
    hashtags: [],
    exclude_keywords: [],
    exclude_users: [],
    verified_only: false,
    has_media: false,
    has_links: false,
    min_retweets: null,
    min_likes: null,
    min_replies: null,
  };

  // Split query into tokens
  const tokens = query.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

  for (const token of tokens) {
    // From users
    if (token.startsWith("from:")) {
      config.from_users.push(token.replace("from:", ""));
    }
    // To users
    else if (token.startsWith("to:")) {
      config.to_users.push(token.replace("to:", ""));
    }
    // Mentions
    else if (token.startsWith("@")) {
      config.mentions.push(token.replace("@", ""));
    }
    // Hashtags
    else if (token.startsWith("#")) {
      config.hashtags.push(token.replace("#", ""));
    }
    // Exclude keywords
    else if (token.startsWith("-") && !token.includes(":")) {
      config.exclude_keywords.push(token.replace("-", ""));
    }
    // Exclude users
    else if (token.startsWith("-from:")) {
      config.exclude_users.push(token.replace("-from:", ""));
    }
    // Filters
    else if (token === "filter:verified") {
      config.verified_only = true;
    } else if (token === "filter:media") {
      config.has_media = true;
    } else if (token === "filter:links") {
      config.has_links = true;
    }
    // Min retweets
    else if (token.startsWith("min_retweets:")) {
      config.min_retweets = parseInt(token.replace("min_retweets:", ""), 10);
    }
    // Min likes
    else if (token.startsWith("min_faves:")) {
      config.min_likes = parseInt(token.replace("min_faves:", ""), 10);
    }
    // Min replies
    else if (token.startsWith("min_replies:")) {
      config.min_replies = parseInt(token.replace("min_replies:", ""), 10);
    }
    // Regular keywords (remove quotes if present)
    else if (token !== "OR" && token !== "AND") {
      config.keywords.push(token.replace(/"/g, ""));
    }
  }

  return config;
}

/**
 * Get query complexity score (for rate limiting)
 */
export function getQueryComplexity(config: TwitterQueryBuilderConfig): number {
  let complexity = 0;

  // Base complexity from operators
  complexity += config.from_users.length * 2;
  complexity += config.to_users.length * 2;
  complexity += config.mentions.length * 1;
  complexity += config.keywords.length * 3;
  complexity += config.hashtags.length * 2;
  complexity += config.exclude_keywords.length * 1;
  complexity += config.exclude_users.length * 1;

  // Additional complexity from filters
  if (config.verified_only) complexity += 1;
  if (config.has_media) complexity += 1;
  if (config.has_links) complexity += 1;
  if (config.min_retweets) complexity += 2;
  if (config.min_likes) complexity += 2;
  if (config.min_replies) complexity += 2;

  return complexity;
}

/**
 * Estimate expected results per hour (rough estimate)
 */
export function estimateResultsPerHour(
  config: TwitterQueryBuilderConfig
): { min: number; max: number; confidence: string } {
  const complexity = getQueryComplexity(config);

  // Very rough heuristics
  if (complexity < 5) {
    return { min: 100, max: 1000, confidence: "low" };
  } else if (complexity < 10) {
    return { min: 50, max: 500, confidence: "medium" };
  } else if (complexity < 20) {
    return { min: 10, max: 100, confidence: "medium" };
  } else {
    return { min: 1, max: 50, confidence: "high" };
  }
}

/**
 * Generate human-readable query description
 */
export function getQueryDescription(config: TwitterQueryBuilderConfig): string {
  const parts: string[] = [];

  if (config.from_users.length > 0) {
    parts.push(`from users: ${config.from_users.join(", ")}`);
  }

  if (config.to_users.length > 0) {
    parts.push(`to users: ${config.to_users.join(", ")}`);
  }

  if (config.mentions.length > 0) {
    parts.push(`mentioning: ${config.mentions.join(", ")}`);
  }

  if (config.keywords.length > 0) {
    parts.push(`containing: ${config.keywords.join(", ")}`);
  }

  if (config.hashtags.length > 0) {
    parts.push(`with hashtags: ${config.hashtags.join(", ")}`);
  }

  if (config.exclude_keywords.length > 0) {
    parts.push(`excluding: ${config.exclude_keywords.join(", ")}`);
  }

  if (config.exclude_users.length > 0) {
    parts.push(`not from: ${config.exclude_users.join(", ")}`);
  }

  const filters: string[] = [];
  if (config.verified_only) filters.push("verified only");
  if (config.has_media) filters.push("with media");
  if (config.has_links) filters.push("with links");

  if (filters.length > 0) {
    parts.push(`filters: ${filters.join(", ")}`);
  }

  if (config.min_retweets) {
    parts.push(`min ${config.min_retweets} retweets`);
  }

  if (config.min_likes) {
    parts.push(`min ${config.min_likes} likes`);
  }

  if (config.min_replies) {
    parts.push(`min ${config.min_replies} replies`);
  }

  return parts.join(" | ");
}

