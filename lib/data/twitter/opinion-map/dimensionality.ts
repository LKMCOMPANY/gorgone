/**
 * Dimensionality reduction for opinion map visualization
 * PCA for clustering, UMAP for 3D visualization
 */

import { PCA } from 'ml-pca'
import { UMAP } from 'umap-js'
import { logger } from '@/lib/logger'
import type { OpinionUMAPResult } from '@/types'

/**
 * Reduce embeddings using PCA (for clustering)
 * Reduces from 1536D to 20D while preserving variance
 * 
 * @param embeddings - Array of 1536D vectors
 * @param nComponents - Target dimensions (default: 20)
 * @returns Reduced 20D vectors
 */
export async function reducePCA(
  embeddings: number[][],
  nComponents: number = 20
): Promise<{
  projections: number[][]
  explainedVariance: number[]
  processingTime: number
}> {
  const startTime = Date.now()

  logger.info('[Opinion Map] Starting PCA reduction', {
    samples: embeddings.length,
    from_dim: embeddings[0]?.length,
    to_dim: nComponents
  })

  // Run PCA
  const pca = new PCA(embeddings, { scale: true })
  const projections = pca.predict(embeddings, { nComponents })
  const explainedVariance = pca.getExplainedVariance()

  const processingTime = Date.now() - startTime
  const totalVariance = explainedVariance
    .slice(0, nComponents)
    .reduce((sum, v) => sum + v, 0)

  // Convert to 2D array
  const projections2D = projections.to2DArray()

  logger.info('[Opinion Map] PCA reduction complete', {
    processing_time_ms: processingTime,
    explained_variance: `${(totalVariance * 100).toFixed(1)}%`,
    output_shape: `${projections2D.length} x ${nComponents}`
  })

  return {
    projections: projections2D,
    explainedVariance,
    processingTime
  }
}

/**
 * Reduce embeddings using UMAP to 3D for visualization
 * 
 * @param embeddings - Array of 1536D vectors
 * @param config - UMAP configuration
 * @returns 3D coordinates
 */
export async function reduceUMAP3D(
  embeddings: number[][],
  config?: {
    nNeighbors?: number
    minDist?: number
    spread?: number
  }
): Promise<OpinionUMAPResult> {
  const startTime = Date.now()

  const umapConfig = {
    nNeighbors: config?.nNeighbors ?? 15,
    minDist: config?.minDist ?? 0.1,
    spread: config?.spread ?? 1.0
  }

  logger.info('[Opinion Map] Starting UMAP 3D reduction', {
    samples: embeddings.length,
    dimensions: embeddings[0]?.length,
    config: umapConfig
  })

  // Initialize UMAP
  const umap = new UMAP({
    nComponents: 3,
    nNeighbors: umapConfig.nNeighbors,
    minDist: umapConfig.minDist,
    spread: umapConfig.spread
  })

  // Fit and transform
  const projections = await umap.fitAsync(embeddings, (epochNumber) => {
    if (epochNumber % 10 === 0) {
      logger.debug('[Opinion Map] UMAP epoch', { epoch: epochNumber })
    }
  })

  const processingTime = Date.now() - startTime

  logger.info('[Opinion Map] UMAP 3D reduction complete', {
    processing_time_ms: processingTime,
    output_shape: `${projections.length} x 3`
  })

  return {
    projections,
    processing_time_ms: processingTime
  }
}

/**
 * Normalize 3D projections to a standard range for visualization
 * 
 * @param projections - Raw UMAP projections
 * @param range - Target range (default: [0, 100])
 * @returns Normalized coordinates
 */
export function normalizeProjections3D(
  projections: number[][],
  range: [number, number] = [0, 100]
): number[][] {
  const [minRange, maxRange] = range

  // Find min/max for each dimension
  const xValues = projections.map(p => p[0])
  const yValues = projections.map(p => p[1])
  const zValues = projections.map(p => p[2])

  const xMin = Math.min(...xValues)
  const xMax = Math.max(...xValues)
  const yMin = Math.min(...yValues)
  const yMax = Math.max(...yValues)
  const zMin = Math.min(...zValues)
  const zMax = Math.max(...zValues)

  logger.debug('[Opinion Map] Normalizing projections', {
    x_range: [xMin, xMax],
    y_range: [yMin, yMax],
    z_range: [zMin, zMax],
    target_range: range
  })

  // Normalize to range
  return projections.map(([x, y, z]) => {
    const xNorm = ((x - xMin) / (xMax - xMin)) * (maxRange - minRange) + minRange
    const yNorm = ((y - yMin) / (yMax - yMin)) * (maxRange - minRange) + minRange
    const zNorm = ((z - zMin) / (zMax - zMin)) * (maxRange - minRange) + minRange
    return [xNorm, yNorm, zNorm]
  })
}
