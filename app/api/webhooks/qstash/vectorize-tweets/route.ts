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
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import { embedMany } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { enrichTweetContent } from '@/lib/data/twitter/opinion-map/vectorization'

// Configure OpenAI with AI Gateway
const openaiGateway = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1'
})

const EMBEDDING_MODEL = 'text-embedding-3-small'
const BATCH_SIZE = 100 // OpenAI batch limit

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

    logger.info('[Vectorize Worker] Starting vectorization', {
      zone_id: zoneId,
      tweet_count: tweetIds.length
    })

    const supabase = createAdminClient()

    // =====================================================
    // FETCH TWEETS WITHOUT EMBEDDINGS
    // =====================================================

    // Fetch in batches to respect PostgREST IN clause limit (~100)
    const tweetsToVectorize: any[] = []
    
    for (let i = 0; i < tweetIds.length; i += BATCH_SIZE) {
      const batchIds = tweetIds.slice(i, i + BATCH_SIZE)
      
      const { data: batchTweets, error } = await supabase
        .from('twitter_tweets')
        .select('id, tweet_id, text, raw_data, embedding')
        .in('id', batchIds)

      if (error) {
        logger.error('[Vectorize Worker] Failed to fetch batch', {
          batch_index: Math.floor(i / BATCH_SIZE),
          error: error.message
        })
        continue
      }

      if (batchTweets && batchTweets.length > 0) {
        // Filter only tweets without embeddings
        const tweetsWithoutEmbedding = batchTweets.filter(t => !t.embedding)
        tweetsToVectorize.push(...tweetsWithoutEmbedding)
      }
    }

    if (tweetsToVectorize.length === 0) {
      logger.info('[Vectorize Worker] All tweets already have embeddings (100% cache hit)', {
        zone_id: zoneId,
        total_tweets: tweetIds.length
      })

      return NextResponse.json({
        success: true,
        total: tweetIds.length,
        already_vectorized: tweetIds.length,
        newly_vectorized: 0,
        failed: 0
      })
    }

    logger.info('[Vectorize Worker] Tweets to vectorize', {
      zone_id: zoneId,
      total: tweetIds.length,
      already_vectorized: tweetIds.length - tweetsToVectorize.length,
      to_vectorize: tweetsToVectorize.length
    })

    // =====================================================
    // VECTORIZE IN BATCHES
    // =====================================================

    let newlyVectorized = 0
    let failed = 0

    for (let i = 0; i < tweetsToVectorize.length; i += BATCH_SIZE) {
      const batch = tweetsToVectorize.slice(i, i + BATCH_SIZE)

      try {
        // Enrich content for each tweet (reuse existing function)
        const contents = batch.map(tweet => {
          const author = (tweet.raw_data as any)?.author || {}
          const hashtags = (tweet.raw_data as any)?.entities?.hashtags?.map(
            (h: any) => h.text
          ) || []

          return enrichTweetContent({
            text: tweet.text,
            author_name: author.name,
            author_username: author.userName,
            hashtags
          })
        })

        // Generate embeddings (single API call for batch)
        const result = await embedMany({
          model: openaiGateway.embedding(EMBEDDING_MODEL),
          values: contents
        })

        // Update database
        for (let j = 0; j < batch.length; j++) {
          try {
            await supabase
              .from('twitter_tweets')
              .update({
                embedding: result.embeddings[j],
                embedding_model: EMBEDDING_MODEL,
                embedding_created_at: new Date().toISOString()
              })
              .eq('id', batch[j].id)

            newlyVectorized++
          } catch (updateError) {
            logger.error('[Vectorize Worker] Failed to update tweet', {
              tweet_id: batch[j].tweet_id,
              error: updateError
            })
            failed++
          }
        }

        logger.info('[Vectorize Worker] Batch vectorized', {
          batch: Math.floor(i / BATCH_SIZE) + 1,
          total_batches: Math.ceil(tweetsToVectorize.length / BATCH_SIZE),
          vectorized: batch.length,
          tokens_used: result.usage?.tokens || 0
        })

        // Rate limit protection (2s delay between batches)
        if (i + BATCH_SIZE < tweetsToVectorize.length) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (batchError) {
        logger.error('[Vectorize Worker] Batch failed', {
          batch: Math.floor(i / BATCH_SIZE) + 1,
          error: batchError,
          error_message: batchError instanceof Error ? batchError.message : String(batchError)
        })
        failed += batch.length
      }
    }

    logger.info('[Vectorize Worker] Vectorization complete', {
      zone_id: zoneId,
      total: tweetIds.length,
      already_vectorized: tweetIds.length - tweetsToVectorize.length,
      newly_vectorized: newlyVectorized,
      failed,
      success_rate: `${((newlyVectorized / tweetsToVectorize.length) * 100).toFixed(1)}%`
    })

    return NextResponse.json({
      success: true,
      total: tweetIds.length,
      already_vectorized: tweetIds.length - tweetsToVectorize.length,
      newly_vectorized: newlyVectorized,
      failed
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

