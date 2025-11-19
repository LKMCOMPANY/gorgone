/**
 * Opinion Map Data Mapping Utilities
 * Transforms EnrichedTwitterProjection to TwitterTweetWithProfile format
 * for reusing existing tweet display components
 */

import type { EnrichedTwitterProjection, TwitterTweetWithProfile, TwitterProfile } from '@/types'

/**
 * Map EnrichedTwitterProjection to TwitterTweetWithProfile
 * 
 * This allows us to reuse TwitterFeedCard component in the opinion map
 * without duplicating code or creating separate display logic.
 * 
 * @param projection - Enriched projection from opinion map
 * @returns Tweet in TwitterTweetWithProfile format
 */
export function mapProjectionToTweet(projection: EnrichedTwitterProjection): TwitterTweetWithProfile {
  // Reconstruct the author profile object
  const author: TwitterProfile = {
    id: projection.author_profile_id,
    twitter_user_id: '', // Not available in projection
    username: projection.author_username,
    name: projection.author_name,
    profile_picture_url: projection.author_profile_picture_url,
    cover_picture_url: null,
    description: null,
    location: null,
    is_verified: projection.author_verified,
    is_blue_verified: projection.author_verified,
    verified_type: null,
    followers_count: projection.author_followers_count,
    following_count: 0,
    tweets_count: 0,
    media_count: 0,
    favourites_count: 0,
    twitter_created_at: null,
    is_automated: false,
    automated_by: null,
    can_dm: false,
    possibly_sensitive: false,
    profile_url: `https://twitter.com/${projection.author_username}`,
    twitter_url: `https://twitter.com/${projection.author_username}`,
    raw_data: null,
    first_seen_at: '',
    last_seen_at: '',
    last_updated_at: '',
    total_tweets_collected: 0,
    created_at: '',
    updated_at: '',
  }

  // Map to TwitterTweetWithProfile
  const tweet: TwitterTweetWithProfile = {
    // Use tweet_db_id as the database ID
    id: projection.tweet_db_id,
    zone_id: projection.zone_id,
    tweet_id: projection.tweet_id,
    author_profile_id: projection.author_profile_id,
    conversation_id: null, // Not available in projection
    text: projection.text,
    lang: null, // Not available in projection
    source: null,
    twitter_created_at: projection.twitter_created_at,
    collected_at: projection.created_at, // Use projection creation date as fallback
    
    // Engagement metrics (current values from projection)
    retweet_count: projection.retweet_count,
    reply_count: projection.reply_count,
    like_count: projection.like_count,
    quote_count: projection.quote_count,
    view_count: projection.view_count,
    bookmark_count: 0, // Not available in projection
    total_engagement: projection.total_engagement,
    
    // Content flags
    has_media: projection.has_media,
    has_links: projection.has_links,
    has_hashtags: projection.has_hashtags,
    has_mentions: false, // Could be derived from raw_data if needed
    
    // Reply info
    is_reply: false, // Could be derived from raw_data if needed
    in_reply_to_tweet_id: null,
    in_reply_to_user_id: null,
    in_reply_to_username: null,
    
    // URLs
    tweet_url: `https://twitter.com/${projection.author_username}/status/${projection.tweet_id}`,
    twitter_url: `https://twitter.com/${projection.author_username}/status/${projection.tweet_id}`,
    
    // Raw data (important for media display)
    raw_data: projection.raw_data,
    
    // Processing fields
    is_processed: true,
    sentiment_score: null,
    embedding: null,
    embedding_model: null,
    embedding_created_at: null,
    predictions: null,
    
    // Timestamps
    created_at: projection.created_at,
    updated_at: projection.created_at,
    
    // Author profile
    author,
  }

  return tweet
}

/**
 * Map multiple projections to tweets
 * 
 * @param projections - Array of enriched projections
 * @returns Array of tweets in TwitterTweetWithProfile format
 */
export function mapProjectionsToTweets(
  projections: EnrichedTwitterProjection[]
): TwitterTweetWithProfile[] {
  return projections.map(mapProjectionToTweet)
}

/**
 * Sort projections by engagement (highest first)
 * 
 * @param projections - Array of projections
 * @returns Sorted array
 */
export function sortByEngagement(
  projections: EnrichedTwitterProjection[]
): EnrichedTwitterProjection[] {
  return [...projections].sort((a, b) => b.total_engagement - a.total_engagement)
}

/**
 * Sort projections by recency (newest first)
 * 
 * @param projections - Array of projections
 * @returns Sorted array
 */
export function sortByRecency(
  projections: EnrichedTwitterProjection[]
): EnrichedTwitterProjection[] {
  return [...projections].sort((a, b) => 
    new Date(b.twitter_created_at).getTime() - new Date(a.twitter_created_at).getTime()
  )
}

