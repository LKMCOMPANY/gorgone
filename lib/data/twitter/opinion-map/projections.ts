/**
 * Tweet projection CRUD operations
 * Manages 3D coordinates and cluster assignments
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import type { TwitterTweetProjection, EnrichedTwitterProjection } from '@/types'

/**
 * Save tweet projections to database
 * Batch inserts for performance
 * 
 * @param projections - Array of projections to save
 * @returns Success status
 */
export async function saveProjections(
  projections: Omit<TwitterTweetProjection, 'id' | 'created_at' | 'updated_at'>[]
): Promise<boolean> {
  const supabase = createAdminClient()

  logger.info('[Opinion Map] Saving projections', {
    count: projections.length
  })

  const BATCH_SIZE = 1000

    for (let i = 0; i < projections.length; i += BATCH_SIZE) {
    const batch = projections.slice(i, i + BATCH_SIZE)

    const { error } = await supabase
      .from('twitter_tweet_projections')
      .insert(batch)

      if (error) {
      logger.error('[Opinion Map] Failed to save projections batch', {
        batch: Math.floor(i / BATCH_SIZE) + 1,
        error
      })
      return false
    }

    logger.debug('[Opinion Map] Projections batch saved', {
      batch: Math.floor(i / BATCH_SIZE) + 1,
      total_batches: Math.ceil(projections.length / BATCH_SIZE)
    })
    }

  logger.info('[Opinion Map] All projections saved', {
    count: projections.length
  })

  return true
}

/**
 * Get projections for a session
 * 
 * @param zoneId - Zone ID
 * @param sessionId - Session ID
 * @returns Array of projections
 */
export async function getProjections(
  zoneId: string,
  sessionId: string
): Promise<TwitterTweetProjection[]> {
  const supabase = createAdminClient()

    const { data, error } = await supabase
    .from('twitter_tweet_projections')
    .select('*')
    .eq('zone_id', zoneId)
    .eq('session_id', sessionId)
    .order('cluster_id', { ascending: true })

  if (error) {
    logger.error('[Opinion Map] Failed to get projections', { error })
    return []
  }

  return (data as TwitterTweetProjection[]) || []
}

/**
 * Get enriched projections with full tweet data
 * Joins with twitter_tweets and twitter_profiles
 * 
 * @param zoneId - Zone ID
 * @param sessionId - Session ID
 * @returns Enriched projections with tweet and author data
 */
export async function getEnrichedProjections(
  zoneId: string,
  sessionId: string
): Promise<EnrichedTwitterProjection[]> {
  const supabase = createAdminClient()

  logger.debug('[Opinion Map] Fetching enriched projections', {
    zone_id: zoneId,
    session_id: sessionId
  })

    const { data, error } = await supabase
    .from('twitter_tweet_projections')
    .select(`
        *,
      tweet:twitter_tweets!tweet_db_id (
        tweet_id,
        text,
        twitter_created_at,
        retweet_count,
        reply_count,
        like_count,
        quote_count,
        view_count,
        total_engagement,
        has_media,
        has_links,
        has_hashtags,
        raw_data,
        author:twitter_profiles!author_profile_id (
          name,
          username,
          profile_picture_url,
          is_verified,
          is_blue_verified,
          followers_count
        )
        )
    `)
    .eq('zone_id', zoneId)
    .eq('session_id', sessionId)

  if (error) {
    logger.error('[Opinion Map] Failed to get enriched projections', { error })
    return []
  }

  // Transform to flat structure
  const enriched: EnrichedTwitterProjection[] = (data as any[]).map(proj => ({
    // Projection data
    id: proj.id,
    tweet_db_id: proj.tweet_db_id,
    zone_id: proj.zone_id,
    session_id: proj.session_id,
    x: proj.x,
    y: proj.y,
    z: proj.z,
    cluster_id: proj.cluster_id,
    cluster_confidence: proj.cluster_confidence,
    created_at: proj.created_at,

    // Tweet data
    tweet_id: proj.tweet.tweet_id,
    text: proj.tweet.text,
    twitter_created_at: proj.tweet.twitter_created_at,
    retweet_count: proj.tweet.retweet_count,
    reply_count: proj.tweet.reply_count,
    like_count: proj.tweet.like_count,
    quote_count: proj.tweet.quote_count,
    view_count: proj.tweet.view_count,
    total_engagement: proj.tweet.total_engagement,
    has_media: proj.tweet.has_media,
    has_links: proj.tweet.has_links,
    has_hashtags: proj.tweet.has_hashtags,
    raw_data: proj.tweet.raw_data,

    // Author data
    author_profile_id: proj.tweet.author.id,
    author_name: proj.tweet.author.name,
    author_username: proj.tweet.author.username,
    author_profile_picture_url: proj.tweet.author.profile_picture_url,
    author_verified: proj.tweet.author.is_verified || proj.tweet.author.is_blue_verified,
    author_followers_count: proj.tweet.author.followers_count
  }))

  logger.debug('[Opinion Map] Enriched projections loaded', {
    count: enriched.length
  })

  return enriched
}

/**
 * Get projections for a specific cluster
 * 
 * @param sessionId - Session ID
 * @param clusterId - Cluster ID
 * @returns Projections in the cluster
 */
export async function getProjectionsByCluster(
  sessionId: string,
  clusterId: number
): Promise<TwitterTweetProjection[]> {
  const supabase = createAdminClient()

    const { data, error } = await supabase
    .from('twitter_tweet_projections')
    .select('*')
    .eq('session_id', sessionId)
    .eq('cluster_id', clusterId)

        if (error) {
    logger.error('[Opinion Map] Failed to get cluster projections', { error })
    return []
  }

  return (data as TwitterTweetProjection[]) || []
}
