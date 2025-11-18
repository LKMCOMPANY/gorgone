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

    const vectorizationResult = await ensureEmbeddings(tweetIds)

    if (!vectorizationResult.success) {
      throw new Error('Vectorization failed')
    }

    logger.info('[Opinion Map Worker] Vectorization complete', {
      cache_hit_rate: `${(vectorizationResult.cache_hit_rate * 100).toFixed(1)}%`,
      newly_vectorized: vectorizationResult.newly_vectorized
    })

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

    const { data: tweets } = await supabase
      .from('twitter_tweets')
      .select('id, tweet_id, text, embedding, raw_data')
      .in('id', tweetIds)
      .not('embedding', 'is', null)

    if (!tweets || tweets.length === 0) {
      throw new Error('No vectorized tweets found')
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

    logger.info('[Opinion Map Worker] Embeddings fetched', {
      count: embeddings.length,
      dimensions: embeddings[0]?.length
    })

    // ==================================================================
    // PHASE 1: PCA REDUCTION (20-40%)
    // ==================================================================

    await updateSessionProgress(sessionId, 'reducing', 25, 'Running PCA reduction...')

    const pcaResult = await reducePCA(embeddings, 20)

    logger.info('[Opinion Map Worker] PCA complete', {
      processing_time_ms: pcaResult.processingTime,
      explained_variance: `${(pcaResult.explainedVariance.slice(0, 20).reduce((a, b) => a + b, 0) * 100).toFixed(1)}%`
    })

    await updateSessionProgress(sessionId, 'reducing', 40, 'PCA complete (20D)')

    // ==================================================================
    // PHASE 2: UMAP 3D PROJECTION (40-60%)
    // ==================================================================

    await updateSessionProgress(sessionId, 'reducing', 45, 'Running UMAP 3D projection...')

    const umapResult = await reduceUMAP3D(embeddings, {
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

    const clusteringResult = await clusterKMeans(pcaResult.projections)

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

    const projectionsSaved = await saveProjections(projectionsToSave)

    if (!projectionsSaved) {
      throw new Error('Failed to save projections')
    }

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

    // Generate labels for each cluster
    const clustersToSave = []
    let labeled = 0

    for (const [clusterId, texts] of clusterTweets.entries()) {
      const label = await generateClusterLabel(texts, clusterId)

      // Calculate centroid
      const projections = clusterProjections.get(clusterId)!
      const centroidX = projections.reduce((sum, p) => sum + p[0], 0) / projections.length
      const centroidY = projections.reduce((sum, p) => sum + p[1], 0) / projections.length
      const centroidZ = projections.reduce((sum, p) => sum + p[2], 0) / projections.length

      clustersToSave.push({
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
      })

      labeled++

      // Update progress
      const progress = 80 + Math.floor((labeled / clusterTweets.size) * 15)
      await updateSessionProgress(
        sessionId,
        'labeling',
        progress,
        `Labeled ${labeled}/${clusterTweets.size} clusters`
      )
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

