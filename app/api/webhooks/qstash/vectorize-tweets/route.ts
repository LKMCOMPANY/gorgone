/**
 * Tweet Vectorization Worker
 * QStash background worker for on-demand tweet vectorization
 * 
 * Triggered by Twitter webhook after tweets are saved to database
 * Runs asynchronously to avoid blocking webhook response
 * 
 * Process:
 * 1. Fetch tweets by ID
 * 2. Enrich content (text + author + hashtags)
 * 3. Generate OpenAI embeddings in batches
 * 4. Update database with embeddings
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import { ensureEmbeddings } from '@/lib/data/twitter/opinion-map'

export async function POST(request: NextRequest) {
  try {
    // =====================================================
    // SECURITY: Verify request is from QStash
    // =====================================================
    
    const qstashSignature = request.headers.get('upstash-signature')
    
    if (!qstashSignature) {
      // Allow manual testing with Bearer token
      const authHeader = request.headers.get('authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('[Vectorize Worker] Unauthorized: Missing QStash signature')
        return NextResponse.json(
          { error: 'Unauthorized: Missing QStash signature or auth token' },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)
      if (token !== env.twitter.apiKey) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid API key' },
          { status: 401 }
        )
      }
    }

    // =====================================================
    // PARSE PAYLOAD
    // =====================================================
    
    const { tweetIds, zoneId } = await request.json()

    if (!tweetIds || !Array.isArray(tweetIds) || tweetIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid tweetIds array' },
        { status: 400 }
      )
    }

    if (!zoneId) {
      return NextResponse.json(
        { error: 'Missing zoneId' },
        { status: 400 }
      )
    }

    logger.info('[Vectorize Worker] Starting vectorization (on-demand)', {
      zone_id: zoneId,
      tweet_count: tweetIds.length
    })
    // Centralized implementation (single source of truth)
    const result = await ensureEmbeddings(tweetIds)

    logger.info('[Vectorize Worker] Vectorization complete', {
      zone_id: zoneId,
      total_requested: result.total_tweets,
      already_vectorized: result.already_vectorized,
      newly_vectorized: result.newly_vectorized,
      failed: result.failed,
      cache_hit_rate: `${(result.cache_hit_rate * 100).toFixed(1)}%`,
      success: result.success
    })

    return NextResponse.json({
      success: result.success,
      total: result.total_tweets,
      already_vectorized: result.already_vectorized,
      newly_vectorized: result.newly_vectorized,
      failed: result.failed,
      cache_hit_rate: result.cache_hit_rate
    })

  } catch (error) {
    logger.error('[Vectorize Worker] Worker failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

