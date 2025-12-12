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
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import {
  sampleTweetsStratified,
  createOrReuseActiveSession,
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

    // Minimum posts required for meaningful clustering
    const MIN_POSTS_FOR_CLUSTERING = 10

    if (samplingResult.samples.length === 0) {
      logger.warn('[Opinion Map] No tweets found in period', { zone_id })
      return NextResponse.json(
        { 
          error: 'No posts found in the selected period. Try selecting a longer time range or wait for more data to be collected.',
          total_available: 0
        },
        { status: 404 }
      )
    }

    if (samplingResult.samples.length < MIN_POSTS_FOR_CLUSTERING) {
      logger.warn('[Opinion Map] Insufficient data for clustering', { 
        zone_id, 
        found: samplingResult.samples.length,
        minimum: MIN_POSTS_FOR_CLUSTERING 
      })
      return NextResponse.json(
        { 
          error: `Not enough data to generate an opinion map. Found ${samplingResult.samples.length} posts, but at least ${MIN_POSTS_FOR_CLUSTERING} are required for meaningful clustering. Try selecting a longer time range.`,
          total_available: samplingResult.totalAvailable,
          found: samplingResult.samples.length,
          minimum_required: MIN_POSTS_FOR_CLUSTERING
        },
        { status: 400 }
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
    const { session, reused } = await createOrReuseActiveSession(
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

    // If a session is already running, be idempotent: return it (no re-scheduling)
    if (reused) {
      // Estimate remaining time based on current progress
      const sessionTweets = session.total_tweets ?? samplingResult.actualSampled
      const fullEstimate = estimateProcessingTime(sessionTweets, 0) // Assume embeddings cached
      const progressFraction = Math.max(0.01, session.progress / 100) // Avoid division by zero
      const estimatedRemainingSeconds = Math.ceil(fullEstimate * (1 - progressFraction))

      return NextResponse.json({
        success: true,
        session_id: session.session_id,
        sampled_tweets: sessionTweets,
        total_available: samplingResult.totalAvailable,
        cache_hit_rate: embeddingStats.cache_hit_rate,
        reused_active_session: true,
        status: session.status,
        progress: session.progress,
        estimated_time_seconds: estimatedRemainingSeconds,
      })
    }

    // Schedule QStash worker
    // Use VERCEL_URL for preview deployments, fallback to env.appUrl for production
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : env.appUrl
    const workerUrl = `${baseUrl}/api/webhooks/qstash/opinion-map-worker`

    try {
      const qstashResult = await qstash.publishJSON({
        url: workerUrl,
        body: { session_id: session.session_id },
        retries: 3
      })

      logger.info('[Opinion Map] Worker scheduled successfully', {
        session_id: session.session_id,
        worker_url: workerUrl,
        message_id: qstashResult.messageId
      })
    } catch (qstashError) {
      logger.error('[Opinion Map] Failed to schedule QStash worker', {
        error: qstashError,
        worker_url: workerUrl,
        qstash_token: env.qstash.token ? 'present' : 'MISSING'
      })
      
      // Delete the session since worker won't run
      const supabase = await createSupabaseClient()
      await supabase
        .from('twitter_opinion_sessions')
        .delete()
        .eq('session_id', session.session_id)
      
      throw new Error('Failed to schedule background worker. Please try again.')
    }

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
      reused_active_session: false,
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
