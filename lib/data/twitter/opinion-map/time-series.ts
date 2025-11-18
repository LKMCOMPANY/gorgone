/**
 * Time series data generation for opinion evolution chart
 * Groups tweets by cluster over time
 */

import {
  startOfHour,
  startOfDay,
  eachHourOfInterval,
  eachDayOfInterval,
  differenceInDays,
  format 
} from 'date-fns'
import { logger } from '@/lib/logger'
import type {
  EnrichedTwitterProjection, 
  OpinionEvolutionData,
  TwitterOpinionCluster 
} from '@/types'

type Granularity = 'hour' | '6hours' | 'day'

/**
 * Calculate optimal time granularity based on period duration
 * 
 * @param days - Number of days in period
 * @returns Granularity level
 */
export function calculateGranularity(days: number): Granularity {
  if (days <= 1) return 'hour'      // 24 data points
  if (days <= 7) return '6hours'    // ~28 data points
  return 'day'                      // 30-90 data points
}

/**
 * Generate time series data for evolution chart
 * Groups projections by cluster over time
 *
 * @param projections - Enriched projections with tweet data
 * @param clusters - Cluster metadata
 * @param startDate - Period start
 * @param endDate - Period end
 * @returns Time series data points
 */
export function generateTimeSeriesData(
  projections: EnrichedTwitterProjection[],
  clusters: TwitterOpinionCluster[],
  startDate: Date,
  endDate: Date
): OpinionEvolutionData[] {
  const days = differenceInDays(endDate, startDate) + 1
  const granularity = calculateGranularity(days)

  logger.info('[Opinion Map] Generating time series data', {
    projections: projections.length,
    clusters: clusters.length,
    period_days: days,
    granularity
  })

  // Generate time buckets
  const buckets = generateTimeBuckets(startDate, endDate, granularity)

  // Initialize data structure
  const timeSeriesData: OpinionEvolutionData[] = buckets.map(bucket => {
    const dataPoint: OpinionEvolutionData = {
      date: formatBucket(bucket, granularity)
    }

    // Initialize all clusters to 0
    clusters.forEach(cluster => {
      dataPoint[`cluster_${cluster.cluster_id}`] = 0
    })

    return dataPoint
  })

  // Group projections by time bucket and cluster
  projections.forEach(proj => {
    const tweetDate = new Date(proj.twitter_created_at)
    const bucketIndex = findBucketIndex(tweetDate, buckets, granularity)

    if (bucketIndex >= 0 && bucketIndex < timeSeriesData.length) {
      const clusterKey = `cluster_${proj.cluster_id}` as keyof OpinionEvolutionData
      const currentValue = timeSeriesData[bucketIndex][clusterKey]
      
      if (typeof currentValue === 'number') {
        timeSeriesData[bucketIndex][clusterKey] = currentValue + 1
      }
    }
  })

  logger.debug('[Opinion Map] Time series generated', {
    data_points: timeSeriesData.length,
    granularity
  })

  return timeSeriesData
}

/**
 * Generate time buckets based on granularity
 */
function generateTimeBuckets(
  startDate: Date,
  endDate: Date,
  granularity: Granularity
): Date[] {
  if (granularity === 'hour') {
    return eachHourOfInterval({ start: startDate, end: endDate })
  }

  if (granularity === '6hours') {
    const hours = eachHourOfInterval({ start: startDate, end: endDate })
    return hours.filter((_, i) => i % 6 === 0)
  }

  // Day granularity
  return eachDayOfInterval({ start: startDate, end: endDate })
}

/**
 * Find which bucket a date belongs to
 */
function findBucketIndex(
  date: Date,
  buckets: Date[],
  granularity: Granularity
): number {
  const normalized = granularity === 'day'
    ? startOfDay(date)
    : startOfHour(date)

  return buckets.findIndex(bucket => {
    const bucketNormalized = granularity === 'day'
      ? startOfDay(bucket)
      : startOfHour(bucket)

    return normalized.getTime() === bucketNormalized.getTime()
  })
}

/**
 * Format bucket date for chart display
 */
function formatBucket(bucket: Date, granularity: Granularity): string {
  if (granularity === 'hour' || granularity === '6hours') {
    return format(bucket, 'MMM dd HH:mm')
  }
  return format(bucket, 'MMM dd')
}
