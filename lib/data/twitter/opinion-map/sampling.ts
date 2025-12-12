/**
 * Stratified sampling for opinion map
 * Ensures temporal balance across time periods with engagement prioritization
 * 
 * Best practices applied:
 * - Stratified by day for temporal coverage
 * - Prioritizes high-engagement tweets within each bucket
 * - Filters out pure retweets (lower semantic value)
 * - Maintains representativeness over pure volume
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { differenceInDays, addDays } from 'date-fns'

export interface SamplingConfig {
  zoneId: string
  startDate: Date
  endDate: Date
  targetSize: number
  /** If true, prioritize tweets with higher engagement (recommended) */
  prioritizeEngagement?: boolean
}

export interface SamplingResult {
  samples: Array<{ id: string; tweet_id: string }>
  totalAvailable: number
  actualSampled: number
  buckets: number
  strategy: 'stratified' | 'stratified_engagement' | 'all'
}

/**
 * Sample tweets using stratified bucketing with engagement prioritization
 * Ensures each time bucket is represented equally while favoring high-engagement content
 * 
 * @param config - Sampling configuration
 * @returns Sampled tweet IDs with statistics
 *
 * @example
 * const result = await sampleTweetsStratified({
 *   zoneId: 'zone-123',
 *   startDate: new Date('2025-11-01'),
 *   endDate: new Date('2025-11-30'),
 *   targetSize: 2500,
 *   prioritizeEngagement: true
 * })
 * // Returns 2500 tweets: temporal coverage + high-engagement priority
 */
