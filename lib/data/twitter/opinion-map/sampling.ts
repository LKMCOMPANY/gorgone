/**
 * Stratified sampling for opinion map
 * Ensures temporal balance across time periods
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { differenceInDays, addDays } from 'date-fns'

export interface SamplingConfig {
  zoneId: string
  startDate: Date
  endDate: Date
  targetSize: number
}

export interface SamplingResult {
  samples: Array<{ id: string; tweet_id: string }>
  totalAvailable: number
  actualSampled: number
  buckets: number
  strategy: 'stratified' | 'all'
}

/**
 * Sample tweets using stratified bucketing
 * Ensures each time bucket is represented equally
 * 
 * @param config - Sampling configuration
 * @returns Sampled tweet IDs with statistics
 *
 * @example
 * const result = await sampleTweetsStratified({
 *   zoneId: 'zone-123',
 *   startDate: new Date('2025-11-01'),
 *   endDate: new Date('2025-11-30'),
 *   targetSize: 10000
 * })
 * // Returns 10,000 tweets evenly distributed across 30 days
 */
export async function sampleTweetsStratified(
  config: SamplingConfig
): Promise<SamplingResult> {
  const supabase = await createClient()
  const { zoneId, startDate, endDate, targetSize } = config

  logger.info('[Opinion Map] Starting stratified sampling', {
    zone_id: zoneId,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    target_size: targetSize
  })

  // Count total available tweets in period
    const { count: totalAvailable } = await supabase
    .from('twitter_tweets')
    .select('*', { count: 'exact', head: true })
    .eq('zone_id', zoneId)
    .gte('twitter_created_at', startDate.toISOString())
    .lte('twitter_created_at', endDate.toISOString())

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

  // If fewer tweets than target, return all
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
      .order('twitter_created_at', { ascending: true })

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
    tweets_per_bucket: tweetsPerBucket
  })

  // Sample from each bucket (day)
  const samples: Array<{ id: string; tweet_id: string }> = []

  for (let i = 0; i < bucketsCount; i++) {
    const bucketStart = addDays(startDate, i)
    const bucketEnd = addDays(bucketStart, 1)

    const { data: bucketSamples } = await supabase
      .from('twitter_tweets')
      .select('id, tweet_id')
      .eq('zone_id', zoneId)
      .gte('twitter_created_at', bucketStart.toISOString())
      .lt('twitter_created_at', bucketEnd.toISOString())
      .order('random()')
      .limit(tweetsPerBucket)

    if (bucketSamples && bucketSamples.length > 0) {
      samples.push(...bucketSamples)
      
      logger.debug('[Opinion Map] Bucket sampled', {
        bucket: i + 1,
        date: bucketStart.toISOString().split('T')[0],
        sampled: bucketSamples.length
      })
    }
  }

  // Trim to exact target size (in case we oversampled)
  const finalSamples = samples.slice(0, targetSize)

  logger.info('[Opinion Map] Sampling complete', {
    total_available: totalAvailable,
    target: targetSize,
    actual: finalSamples.length,
    buckets: bucketsCount,
    coverage: `${((finalSamples.length / totalAvailable) * 100).toFixed(1)}%`
  })

  return {
    samples: finalSamples,
    totalAvailable,
    actualSampled: finalSamples.length,
    buckets: bucketsCount,
    strategy: 'stratified'
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
