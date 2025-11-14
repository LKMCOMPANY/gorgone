/**
 * Twitter Deduplicator Worker
 * Handles tweet deduplication and storage from webhooks
 */

import { logger } from "@/lib/logger";
import { createProfile, getProfileByTwitterId } from "@/lib/data/twitter/profiles";
import {
  getTweetByTwitterId,
  createTweet,
  upsertTweet,
} from "@/lib/data/twitter/tweets";
import { createEngagementTracking } from "@/lib/data/twitter/engagement";
import { extractAndStoreEntities } from "@/lib/data/twitter/entities";
import { getRuleByApiId } from "@/lib/data/twitter/rules";
import type { TwitterAPITweet, TwitterProfile, TwitterTweet } from "@/types";

interface ProcessingResult {
  created: number;
  duplicates: number;
  errors: number;
  updatedProfiles: number;
}

/**
 * Process incoming tweets from webhook
 */
export async function processIncomingTweets(
  tweets: TwitterAPITweet[],
  ruleId?: string | null
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    created: 0,
    duplicates: 0,
    errors: 0,
    updatedProfiles: 0,
  };

  // Get zone ID from rule ID
  let zoneId: string | null = null;
  if (ruleId) {
    const rule = await getRuleByApiId(ruleId);
    if (rule) {
      zoneId = rule.zone_id;
    } else {
      logger.warn(`No rule found for API rule ID: ${ruleId}`);
    }
  }

  if (!zoneId) {
    logger.error("Cannot process tweets without zone_id");
    return result;
  }

  // Process each tweet
  for (const apiTweet of tweets) {
    try {
      await processSingleTweet(apiTweet, zoneId, result);
    } catch (error) {
      logger.error(`Error processing tweet ${apiTweet.id}:`, error);
      result.errors++;
    }
  }

  return result;
}

/**
 * Process a single tweet
 */
async function processSingleTweet(
  apiTweet: TwitterAPITweet,
  zoneId: string,
  result: ProcessingResult
): Promise<void> {
  // Check if tweet already exists
  const existingTweet = await getTweetByTwitterId(apiTweet.id);

  if (existingTweet) {
    // Tweet exists, update engagement metrics
    logger.debug(`Tweet ${apiTweet.id} already exists, skipping`);
    result.duplicates++;
    return;
  }

  // Process author profile first
  const authorProfileId = await processAuthorProfile(apiTweet, zoneId);
  if (!authorProfileId) {
    throw new Error(`Failed to process author profile for tweet ${apiTweet.id}`);
  }

  // Calculate total engagement
  const totalEngagement =
    (apiTweet.retweet_count || 0) +
    (apiTweet.reply_count || 0) +
    (apiTweet.like_count || 0) +
    (apiTweet.quote_count || 0);

  // Prepare tweet data
  const tweetData: Partial<TwitterTweet> = {
    zone_id: zoneId,
    tweet_id: apiTweet.id,
    author_profile_id: authorProfileId,
    conversation_id: apiTweet.conversation_id || null,
    text: apiTweet.text,
    lang: apiTweet.lang || null,
    source: apiTweet.source || null,
    twitter_created_at: apiTweet.created_at,
    collected_at: new Date().toISOString(),
    retweet_count: apiTweet.retweet_count || 0,
    reply_count: apiTweet.reply_count || 0,
    like_count: apiTweet.like_count || 0,
    quote_count: apiTweet.quote_count || 0,
    view_count: apiTweet.view_count || 0,
    bookmark_count: apiTweet.bookmark_count || 0,
    total_engagement: totalEngagement,
    has_media: !!(apiTweet.entities?.media && apiTweet.entities.media.length > 0),
    has_links: !!(apiTweet.entities?.urls && apiTweet.entities.urls.length > 0),
    has_hashtags: !!(
      apiTweet.entities?.hashtags && apiTweet.entities.hashtags.length > 0
    ),
    has_mentions: !!(
      apiTweet.entities?.mentions && apiTweet.entities.mentions.length > 0
    ),
    is_reply: !!apiTweet.in_reply_to_status_id,
    in_reply_to_tweet_id: apiTweet.in_reply_to_status_id || null,
    in_reply_to_user_id: apiTweet.in_reply_to_user_id?.toString() || null,
    in_reply_to_username: apiTweet.in_reply_to_screen_name || null,
    tweet_url: `https://twitter.com/${apiTweet.author?.username}/status/${apiTweet.id}`,
    twitter_url: `https://twitter.com/${apiTweet.author?.username}/status/${apiTweet.id}`,
    raw_data: apiTweet as any,
    is_processed: false,
  };

  // Create tweet
  const tweetDbId = await createTweet(tweetData);
  if (!tweetDbId) {
    throw new Error("Failed to create tweet in database");
  }

  logger.debug(`Tweet created: ${tweetDbId} (${apiTweet.id})`);
  result.created++;

  // Extract and store entities
  await extractAndStoreEntities(tweetDbId, apiTweet);

  // Create engagement tracking
  await createEngagementTracking(
    tweetDbId,
    new Date(apiTweet.created_at)
  );
}

