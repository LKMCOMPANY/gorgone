/**
 * Twitter Deduplicator Worker
 * Handles tweet deduplication and storage from webhooks
 */

import { logger } from "@/lib/logger";
import { upsertProfile, getProfileByTwitterId } from "@/lib/data/twitter/profiles";
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
  createdTweetIds: string[]; // IDs of newly created tweets for QStash scheduling
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
    createdTweetIds: [],
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

  // Prepare tweet data
  const authorUsername = apiTweet.author?.userName?.toLowerCase() || "unknown";

  const tweetData: Partial<TwitterTweet> = {
    zone_id: zoneId,
    tweet_id: apiTweet.id,
    author_profile_id: authorProfileId,
    conversation_id: apiTweet.conversationId || null,
    text: apiTweet.text,
    lang: apiTweet.lang || null,
    source: apiTweet.source || null,
    twitter_created_at: apiTweet.createdAt,
    collected_at: new Date().toISOString(),
    retweet_count: apiTweet.retweetCount || 0,
    reply_count: apiTweet.replyCount || 0,
    like_count: apiTweet.likeCount || 0,
    quote_count: apiTweet.quoteCount || 0,
    view_count: apiTweet.viewCount || 0,
    bookmark_count: apiTweet.bookmarkCount || 0,
    // total_engagement is a GENERATED column, don't insert it
    has_media: false, // TODO: Check extended_entities or entities for media
    has_links: !!(apiTweet.entities?.urls && apiTweet.entities.urls.length > 0),
    has_hashtags: !!(
      apiTweet.entities?.hashtags && apiTweet.entities.hashtags.length > 0
    ),
    has_mentions: !!(
      apiTweet.entities?.user_mentions && apiTweet.entities.user_mentions.length > 0
    ),
    is_reply: !!apiTweet.isReply,
    in_reply_to_tweet_id: apiTweet.inReplyToId || null,
    in_reply_to_user_id: apiTweet.inReplyToUserId || null,
    in_reply_to_username: apiTweet.inReplyToUsername || null,
    tweet_url: apiTweet.url || `https://twitter.com/${authorUsername}/status/${apiTweet.id}`,
    twitter_url: apiTweet.url || `https://x.com/${authorUsername}/status/${apiTweet.id}`,
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
  result.createdTweetIds.push(tweetDbId); // Store ID for QStash scheduling

  // Extract and store entities
  await extractAndStoreEntities(tweetDbId, zoneId, apiTweet);

  // Create engagement tracking
  await createEngagementTracking(
    tweetDbId,
    new Date(apiTweet.createdAt)
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

  // Extract username (API uses userName in camelCase)
  const username = author.userName?.toLowerCase() || null;

  if (!username) {
    logger.error(`Missing userName for author ${author.id}`, { author });
    throw new Error(`Missing userName for author ${author.id}`);
  }

  // Create new profile (map API fields to our schema)
  const profileData: Partial<TwitterProfile> = {
    twitter_user_id: author.id.toString(),
    username: username,
    name: author.name,
    description: author.profile_bio?.description || author.description || null,
    location: author.location || null,
    profile_picture_url: author.profilePicture || null,
    cover_picture_url: author.coverPicture || null,
    is_verified: false, // Legacy verified badge (deprecated)
    is_blue_verified: author.isBlueVerified || false,
    verified_type: author.verifiedType || null,
    followers_count: author.followers || 0,
    following_count: author.following || 0,
    tweets_count: author.statusesCount || 0,
    media_count: author.mediaCount || 0,
    favourites_count: author.favouritesCount || 0,
    twitter_created_at: author.createdAt || null,
    is_automated: author.isAutomated || false,
    automated_by: author.automatedBy || null,
    can_dm: author.canDm || false,
    possibly_sensitive: author.possiblySensitive || false,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    profile_url: `https://twitter.com/${username}`,
    twitter_url: author.url || `https://x.com/${username}`,
    raw_data: author as any,
  };

  const profileId = await upsertProfile(profileData);
  if (!profileId) {
    throw new Error(`Failed to upsert profile for user ${author.id}`);
  }

  logger.debug(`Profile upserted: ${profileId} (${author.id})`);
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
    createdTweetIds: [],
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

