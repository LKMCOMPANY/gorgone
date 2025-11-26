/**
 * On-demand tweet vectorization with intelligent caching
 * Only vectorizes tweets that lack embeddings
 */

import { embed, embedMany } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import type { OpinionEmbeddingResult } from '@/types'

// Configure OpenAI with AI Gateway
const openaiGateway = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1'
})

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
  const supabase = createAdminClient()

  // Count cached embeddings in batches to avoid PostgreSQL IN clause limit
  const BATCH_SIZE = 500
  let cachedCount = 0

  for (let i = 0; i < tweetIds.length; i += BATCH_SIZE) {
    const batchIds = tweetIds.slice(i, i + BATCH_SIZE)
    
    const { count } = await supabase
      .from('twitter_tweets')
      .select('*', { count: 'exact', head: true })
      .in('id', batchIds)
      .not('embedding', 'is', null)

    cachedCount += count || 0
  }

  const total = tweetIds.length
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
  const supabase = createAdminClient()

  logger.info('[Vectorization] Ensuring embeddings', {
    tweet_count: tweetIds.length
  })

  // Get tweets that need vectorization (in batches to avoid IN clause limit)
  const BATCH_SIZE = 500
  const tweetsNeedingEmbedding: any[] = []
  const tweetsWithEmbeddings: any[] = []

  logger.info('[Vectorization] Fetching tweets from database in batches', {
    total_ids: tweetIds.length,
    batch_size: BATCH_SIZE,
    total_batches: Math.ceil(tweetIds.length / BATCH_SIZE)
  })

  for (let i = 0; i < tweetIds.length; i += BATCH_SIZE) {
    const batchIds = tweetIds.slice(i, i + BATCH_SIZE)
    
    // Fetch ALL tweets in this batch (with or without embedding)
    const { data: allBatchTweets, error } = await supabase
      .from('twitter_tweets')
      .select(`
        id,
        tweet_id,
        text,
        raw_data,
        embedding
      `)
      .in('id', batchIds)

    if (error) {
      logger.error('[Vectorization] Failed to fetch batch', {
        batch_index: Math.floor(i / BATCH_SIZE),
        error: error.message
      })
      continue
    }

    if (!allBatchTweets || allBatchTweets.length === 0) {
      logger.warn('[Vectorization] Batch found no tweets', {
        batch_index: Math.floor(i / BATCH_SIZE),
        requested: batchIds.length
      })
      continue
    }

    // Separate tweets with and without embeddings
    for (const tweet of allBatchTweets) {
      if (tweet.embedding) {
        tweetsWithEmbeddings.push(tweet)
      } else {
        tweetsNeedingEmbedding.push(tweet)
      }
    }

    logger.debug('[Vectorization] Batch processed', {
      batch_index: Math.floor(i / BATCH_SIZE) + 1,
      found: allBatchTweets.length,
      with_embedding: allBatchTweets.filter((t: any) => t.embedding).length,
      without_embedding: allBatchTweets.filter((t: any) => !t.embedding).length
    })
  }

  const totalTweetsFound = tweetsWithEmbeddings.length + tweetsNeedingEmbedding.length
  const alreadyVectorized = tweetsWithEmbeddings.length

  logger.info('[Vectorization] Database fetch complete', {
    total_requested: tweetIds.length,
    total_found: totalTweetsFound,
    find_rate: `${((totalTweetsFound / tweetIds.length) * 100).toFixed(1)}%`,
    already_vectorized: alreadyVectorized,
    needs_vectorization: tweetsNeedingEmbedding.length
  })

  // Critical check: ensure we actually found the tweets in the DB
  if (totalTweetsFound < tweetIds.length * 0.5) {
    logger.error('[Vectorization] ❌ Most sampled tweets not found in database', {
      requested: tweetIds.length,
      found: totalTweetsFound,
      missing: tweetIds.length - totalTweetsFound,
      find_rate: `${((totalTweetsFound / tweetIds.length) * 100).toFixed(1)}%`,
      first_ids: tweetIds.slice(0, 5)
    })
    throw new Error(
      `Only ${totalTweetsFound}/${tweetIds.length} sampled tweets found in database. ` +
      `This indicates an issue with sampling or database state.`
    )
  }

  if (!tweetsNeedingEmbedding || tweetsNeedingEmbedding.length === 0) {
    logger.info('[Vectorization] ✅ All found tweets already vectorized', {
      total_requested: tweetIds.length,
      found_in_db: totalTweetsFound,
      already_vectorized: alreadyVectorized,
      cache_hit_rate: `${((alreadyVectorized / totalTweetsFound) * 100).toFixed(1)}%`
    })

      return {
        success: true,
      total_tweets: tweetIds.length,
      already_vectorized: alreadyVectorized,
      newly_vectorized: 0,
        failed: totalTweetsFound < tweetIds.length ? tweetIds.length - totalTweetsFound : 0,
      cache_hit_rate: totalTweetsFound > 0 ? alreadyVectorized / totalTweetsFound : 0
    }
  }

  logger.info('[Vectorization] Starting batch vectorization', {
    total_requested: tweetIds.length,
    found_in_db: totalTweetsFound,
    already_vectorized: alreadyVectorized,
    to_vectorize: tweetsNeedingEmbedding.length,
    cache_hit_rate: `${((alreadyVectorized / totalTweetsFound) * 100).toFixed(1)}%`
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
        error: batchError,
        error_message: batchError instanceof Error ? batchError.message : String(batchError),
        error_stack: batchError instanceof Error ? batchError.stack : undefined
      })
      failed += batch.length
      }
    }

  const totalVectorized = alreadyVectorized + newlyVectorized
  const notFound = tweetIds.length - totalTweetsFound
  const cacheHitRate = totalVectorized > 0 ? alreadyVectorized / totalVectorized : 0

  logger.info('[Vectorization] ✅ Vectorization complete', {
    total_requested: tweetIds.length,
    found_in_db: totalTweetsFound,
    already_vectorized: alreadyVectorized,
    newly_vectorized: newlyVectorized,
    total_vectorized: totalVectorized,
    failed: failed + notFound,
    cache_hit_rate: `${(cacheHitRate * 100).toFixed(1)}%`
  })

    return {
    success: totalVectorized >= tweetIds.length * 0.5, // At least 50% must be vectorized
    total_tweets: tweetIds.length,
    already_vectorized: alreadyVectorized,
    newly_vectorized: newlyVectorized,
    failed: failed + notFound, // Include tweets not found in DB as failures
    cache_hit_rate: totalVectorized > 0 ? alreadyVectorized / totalVectorized : 0
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
      model: openaiGateway.embedding(EMBEDDING_MODEL),
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
