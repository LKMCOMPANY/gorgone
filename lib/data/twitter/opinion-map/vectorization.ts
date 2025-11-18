/**
 * On-demand tweet vectorization with intelligent caching
 * Only vectorizes tweets that lack embeddings
 */

import { embed, embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { OpinionEmbeddingResult } from '@/types'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const MAX_CONTENT_LENGTH = 8000
const BATCH_SIZE = 100

/**
 * Enrich tweet content for vectorization
 * Combines text, author info, and hashtags for semantic richness
 * 
 * @param tweet - Tweet data
 * @returns Enriched text ready for embedding
 */
export function enrichTweetContent(tweet: {
  text: string
  author_name?: string | null
  author_username?: string | null
  hashtags?: string[] | null
}): string {
  const parts: string[] = []

  // Main tweet text (most important)
  if (tweet.text) {
    parts.push(tweet.text.trim())
  }

  // Author context (helps with semantic clustering)
  if (tweet.author_name || tweet.author_username) {
    const authorParts: string[] = []
    if (tweet.author_name) {
      authorParts.push(tweet.author_name)
    }
    if (tweet.author_username) {
      authorParts.push(`(@${tweet.author_username})`)
    }
    parts.push(`Author: ${authorParts.join(' ')}`)
  }

  // Hashtags (important for thematic clustering)
  if (tweet.hashtags && tweet.hashtags.length > 0) {
    const hashtagsText = tweet.hashtags.map(tag => `#${tag}`).join(' ')
    parts.push(`Hashtags: ${hashtagsText}`)
  }

  const enrichedText = parts.join('\n').trim()

  // Truncate if too long
  if (enrichedText.length > MAX_CONTENT_LENGTH) {
    logger.warn('[Vectorization] Content truncated', {
      original_length: enrichedText.length,
      truncated_length: MAX_CONTENT_LENGTH
    })
    return enrichedText.slice(0, MAX_CONTENT_LENGTH)
  }

  return enrichedText
}

/**
 * Check which sampled tweets need vectorization
 * Returns statistics on cache hits vs misses
 * 
 * @param tweetIds - Tweet IDs to check
 * @returns Statistics on embedding status
 */
export async function getEmbeddingStats(
  tweetIds: string[]
): Promise<{
  total: number
  cached: number
  needs_embedding: number
  cache_hit_rate: number
}> {
  const supabase = await createClient()

  const { count: cached } = await supabase
    .from('twitter_tweets')
    .select('*', { count: 'exact', head: true })
    .in('id', tweetIds)
    .not('embedding', 'is', null)

  const total = tweetIds.length
  const cachedCount = cached || 0
  const needsEmbedding = total - cachedCount

  return {
    total,
    cached: cachedCount,
    needs_embedding: needsEmbedding,
    cache_hit_rate: total > 0 ? cachedCount / total : 0
  }
}

/**
 * Ensure all sampled tweets have embeddings
 * Vectorizes missing tweets in batches
 * 
 * @param tweetIds - Tweet IDs to ensure embeddings for
 * @returns Statistics on vectorization operation
 */
export async function ensureEmbeddings(
  tweetIds: string[]
): Promise<{
  success: boolean
  total_tweets: number
  already_vectorized: number
  newly_vectorized: number
  failed: number
  cache_hit_rate: number
}> {
  const supabase = await createClient()

  logger.info('[Vectorization] Ensuring embeddings', {
    tweet_count: tweetIds.length
  })

  // Get tweets that need vectorization
  const { data: tweetsNeedingEmbedding } = await supabase
    .from('twitter_tweets')
    .select(`
      id,
      tweet_id,
      text,
      raw_data
    `)
    .in('id', tweetIds)
    .is('embedding', null)

  const alreadyVectorized = tweetIds.length - (tweetsNeedingEmbedding?.length || 0)

  if (!tweetsNeedingEmbedding || tweetsNeedingEmbedding.length === 0) {
    logger.info('[Vectorization] All tweets already vectorized (100% cache hit)', {
      total: tweetIds.length
    })

      return {
        success: true,
      total_tweets: tweetIds.length,
      already_vectorized: alreadyVectorized,
      newly_vectorized: 0,
        failed: 0,
      cache_hit_rate: 1.0
    }
  }

  logger.info('[Vectorization] Starting batch vectorization', {
    total: tweetIds.length,
    cached: alreadyVectorized,
    to_vectorize: tweetsNeedingEmbedding.length,
    cache_hit_rate: `${((alreadyVectorized / tweetIds.length) * 100).toFixed(1)}%`
  })

  // Batch vectorize
  let newlyVectorized = 0
  let failed = 0

    for (let i = 0; i < tweetsNeedingEmbedding.length; i += BATCH_SIZE) {
    const batch = tweetsNeedingEmbedding.slice(i, i + BATCH_SIZE)

    logger.debug('[Vectorization] Processing batch', {
        batch: Math.floor(i / BATCH_SIZE) + 1,
      total_batches: Math.ceil(tweetsNeedingEmbedding.length / BATCH_SIZE),
      size: batch.length
    })

      try {
        // Enrich content for each tweet
      const contents = batch.map(tweet => {
        // Extract author info from raw_data
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
        model: openai.embedding(EMBEDDING_MODEL),
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
          logger.error('[Vectorization] Failed to update tweet', {
            tweet_id: batch[j].tweet_id,
            error: updateError
          })
          failed++
        }
      }

      logger.debug('[Vectorization] Batch completed', {
        vectorized: batch.length,
        tokens_used: result.usage?.tokens || 0
      })

        // Small delay between batches (rate limit protection)
        if (i + BATCH_SIZE < tweetsNeedingEmbedding.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (batchError) {
      logger.error('[Vectorization] Batch failed', {
          batch: Math.floor(i / BATCH_SIZE) + 1,
        error: batchError
      })
      failed += batch.length
      }
    }

  const cacheHitRate = alreadyVectorized / tweetIds.length

  logger.info('[Vectorization] Vectorization complete', {
    total: tweetIds.length,
    already_vectorized: alreadyVectorized,
    newly_vectorized: newlyVectorized,
    failed,
    cache_hit_rate: `${(cacheHitRate * 100).toFixed(1)}%`
  })

    return {
    success: failed === 0,
    total_tweets: tweetIds.length,
    already_vectorized: alreadyVectorized,
    newly_vectorized: newlyVectorized,
    failed,
    cache_hit_rate: cacheHitRate
  }
}

/**
 * Generate embedding for a single tweet (used for testing or special cases)
 * 
 * @param content - Text content to vectorize
 * @returns Embedding result
 */
export async function generateSingleEmbedding(
  content: string
): Promise<OpinionEmbeddingResult> {
  try {
    if (!content || content.trim().length === 0) {
      return {
        success: false,
        error: 'Content cannot be empty'
      }
    }

    const truncated = content.length > MAX_CONTENT_LENGTH
        ? content.slice(0, MAX_CONTENT_LENGTH)
      : content

    const result = await embed({
      model: openai.embedding(EMBEDDING_MODEL),
      value: truncated
    })

    return {
      success: true,
      embedding: result.embedding,
      tokens_used: result.usage?.tokens
    }
  } catch (error) {
    logger.error('[Vectorization] Single embedding failed', { error })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