export async function sampleTweetsStratified(
  config: SamplingConfig
): Promise<SamplingResult> {
  const supabase = createAdminClient()
  const { zoneId, startDate, endDate, targetSize, prioritizeEngagement = true } = config

  logger.info('[Opinion Map Sampling] 🎯 Starting stratified sampling', {
    zone_id: zoneId,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    target_size: targetSize,
    prioritize_engagement: prioritizeEngagement,
    period_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  })

  // Count total available tweets in period (excluding pure RTs which have low semantic value)
  const { count: totalAvailable } = await supabase
    .from('twitter_tweets')
    .select('*', { count: 'exact', head: true })
    .eq('zone_id', zoneId)
    .gte('twitter_created_at', startDate.toISOString())
    .lte('twitter_created_at', endDate.toISOString())
    .not('text', 'like', 'RT @%') // Exclude pure retweets

  if (!totalAvailable || totalAvailable === 0) {
    logger.warn('[Opinion Map] No tweets found in period', { zone_id: zoneId })
    return {
      samples: [],
      totalAvailable: 0,
      actualSampled: 0,
      buckets: 0,
      strategy: 'all'
    }
  }

  // If fewer tweets than target, return all (sorted by engagement for consistency)
  if (totalAvailable <= targetSize) {
    logger.info('[Opinion Map] Returning all tweets (below target)', {
      available: totalAvailable,
      target: targetSize
    })

    const { data: allTweets } = await supabase
      .from('twitter_tweets')
      .select('id, tweet_id')
      .eq('zone_id', zoneId)
      .gte('twitter_created_at', startDate.toISOString())
      .lte('twitter_created_at', endDate.toISOString())
      .not('text', 'like', 'RT @%')
      .order('total_engagement', { ascending: false, nullsFirst: false })

    return {
      samples: allTweets || [],
      totalAvailable,
      actualSampled: allTweets?.length || 0,
      buckets: 1,
      strategy: 'all'
    }
  }

  // Calculate buckets (one per day)
  const days = differenceInDays(endDate, startDate) + 1
  const bucketsCount = Math.max(1, days)
  const tweetsPerBucket = Math.ceil(targetSize / bucketsCount)

  logger.info('[Opinion Map] Sampling with stratified buckets', {
    days,
    buckets: bucketsCount,
    tweets_per_bucket: tweetsPerBucket,
    prioritize_engagement: prioritizeEngagement
  })

  // Sample from each bucket (day)
  const samples: Array<{ id: string; tweet_id: string }> = []

  for (let i = 0; i < bucketsCount; i++) {
    const bucketStart = addDays(startDate, i)
    const bucketEnd = addDays(bucketStart, 1)

    // Count tweets in this bucket (excluding pure RTs)
    const { count: bucketCount } = await supabase
      .from('twitter_tweets')
      .select('*', { count: 'exact', head: true })
      .eq('zone_id', zoneId)
      .gte('twitter_created_at', bucketStart.toISOString())
      .lt('twitter_created_at', bucketEnd.toISOString())
      .not('text', 'like', 'RT @%')

    if (!bucketCount || bucketCount === 0) {
      logger.debug('[Opinion Map] Empty bucket', {
        bucket: i + 1,
        date: bucketStart.toISOString().split('T')[0]
      })
      continue
    }

    // If bucket has fewer tweets than needed, take all (sorted by engagement)
    if (bucketCount <= tweetsPerBucket) {
      const { data: allBucketTweets } = await supabase
        .from('twitter_tweets')
        .select('id, tweet_id')
        .eq('zone_id', zoneId)
        .gte('twitter_created_at', bucketStart.toISOString())
        .lt('twitter_created_at', bucketEnd.toISOString())
        .not('text', 'like', 'RT @%')
        .order('total_engagement', { ascending: false, nullsFirst: false })

      if (allBucketTweets && allBucketTweets.length > 0) {
        samples.push(...allBucketTweets)
        
        logger.debug('[Opinion Map] Bucket sampled (all tweets)', {
          bucket: i + 1,
          date: bucketStart.toISOString().split('T')[0],
          sampled: allBucketTweets.length,
          available: bucketCount
        })
      }
    } else {
      // Bucket has more tweets than needed
      // Strategy: take top N by engagement (prioritizes viral/important content)
      // This gives better cluster quality than random sampling
      const { data: bucketSamples } = await supabase
        .from('twitter_tweets')
        .select('id, tweet_id')
        .eq('zone_id', zoneId)
        .gte('twitter_created_at', bucketStart.toISOString())
        .lt('twitter_created_at', bucketEnd.toISOString())
        .not('text', 'like', 'RT @%')
        .order('total_engagement', { ascending: false, nullsFirst: false })
        .limit(tweetsPerBucket)

      if (bucketSamples && bucketSamples.length > 0) {
        samples.push(...bucketSamples)
        
        logger.debug('[Opinion Map] Bucket sampled (top engagement)', {
          bucket: i + 1,
          date: bucketStart.toISOString().split('T')[0],
          sampled: bucketSamples.length,
          available: bucketCount
        })
      }
    }
  }

  // Trim to exact target size (in case we oversampled)
  let finalSamples = samples.slice(0, targetSize)

  // If we undersampled (some buckets had fewer tweets than needed), try to fill up
  // Fill with remaining high-engagement tweets not yet sampled
  if (finalSamples.length < targetSize && finalSamples.length < totalAvailable) {
    const shortfall = targetSize - finalSamples.length
    
    logger.info('[Opinion Map Sampling] 🔄 Undersampled - filling with additional high-engagement tweets', {
      zone_id: zoneId,
      current: finalSamples.length,
      target: targetSize,
      shortfall,
      available_for_fill: totalAvailable - finalSamples.length
    })

    // Get additional high-engagement tweets that weren't already sampled
    const existingIds = new Set(finalSamples.map(s => s.id))
    
    const { data: additionalSamples } = await supabase
      .from('twitter_tweets')
      .select('id, tweet_id')
      .eq('zone_id', zoneId)
      .gte('twitter_created_at', startDate.toISOString())
      .lte('twitter_created_at', endDate.toISOString())
      .not('text', 'like', 'RT @%')
      .order('total_engagement', { ascending: false, nullsFirst: false })
      .limit(shortfall + 100) // Fetch extra to account for duplicates

    if (additionalSamples && additionalSamples.length > 0) {
      // Filter out already-sampled tweets
      const uniqueAdditional = additionalSamples
        .filter(s => !existingIds.has(s.id))
        .slice(0, shortfall)
      
      if (uniqueAdditional.length > 0) {
        finalSamples = [...finalSamples, ...uniqueAdditional]
        logger.info('[Opinion Map Sampling] ✅ Added additional high-engagement samples', {
          zone_id: zoneId,
          fetched: additionalSamples.length,
          unique_added: uniqueAdditional.length,
          new_total: finalSamples.length,
          target_reached: `${((finalSamples.length / targetSize) * 100).toFixed(1)}%`
        })
      }
    }
  }

  const samplingRate = (finalSamples.length / targetSize) * 100
  const coverage = (finalSamples.length / totalAvailable) * 100

  if (samplingRate < 80) {
    logger.warn('[Opinion Map Sampling] ⚠️ Low sampling rate - fewer tweets than requested', {
      zone_id: zoneId,
      total_available: totalAvailable,
      target: targetSize,
      actual: finalSamples.length,
      buckets: bucketsCount,
      sampling_rate: `${samplingRate.toFixed(1)}%`,
      coverage: `${coverage.toFixed(1)}%`,
      shortfall: targetSize - finalSamples.length
    })
  } else {
    logger.info('[Opinion Map Sampling] ✅ Sampling complete', {
      zone_id: zoneId,
      total_available: totalAvailable,
      target: targetSize,
      actual: finalSamples.length,
      buckets: bucketsCount,
      sampling_rate: `${samplingRate.toFixed(1)}%`,
      coverage: `${coverage.toFixed(1)}%`,
      strategy: prioritizeEngagement ? 'stratified_engagement' : 'stratified'
    })
  }

  return {
    samples: finalSamples,
    totalAvailable,
    actualSampled: finalSamples.length,
    buckets: bucketsCount,
    strategy: prioritizeEngagement ? 'stratified_engagement' : 'stratified'
  }
}

/**
 * Calculate optimal granularity for time series graph
 * Auto-adapts based on period duration
 * 
 * @param days - Number of days in period
 * @returns Granularity ('hour' | '6hours' | 'day' | 'week')
 */
export function calculateTimeGranularity(
  days: number
): 'hour' | '6hours' | 'day' | 'week' {
  if (days <= 1) return 'hour'      // 24 points for 1 day
  if (days <= 7) return '6hours'    // ~28 points for 1 week
  if (days <= 30) return 'day'      // 30 points for 1 month
  return 'week'                     // ~4-5 points per month
}
