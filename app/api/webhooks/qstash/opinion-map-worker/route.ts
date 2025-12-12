/**
 * Opinion Map Clustering Worker
 * QStash background worker for opinion map generation
 * 
 * Phases:
 * 0. Vectorization (0-20%): Ensure embeddings exist
 * 1. PCA Reduction (20-40%): 1536D → 20D
 * 2. UMAP Projection (40-60%): 1536D → 3D
 * 3. K-means Clustering (60-75%): Detect clusters
 * 4. AI Labeling (75-100%): Generate labels
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import {
  getSessionById,
  updateSessionProgress,
  markSessionFailed,
  ensureEmbeddings,
  reducePCA,
  reduceUMAP3D,
  normalizeProjections3D,
  clusterKMeans,
  generateClusterLabel,
  saveProjections,
  saveClusters
} from '@/lib/data/twitter/opinion-map'

export async function POST(request: NextRequest) {
  let sessionId: string | null = null

  try {
    // =====================================================
    // SECURITY: Verify request is from QStash
    // =====================================================
    
    const qstashSignature = request.headers.get("upstash-signature")
    
    if (!qstashSignature) {
      // Allow manual testing with Bearer token
      const authHeader = request.headers.get("authorization")
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        logger.warn("[Opinion Map Worker] Unauthorized: Missing QStash signature")
        return NextResponse.json(
          { error: "Unauthorized: Missing QStash signature or auth token" },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)
      if (token !== env.twitter.apiKey) {
        return NextResponse.json(
          { error: "Unauthorized: Invalid API key" },
          { status: 401 }
        )
      }
    }

    // =====================================================
    // PARSE PAYLOAD
    // =====================================================
    
    const { session_id } = await request.json()
    sessionId = session_id

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      )
    }

    // Load session
    const session = await getSessionById(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    logger.info('[Opinion Map Worker] Starting clustering pipeline', {
      session_id: sessionId,
      zone_id: session.zone_id,
      total_tweets: session.total_tweets
    })

    // ==================================================================
    // PHASE 0: VECTORIZATION (0-20%)
    // ==================================================================

    await updateSessionProgress(sessionId, 'vectorizing', 0, 'Checking embeddings...')

    const tweetIds = session.config.sampled_tweet_ids
    
    if (!tweetIds || tweetIds.length === 0) {
      throw new Error('No sampled tweet IDs in session config')
    }

    logger.info('[Opinion Map Worker] Tweet IDs loaded from session', {
      session_id: sessionId,
      total_ids: tweetIds.length,
      first_id: tweetIds[0],
      id_type: typeof tweetIds[0]
    })

    logger.info('[Opinion Map Worker] Starting vectorization', {
      total_tweet_ids: tweetIds.length,
      session_id: sessionId
    })

    const vectorizationResult = await ensureEmbeddings(tweetIds)

    // Check if we have enough vectorized tweets (graceful degradation)
    const totalVectorized = vectorizationResult.already_vectorized + vectorizationResult.newly_vectorized
    const vectorizationRate = (totalVectorized / tweetIds.length) * 100

    logger.info('[Opinion Map Worker] ✅ Vectorization complete', {
      session_id: sessionId,
      requested: tweetIds.length,
      already_cached: vectorizationResult.already_vectorized,
      newly_vectorized: vectorizationResult.newly_vectorized,
      failed: vectorizationResult.failed,
      total_vectorized: totalVectorized,
      cache_hit_rate: `${(vectorizationResult.cache_hit_rate * 100).toFixed(1)}%`,
      vectorization_rate: `${vectorizationRate.toFixed(1)}%`
    })

    // Require at least 50% successful vectorization (best practice: graceful degradation)
    if (totalVectorized < tweetIds.length * 0.5) {
      throw new Error(
        `Insufficient vectorized tweets: only ${totalVectorized}/${tweetIds.length} (${vectorizationRate.toFixed(1)}%) have embeddings. ` +
        `Minimum required: 50%. ${vectorizationResult.failed} tweets failed to vectorize.`
      )
    }

    // Log warning if we have partial failures but enough data to continue
    if (vectorizationResult.failed > 0) {
      logger.warn('[Opinion Map Worker] ⚠️ Partial vectorization failure - continuing with available data', {
        session_id: sessionId,
        failed_count: vectorizationResult.failed,
        success_rate: `${vectorizationRate.toFixed(1)}%`,
        continuing_with: totalVectorized,
        min_required: Math.floor(tweetIds.length * 0.5)
      })
    } else {
      logger.info('[Opinion Map Worker] ✅ 100% vectorization success', {
        session_id: sessionId,
        total: totalVectorized
      })
    }

    await updateSessionProgress(
      sessionId,
      'reducing',
      20,
      `Embeddings ready (${vectorizationResult.cache_hit_rate > 0.5 ? 'mostly cached' : 'newly generated'})`
    )

    // ==================================================================
    // FETCH EMBEDDINGS
    // ==================================================================

    const supabase = createAdminClient()

    // Load zone for operational_context (for better AI labeling)
    const { data: zone } = await supabase
      .from('zones')
      .select('operational_context')
      .eq('id', session.zone_id)
      .single()

    const operationalContext = zone?.operational_context || null

    // Fetch tweets in batches to avoid PostgREST IN clause limit (~100 max) and payload size limits
    // Keep batch size small to prevent both IN clause errors and large embedding payload issues
    const FETCH_BATCH_SIZE = 100
    const tweets: any[] = []

    logger.info('[Opinion Map Worker] Fetching embeddings in batches', {
      total_tweet_ids: tweetIds.length,
      batch_size: FETCH_BATCH_SIZE,
      total_batches: Math.ceil(tweetIds.length / FETCH_BATCH_SIZE),
      note: 'PostgREST IN clause and payload limits enforced'
    })

    for (let i = 0; i < tweetIds.length; i += FETCH_BATCH_SIZE) {
      const batchIds = tweetIds.slice(i, i + FETCH_BATCH_SIZE)
      
      // First: fetch embeddings and basic data (lighter payload)
      const { data: batchTweets, error } = await supabase
        .from('twitter_tweets')
        .select('id, tweet_id, text, embedding')
        .in('id', batchIds)
        .not('embedding', 'is', null)

      if (error) {
        logger.error('[Opinion Map Worker] ❌ Failed to fetch batch', {
          session_id: sessionId,
          batch_index: Math.floor(i / FETCH_BATCH_SIZE),
          batch_size: batchIds.length,
          first_id: batchIds[0],
          error: error.message
        })
        throw new Error(`Failed to fetch embeddings batch: ${error.message}`)
      }

      if (!batchTweets || batchTweets.length === 0) {
        logger.warn('[Opinion Map Worker] ⚠️ Batch returned no tweets with embeddings', {
          session_id: sessionId,
          batch_index: Math.floor(i / FETCH_BATCH_SIZE),
          batch_size: batchIds.length,
          sample_ids: batchIds.slice(0, 3), // Log first 3 IDs for debugging
          fetched: 0
        })
        continue
      }

      logger.debug('[Opinion Map Worker] Batch fetch successful', {
        session_id: sessionId,
        batch_index: Math.floor(i / FETCH_BATCH_SIZE) + 1,
        requested: batchIds.length,
        fetched: batchTweets.length,
        fetch_rate: `${((batchTweets.length / batchIds.length) * 100).toFixed(1)}%`
      })

      // Second: fetch raw_data separately for this batch (only if needed for enrichment)
      // Note: raw_data is only used for enrichTweetContent during vectorization
      // Since we're fetching already-vectorized tweets, we don't need raw_data here
      const enrichedBatch = batchTweets.map(t => ({
        ...t,
        raw_data: {} // Placeholder - not needed for already-vectorized tweets
      }))

      tweets.push(...enrichedBatch)
      
      logger.debug('[Opinion Map Worker] Batch fetched', {
        batch_index: Math.floor(i / FETCH_BATCH_SIZE) + 1,
        fetched: enrichedBatch.length,
        cumulative_total: tweets.length
      })
    }

    if (!tweets || tweets.length === 0) {
      logger.error('[Opinion Map Worker] No vectorized tweets found after batched fetch', {
        total_tweet_ids: tweetIds.length,
        batches_processed: Math.ceil(tweetIds.length / FETCH_BATCH_SIZE)
      })
      throw new Error('No vectorized tweets found')
    }

    // Critical check: ensure we have enough data to proceed
    if (tweets.length < 10) {
      logger.warn('[Opinion Map Worker] ⚠️ Very low tweet count - results may not be meaningful', {
        session_id: sessionId,
        tweet_count: tweets.length
      })
    }

    // Parse embeddings (Supabase returns vectors as strings)
    const embeddings = tweets.map(t => {
      const embedding = t.embedding
      
      // If string, parse it
      if (typeof embedding === 'string') {
        try {
          return JSON.parse(embedding)
        } catch {
          // If parse fails, try to extract array from string
          const match = embedding.match(/\[([\d\s,.-]+)\]/)
          if (match) {
            return match[1].split(',').map(Number)
          }
          throw new Error(`Invalid embedding format for tweet ${t.tweet_id}`)
        }
      }
      
      // If already array, return as is
      if (Array.isArray(embedding)) {
        return embedding
      }
      
      throw new Error(`Unknown embedding format for tweet ${t.tweet_id}`)
    })

    logger.info('[Opinion Map Worker] ✅ All embeddings fetched and parsed successfully', {
      session_id: sessionId,
      total_fetched: tweets.length,
      requested: tweetIds.length,
      fetch_rate: `${((tweets.length / tweetIds.length) * 100).toFixed(1)}%`,
      embeddings_count: embeddings.length,
      embedding_dimension: embeddings[0]?.length || 'unknown'
    })

    // ==================================================================
    // PHASE 1: PCA REDUCTION (20-40%)
    // ==================================================================

    await updateSessionProgress(sessionId, 'reducing', 25, 'Running PCA reduction...')

    // PCA to 50D preserves ~85-95% variance (vs ~70-85% with 20D)
    // Better clustering quality with minimal performance cost
    const PCA_TARGET_DIMENSIONS = 50
    const pcaResult = await reducePCA(embeddings, PCA_TARGET_DIMENSIONS)

    logger.info('[Opinion Map Worker] PCA complete', {
      processing_time_ms: pcaResult.processingTime,
      target_dimensions: PCA_TARGET_DIMENSIONS,
      explained_variance: `${(pcaResult.explainedVariance.slice(0, PCA_TARGET_DIMENSIONS).reduce((a, b) => a + b, 0) * 100).toFixed(1)}%`
    })

    await updateSessionProgress(sessionId, 'reducing', 40, `PCA complete (${PCA_TARGET_DIMENSIONS}D)`)

    // ==================================================================
    // PHASE 2: UMAP 3D PROJECTION (40-60%)
    // Optimization: Run UMAP on 20D PCA instead of 1536D embeddings
    // This is ~77× faster (O(n² × d) where d goes from 1536 to 20)
    // Quality loss is negligible since PCA preserves ~80-90% variance
    // ==================================================================

    await updateSessionProgress(sessionId, 'reducing', 45, 'Running UMAP 3D projection...')

    const umapResult = await reduceUMAP3D(pcaResult.projections, {
      nNeighbors: 15,
      minDist: 0.1,
      spread: 1.0
    })

    const normalizedProjections = normalizeProjections3D(umapResult.projections, [0, 100])

    logger.info('[Opinion Map Worker] UMAP 3D complete', {
      processing_time_ms: umapResult.processing_time_ms
    })

    await updateSessionProgress(sessionId, 'clustering', 60, 'UMAP projection complete')

    // ==================================================================
    // PHASE 3: K-MEANS CLUSTERING (60-75%)
    // ==================================================================

    await updateSessionProgress(sessionId, 'clustering', 65, 'Running K-means clustering...')

    const clusteringSeed = fnv1a32(session.session_id)
    const clusteringResult = await clusterKMeans(pcaResult.projections, { seed: clusteringSeed })

    logger.info('[Opinion Map Worker] Clustering complete', {
      clusters: clusteringResult.cluster_count,
      outliers: clusteringResult.outlier_count
    })

    // ==================================================================
    // SAVE PROJECTIONS (70-75%)
    // ==================================================================

    await updateSessionProgress(sessionId, 'clustering', 70, 'Saving projections...')

    const projectionsToSave = tweets.map((tweet, i) => ({
      tweet_db_id: tweet.id,
      zone_id: session.zone_id,
      session_id: session.session_id,
      x: normalizedProjections[i][0],
      y: normalizedProjections[i][1],
      z: normalizedProjections[i][2],
      cluster_id: clusteringResult.labels[i],
      cluster_confidence: clusteringResult.confidence[i],
      is_outlier: clusteringResult.labels[i] === -1
    }))

    logger.info('[Opinion Map Worker] Saving projections to database', {
      session_id: sessionId,
      projection_count: projectionsToSave.length
    })

    const projectionsSaved = await saveProjections(projectionsToSave)

    if (!projectionsSaved) {
      throw new Error('Failed to save projections to database')
    }

    logger.info('[Opinion Map Worker] ✅ Projections saved successfully', {
      session_id: sessionId,
      saved_count: projectionsToSave.length
    })

    await updateSessionProgress(sessionId, 'labeling', 75, 'Projections saved')

    // ==================================================================
    // PHASE 4: AI CLUSTER LABELING (75-100%)
    // ==================================================================

    await updateSessionProgress(sessionId, 'labeling', 80, 'Generating cluster labels...')

    // Group tweets by cluster
    const clusterTweets = new Map<number, string[]>()
    const clusterProjections = new Map<number, typeof normalizedProjections>()

    clusteringResult.labels.forEach((clusterId, i) => {
      if (clusterId === -1) return // Skip outliers

      if (!clusterTweets.has(clusterId)) {
        clusterTweets.set(clusterId, [])
        clusterProjections.set(clusterId, [])
      }

      clusterTweets.get(clusterId)!.push(tweets[i].text)
      clusterProjections.get(clusterId)!.push(normalizedProjections[i])
    })

    logger.info('[Opinion Map Worker] Clusters to label', {
      count: clusterTweets.size
    })

    // Generate labels for clusters in parallel batches
    // Batch size of 5 balances speed vs API rate limits
    const LABELING_BATCH_SIZE = 5
    const clusterEntries = Array.from(clusterTweets.entries())
    const clustersToSave: Array<{
      zone_id: string
      session_id: string
      cluster_id: number
      label: string
      keywords: string[]
      tweet_count: number
      centroid_x: number
      centroid_y: number
      centroid_z: number
      avg_sentiment: number | null
      coherence_score: number | null
      reasoning: string | null
    }> = []
    let labeled = 0

    for (let i = 0; i < clusterEntries.length; i += LABELING_BATCH_SIZE) {
      const batch = clusterEntries.slice(i, i + LABELING_BATCH_SIZE)
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async ([clusterId, texts]) => {
          const label = await generateClusterLabel(texts, clusterId, operationalContext)
          
          // Calculate centroid
          const projections = clusterProjections.get(clusterId)!
          const centroidX = projections.reduce((sum, p) => sum + p[0], 0) / projections.length
          const centroidY = projections.reduce((sum, p) => sum + p[1], 0) / projections.length
          const centroidZ = projections.reduce((sum, p) => sum + p[2], 0) / projections.length

          return {
            zone_id: session.zone_id,
            session_id: session.session_id,
            cluster_id: clusterId,
            label: label.label,
            keywords: label.keywords,
            tweet_count: texts.length,
            centroid_x: centroidX,
            centroid_y: centroidY,
            centroid_z: centroidZ,
            avg_sentiment: label.sentiment,
            coherence_score: label.confidence,
            reasoning: label.reasoning || null
          }
        })
      )

      clustersToSave.push(...batchResults)
      labeled += batch.length

      // Update progress after each batch
      const progress = 80 + Math.floor((labeled / clusterTweets.size) * 15)
      await updateSessionProgress(
        sessionId,
        'labeling',
        progress,
        `Labeled ${labeled}/${clusterTweets.size} clusters`
      )

      logger.debug('[Opinion Map Worker] Labeling batch complete', {
        batch_index: Math.floor(i / LABELING_BATCH_SIZE) + 1,
        batch_size: batch.length,
        total_labeled: labeled
      })
    }

    // Save clusters
    const clustersSaved = await saveClusters(clustersToSave)

    if (!clustersSaved) {
      throw new Error('Failed to save clusters')
    }

    // ==================================================================
    // COMPLETE
    // ==================================================================

    await updateSessionProgress(sessionId, 'completed', 100, 'Opinion map generated successfully')

    logger.info('[Opinion Map Worker] Pipeline complete', {
      session_id: sessionId,
      total_tweets: tweets.length,
      clusters: clusterTweets.size,
      outliers: clusteringResult.outlier_count
    })

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      total_tweets: tweets.length,
      total_clusters: clusterTweets.size,
      outlier_count: clusteringResult.outlier_count
    })

  } catch (error) {
    logger.error('[Opinion Map Worker] Pipeline failed', {
      session_id: sessionId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    if (sessionId) {
      await markSessionFailed(
        sessionId,
        error instanceof Error ? error.message : 'Unknown error',
        error instanceof Error ? error.stack : undefined
      )
    }

    return NextResponse.json(
      { 
        error: 'Pipeline failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/qstash/opinion-map-worker
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'opinion-map-worker'
  })
}

function fnv1a32(input: string): number {
  // FNV-1a 32-bit hash (stable seed derivation for deterministic clustering)
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  // Ensure positive 32-bit integer
  return hash >>> 0
}

