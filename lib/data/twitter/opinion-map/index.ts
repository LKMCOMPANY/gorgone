/**
 * Opinion Map Data Layer
 * Centralized exports for all opinion map data operations
 * 
 * Following Gorgone V2 architecture patterns:
 * - All data access through /lib/data
 * - Strong typing
 * - Centralized logging
 * - Error handling
 */

// Sampling
export { 
  sampleTweetsStratified,
  calculateTimeGranularity 
} from './sampling'
export type { 
  SamplingConfig, 
  SamplingResult 
} from './sampling'

// Sessions
export {
  createSession,
  getLatestSession,
  getSessionById,
  updateSessionProgress,
  markSessionFailed,
  cancelSession
} from './sessions'

// Vectorization
export {
  enrichTweetContent,
  getEmbeddingStats,
  ensureEmbeddings,
  generateSingleEmbedding
} from './vectorization'

// Dimensionality Reduction
export {
  reducePCA,
  reduceUMAP3D,
  normalizeProjections3D
} from './dimensionality'

// Clustering
export {
  clusterKMeans,
  autoDetectK
} from './clustering'

// Labeling
export {
  generateClusterLabel,
  extractKeywords
} from './labeling'

// Projections
export {
  saveProjections,
  getProjections,
  getEnrichedProjections,
  getProjectionsByCluster
} from './projections'

// Clusters
export {
  saveClusters,
  getClusters,
  getClusterById
} from './clusters'

// Time Series
export {
  generateTimeSeriesData,
  calculateGranularity
} from './time-series'
