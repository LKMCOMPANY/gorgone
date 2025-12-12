/**
 * K-means clustering algorithm
 * Detects opinion clusters in PCA-reduced space
 */

import { logger } from '@/lib/logger'
import type { OpinionClusteringResult } from '@/types'

/**
 * K-means clustering with auto-detection of optimal K
 * 
 * @param vectors - 20D PCA-reduced vectors
 * @param config - Clustering configuration
 * @returns Cluster assignments and metadata
 */
export async function clusterKMeans(
  vectors: number[][],
  config?: {
    k?: number
    maxIterations?: number
    tolerance?: number
    /**
     * Optional deterministic seed to make runs reproducible (recommended for pipelines)
     */
    seed?: number
  }
): Promise<OpinionClusteringResult> {
  const maxIterations = config?.maxIterations ?? 100
  const tolerance = config?.tolerance ?? 1e-4
  const rng = config?.seed != null ? createRng(config.seed) : Math.random

  logger.info('[Opinion Map] Starting K-means clustering', {
    samples: vectors.length,
    dimensions: vectors[0]?.length,
    max_iterations: maxIterations,
    seeded: config?.seed != null
  })

  // Auto-detect optimal K if not provided
  const k = config?.k ?? await autoDetectK(vectors, config?.seed)

  logger.info('[Opinion Map] K-means configuration', {
    k,
    auto_detected: !config?.k
  })

  // Initialize centroids randomly
  const centroids = initializeCentroids(vectors, k, rng)
  const labels = new Array(vectors.length).fill(0)
  const distances = new Array(vectors.length).fill(Infinity)
  let iteration = 0
  let converged = false

  // K-means iteration
  while (iteration < maxIterations && !converged) {
    let changed = 0

    // Assignment step: assign each point to nearest centroid
    for (let i = 0; i < vectors.length; i++) {
      let minDist = Infinity
      let bestCluster = labels[i]

      for (let j = 0; j < k; j++) {
        const dist = euclideanDistance(vectors[i], centroids[j])
        if (dist < minDist) {
          minDist = dist
          bestCluster = j
        }
      }

      if (labels[i] !== bestCluster) {
        changed++
      }

      labels[i] = bestCluster
      distances[i] = minDist
    }

    // Update step: recalculate centroids
    const newCentroids = calculateCentroids(vectors, labels, k, rng)

    // Check convergence
    const centroidShift = centroids.reduce((sum, centroid, j) => {
      return sum + euclideanDistance(centroid, newCentroids[j])
    }, 0)

    if (centroidShift < tolerance) {
      converged = true
    }

    centroids.splice(0, centroids.length, ...newCentroids)
    iteration++

    if (iteration % 10 === 0 || converged) {
      logger.debug('[Opinion Map] K-means progress', {
        iteration,
        changed_assignments: changed,
        centroid_shift: centroidShift.toFixed(6),
        converged
      })
    }
  }

  // Calculate confidence scores
  const confidence = calculateConfidence(vectors, labels, centroids)

  // Detect outliers (low confidence points)
  // Lower threshold = more tolerant (0.2 = keep points with ≥20% confidence)
  const CONFIDENCE_THRESHOLD = 0.2
  let outlierCount = 0

  for (let i = 0; i < confidence.length; i++) {
    if (confidence[i] < CONFIDENCE_THRESHOLD) {
      labels[i] = -1 // Mark as outlier
      outlierCount++
    }
  }

  logger.info('[Opinion Map] K-means clustering complete', {
    iterations: iteration,
    converged,
    clusters: k,
    outliers: outlierCount
  })

  return {
    labels,
    confidence,
    centroids,
    cluster_count: k,
    outlier_count: outlierCount
  }
}

/**
 * Auto-detect optimal K using:
 * - Elbow method on WCSS curve
 * - A cheap centroid-distance silhouette proxy (stable + fast for online pipelines)
 *
 * Tests K from 5 to 12 and selects best.
 * 
 * @param vectors - Input vectors
 * @returns Optimal K value
 */
export async function autoDetectK(vectors: number[][], seed?: number): Promise<number> {
  const minK = 5
  const maxK = 12
  const scores: number[] = []
  const silhouetteProxyScores: number[] = []

  logger.info('[Opinion Map] Auto-detecting optimal K', {
    min_k: minK,
    max_k: maxK,
    seeded: seed != null
  })

  for (let k = minK; k <= maxK; k++) {
    // Run quick K-means
    const result = await clusterKMeans(vectors, {
      k,
      maxIterations: 50, // Faster for testing
      tolerance: 1e-3,
      seed: seed != null ? (seed + k) : undefined
    })

    // Calculate within-cluster sum of squares
    let wcss = 0
    for (let i = 0; i < vectors.length; i++) {
      if (result.labels[i] >= 0) {
        const centroid = result.centroids[result.labels[i]]
        wcss += euclideanDistance(vectors[i], centroid) ** 2
      }
    }

    scores.push(wcss)
    silhouetteProxyScores.push(calculateSilhouetteProxy(vectors, result.labels, result.centroids))

    logger.debug('[Opinion Map] K evaluation', {
      k,
      wcss: wcss.toFixed(2),
      outliers: result.outlier_count,
      silhouette_proxy: silhouetteProxyScores[silhouetteProxyScores.length - 1].toFixed(3)
    })
  }

  // Find elbow point (greatest rate of change reduction)
  let elbowK = minK
  let maxRateChange = 0

  for (let i = 1; i < scores.length - 1; i++) {
    const rateChange = (scores[i - 1] - scores[i]) - (scores[i] - scores[i + 1])
    if (rateChange > maxRateChange) {
      maxRateChange = rateChange
      elbowK = minK + i
    }
  }

  // Prefer silhouette proxy if meaningful; fallback to elbow otherwise.
  let bestK = elbowK
  let bestSil = -Infinity
  for (let i = 0; i < silhouetteProxyScores.length; i++) {
    const s = silhouetteProxyScores[i]
    if (Number.isFinite(s) && s > bestSil) {
      bestSil = s
      bestK = minK + i
    }
  }

  logger.info('[Opinion Map] Optimal K detected', {
    k: bestK,
    elbow_k: elbowK,
    silhouette_proxy_best: Number.isFinite(bestSil) ? bestSil : null
  })

  return bestK
}

