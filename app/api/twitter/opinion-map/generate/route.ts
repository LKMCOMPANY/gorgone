/**
 * Opinion Map Generation API
 * Triggers clustering pipeline for a zone
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { canAccessZone } from '@/lib/auth/permissions'
import { logger } from '@/lib/logger'
import { Client } from '@upstash/qstash'
import { env } from '@/lib/env'
import {
  sampleTweetsStratified,
  createSession,
  getEmbeddingStats
} from '@/lib/data/twitter/opinion-map'

const qstash = new Client({ token: env.qstash.token })

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body = await request.json()
    const { zone_id, start_date, end_date, sample_size } = body

    // Validate input
    if (!zone_id || !start_date || !end_date || !sample_size) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Authenticate
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Authorize
    const hasAccess = await canAccessZone(user.id, zone_id)
    if (!hasAccess) {
      logger.warn('[Opinion Map] Access denied', {
        user_id: user.id,
        zone_id
      })
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    logger.info('[Opinion Map] Generation requested', {
      zone_id,
      user_id: user.id,
      start_date,
      end_date,
      sample_size
    })

    // Sample tweets using stratified bucketing
    const samplingResult = await sampleTweetsStratified({
      zoneId: zone_id,
      startDate: new Date(start_date),
      endDate: new Date(end_date),
      targetSize: sample_size
    })

    if (samplingResult.samples.length === 0) {
      return NextResponse.json(
        { 
          error: 'No tweets found in selected period',
          total_available: samplingResult.totalAvailable
        },
        { status: 404 }
      )
    }

    // Check embedding cache status
    const tweetIds = samplingResult.samples.map(s => s.id)
    const embeddingStats = await getEmbeddingStats(tweetIds)

    logger.info('[Opinion Map] Embedding cache stats', {
      total: embeddingStats.total,
      cached: embeddingStats.cached,
      needs_embedding: embeddingStats.needs_embedding,
      cache_hit_rate: `${(embeddingStats.cache_hit_rate * 100).toFixed(1)}%`
    })

    // Create session
    const session = await createSession(
      zone_id,
      {
        start_date,
        end_date,
        sample_size,
        sampled_tweet_ids: tweetIds,
        actual_sample_size: samplingResult.actualSampled
      },
      user.id
    )

    // Schedule QStash worker
    const workerUrl = `${env.appUrl}/api/webhooks/qstash/opinion-map-worker`

    await qstash.publishJSON({
      url: workerUrl,
      body: { session_id: session.session_id },
      retries: 3
    })

    logger.info('[Opinion Map] Worker scheduled', {
      session_id: session.session_id,
      worker_url: workerUrl
    })

    // Estimate processing time
    const estimatedTimeSeconds = estimateProcessingTime(
      samplingResult.actualSampled,
      embeddingStats.needs_embedding
    )

    return NextResponse.json({
      success: true,
      session_id: session.session_id,
      sampled_tweets: samplingResult.actualSampled,
      total_available: samplingResult.totalAvailable,
      cache_hit_rate: embeddingStats.cache_hit_rate,
      estimated_time_seconds: estimatedTimeSeconds
    })

  } catch (error) {
    logger.error('[Opinion Map] Generation failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Estimate processing time based on tweet count and cache status
 */
function estimateProcessingTime(
  totalTweets: number,
  needsEmbedding: number
): number {
  // Vectorization: ~0.5s per 100 tweets
  const vectorizationTime = Math.ceil(needsEmbedding / 100) * 0.5

  // PCA: ~10s for any size
  const pcaTime = 10

  // UMAP: scales with size
  const umapTime = totalTweets < 1000 ? 30 : totalTweets < 5000 ? 60 : 120

  // K-means: ~10s
  const kmeansTime = 10

  // Labeling: ~5s per cluster (assume 8 clusters)
  const labelingTime = 8 * 5

  const total = vectorizationTime + pcaTime + umapTime + kmeansTime + labelingTime

  return Math.ceil(total)
}
