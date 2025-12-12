/**
 * Opinion Map Data Layer - Module Exports
 * Centralized exports for all opinion map data operations
 */

// Projections CRUD
export {
  saveProjections,
  getProjections,
  getEnrichedProjections,
  getProjectionsByCluster,
} from './projections'

// Clusters CRUD
export {
  saveClusters,
  getClusters,
  getClusterById,
} from './clusters'

// Sessions CRUD
export {
  createSession,
  createOrReuseActiveSession,
  getSessionById,
  getLatestSession,
  getRunningSessionForZone,
  updateSessionProgress,
  markSessionFailed,
  cancelSession,
} from './sessions'

// Sampling strategies
export {
  sampleTweetsStratified,
  calculateTimeGranularity,
} from './sampling'

// Vectorization
export {
  enrichTweetContent,
  getEmbeddingStats,
  ensureEmbeddings,
  generateSingleEmbedding,
} from './vectorization'

// Dimensionality reduction
export {
  reducePCA,
  reduceUMAP3D,
  normalizeProjections3D,
} from './dimensionality'

// Clustering
export {
  clusterKMeans,
  autoDetectK,
} from './clustering'

// Labeling
export {
  generateClusterLabel,
  extractKeywords,
} from './labeling'

// Time series
export {
  generateTimeSeriesData,
  calculateGranularity,
} from './time-series'

// Mapping utilities - for reusing feed components in opinion map
export {
  mapProjectionToTweet,
  mapProjectionsToTweets,
  sortByEngagement,
  sortByRecency,
} from './mapping'

// Enrichment utilities - attach cluster data to tweets
export {
  buildClusterMap,
  buildProjectionMap,
  enrichTweetWithCluster,
  enrichTweetsWithClusters,
  filterTweetsWithClusters,
  groupTweetsByCluster,
  getClusterStatistics,
} from './enrichment'

// Feed integration - easy integration into existing feeds
export {
  enrichFeedWithClusters,
  hasCompletedOpinionMap,
  getActiveOpinionMapSession,
  getOpinionMapStats,
} from './feed-integration'

// Types (re-export from main types file)
export type {
  EnrichedTwitterProjection,
  TwitterOpinionCluster,
  TwitterOpinionSession,
  OpinionSessionStatus,
  OpinionSessionConfig,
  OpinionEvolutionData,
  TwitterTweetWithCluster,
} from '@/types'