/**
 * Process author profile (create or update)
 */
async function processAuthorProfile(
  apiTweet: TwitterAPITweet,
  zoneId: string
): Promise<string | null> {
  if (!apiTweet.author) {
    logger.error(`Tweet ${apiTweet.id} has no author data`);
    return null;
  }

  const author = apiTweet.author;

  // Check if profile already exists
  const existingProfile = await getProfileByTwitterId(author.id.toString());

  if (existingProfile) {
    // Profile exists, optionally update it if data is fresher
    logger.debug(`Profile ${author.id} already exists, using existing`);
    return existingProfile.id;
  }

  // Create new profile
  const profileData: Partial<TwitterProfile> = {
    zone_id: zoneId,
    twitter_user_id: author.id.toString(),
    username: author.username,
    display_name: author.name,
    description: author.description || null,
    location: author.location || null,
    profile_image_url: author.profile_image_url || null,
    banner_image_url: author.profile_banner_url || null,
    is_verified: author.verified || false,
    is_blue_verified: author.is_blue_verified || false,
    followers_count: author.followers_count || 0,
    following_count: author.following_count || 0,
    tweet_count: author.statuses_count || 0,
    listed_count: author.listed_count || 0,
    twitter_created_at: author.created_at || null,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    profile_url: `https://twitter.com/${author.username}`,
    raw_data: author as any,
  };

  const profileId = await createProfile(profileData);
  if (!profileId) {
    throw new Error(`Failed to create profile for user ${author.id}`);
  }

  logger.debug(`Profile created: ${profileId} (${author.id})`);
  return profileId;
}

/**
 * Process orphaned tweets (fetch missing parents)
 * This can be called separately by a cron job
 */
export async function processOrphanedTweets(limit = 100): Promise<number> {
  // This would be implemented as a separate worker that:
  // 1. Fetches orphaned tweets from the view
  // 2. Uses TwitterAPI.io to fetch the parent tweets
  // 3. Stores the parent tweets
  // 4. Updates relationships

  logger.info("Orphaned tweet processing not yet implemented");
  return 0;
}

/**
 * Deduplicate tweets by tweet_id
 * Returns only unique tweets
 */
export function deduplicateTweets(tweets: TwitterAPITweet[]): TwitterAPITweet[] {
  const seen = new Set<string>();
  const unique: TwitterAPITweet[] = [];

  for (const tweet of tweets) {
    if (!seen.has(tweet.id)) {
      seen.add(tweet.id);
      unique.push(tweet);
    }
  }

  return unique;
}

/**
 * Batch process tweets (for manual imports or backfills)
 */
export async function batchProcessTweets(
  tweets: TwitterAPITweet[],
  zoneId: string,
  batchSize = 100
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    created: 0,
    duplicates: 0,
    errors: 0,
    updatedProfiles: 0,
  };

  // Deduplicate first
  const uniqueTweets = deduplicateTweets(tweets);

  logger.info(
    `Batch processing ${uniqueTweets.length} tweets (${tweets.length - uniqueTweets.length} duplicates removed)`
  );

  // Process in batches
  for (let i = 0; i < uniqueTweets.length; i += batchSize) {
    const batch = uniqueTweets.slice(i, i + batchSize);

    logger.info(
      `Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} tweets)`
    );

    for (const tweet of batch) {
      try {
        await processSingleTweet(tweet, zoneId, result);
      } catch (error) {
        logger.error(`Error processing tweet ${tweet.id}:`, error);
        result.errors++;
      }
    }

    // Small delay between batches to avoid overwhelming the database
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return result;
}