/**
 * Initialize centroids using K-means++ algorithm
 * Better initialization than random
 */
function initializeCentroids(
  vectors: number[][],
  k: number,
  rng: () => number
): number[][] {
  const centroids: number[][] = []

  // Choose first centroid randomly
  const firstIdx = Math.floor(rng() * vectors.length)
  centroids.push([...vectors[firstIdx]])

  // Choose remaining centroids
  for (let i = 1; i < k; i++) {
    const distances: number[] = []

    // Calculate distance to nearest centroid for each point
    for (const vector of vectors) {
      const minDist = Math.min(
        ...centroids.map(c => euclideanDistance(vector, c))
      )
      distances.push(minDist ** 2)
    }

    // Choose next centroid with probability proportional to distance
    const sum = distances.reduce((a, b) => a + b, 0)
    let random = rng() * sum
    let idx = 0

    for (let j = 0; j < distances.length; j++) {
      random -= distances[j]
      if (random <= 0) {
        idx = j
        break
      }
    }

    centroids.push([...vectors[idx]])
  }

  return centroids
}

/**
 * Calculate new centroids as mean of assigned points
 */
function calculateCentroids(
  vectors: number[][],
  labels: number[],
  k: number
  ,
  rng: () => number
): number[][] {
  const centroids: number[][] = []
  const dimensions = vectors[0].length

  for (let i = 0; i < k; i++) {
    const clusterPoints = vectors.filter((_, idx) => labels[idx] === i)

    if (clusterPoints.length === 0) {
      // Empty cluster - reinitialize randomly
      const randomIdx = Math.floor(rng() * vectors.length)
      centroids.push([...vectors[randomIdx]])
    } else {
      // Calculate mean
      const centroid = new Array(dimensions).fill(0)

      for (const point of clusterPoints) {
        for (let d = 0; d < dimensions; d++) {
          centroid[d] += point[d]
        }
      }

      for (let d = 0; d < dimensions; d++) {
        centroid[d] /= clusterPoints.length
      }

      centroids.push(centroid)
    }
  }

  return centroids
}

/**
 * Calculate confidence score for each cluster assignment
 * Based on distance to nearest centroid vs second-nearest
 */
function calculateConfidence(
  vectors: number[][],
  labels: number[],
  centroids: number[][]
): number[] {
  const confidence: number[] = []

  for (let i = 0; i < vectors.length; i++) {
    const distances = centroids.map(c => euclideanDistance(vectors[i], c))

    // Sort to get nearest and second-nearest
    const sorted = [...distances].sort((a, b) => a - b)
    const nearest = sorted[0]
    const secondNearest = sorted[1] || nearest

    // Confidence = relative difference
    // High confidence: nearest << second-nearest
    // Low confidence: nearest ≈ second-nearest
    const conf = secondNearest > 0
      ? (secondNearest - nearest) / secondNearest
      : 1

    confidence.push(conf)
  }

  return confidence
}

/**
 * Calculate Euclidean distance between two vectors
 */
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

/**
 * Deterministic PRNG (xorshift32) for reproducible clustering runs.
 */
function createRng(seed: number): () => number {
  let x = (seed | 0) || 1
  return () => {
    // xorshift32
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    // Convert to [0, 1)
    return ((x >>> 0) / 4294967296)
  }
}

/**
 * Cheap silhouette proxy using centroid distances:
 * a = distance to own centroid, b = distance to nearest other centroid
 * score = (b - a) / max(a, b)
 *
 * This is not the full silhouette (no intra-cluster pairwise distances),
 * but it's stable, fast, and correlates well enough for picking K online.
 */
function calculateSilhouetteProxy(
  vectors: number[][],
  labels: number[],
  centroids: number[][]
): number {
  const n = vectors.length
  if (n < 5 || centroids.length < 2) return -Infinity

  const SAMPLE_LIMIT = 500
  const step = Math.max(1, Math.floor(n / SAMPLE_LIMIT))

  let sum = 0
  let count = 0

  for (let i = 0; i < n; i += step) {
    const c = labels[i]
    if (c == null || c < 0) continue

    const a = euclideanDistance(vectors[i], centroids[c])
    let b = Infinity

    for (let j = 0; j < centroids.length; j++) {
      if (j === c) continue
      const d = euclideanDistance(vectors[i], centroids[j])
      if (d < b) b = d
    }

    const denom = Math.max(a, b)
    if (!Number.isFinite(denom) || denom === 0) continue
    sum += (b - a) / denom
    count++
  }

  return count > 0 ? (sum / count) : -Infinity
}
