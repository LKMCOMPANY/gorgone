/**
 * Tweet enrichment with opinion cluster data
 * Provides utilities to attach cluster information to tweets
 */

import type { 
  TwitterTweetWithProfile, 
  TwitterOpinionCluster, 
  TwitterTweetProjection,
  TwitterTweetWithCluster
} from '@/types';
import { logger } from '@/lib/logger';

/**
 * Map builder for fast cluster lookups
 * 
 * @param clusters - Array of clusters
 * @returns Map of cluster_id -> cluster
 */
export function buildClusterMap(
  clusters: TwitterOpinionCluster[]
): Map<number, TwitterOpinionCluster> {
  const map = new Map<number, TwitterOpinionCluster>();
  
  for (const cluster of clusters) {
    map.set(cluster.cluster_id, cluster);
  }
  
  return map;
}

/**
 * Map builder for fast tweet -> cluster lookups
 * 
 * @param projections - Array of tweet projections
 * @returns Map of tweet_id -> projection
 */
export function buildProjectionMap(
  projections: TwitterTweetProjection[]
): Map<string, TwitterTweetProjection> {
  const map = new Map<string, TwitterTweetProjection>();
  
  for (const projection of projections) {
    map.set(projection.tweet_db_id, projection);
  }
  
  return map;
}

/**
 * Enrich a single tweet with cluster data
 * 
 * @param tweet - Tweet to enrich
 * @param projectionMap - Map of tweet_id -> projection
 * @param clusterMap - Map of cluster_id -> cluster
 * @returns Tweet with cluster data (or null if not in a cluster)
 */
export function enrichTweetWithCluster(
  tweet: TwitterTweetWithProfile,
  projectionMap: Map<string, TwitterTweetProjection>,
  clusterMap: Map<number, TwitterOpinionCluster>
): TwitterTweetWithCluster {
  // Look up projection for this tweet
  const projection = projectionMap.get(tweet.id);
  
  // If no projection or no cluster assignment, return tweet without cluster
  if (!projection || projection.cluster_id === null || projection.cluster_id === -1) {
    return {
      ...tweet,
      cluster: null,
      cluster_confidence: null
    };
  }
  
  // Look up cluster data
  const cluster = clusterMap.get(projection.cluster_id);
  
  // If cluster not found (shouldn't happen), return tweet without cluster
  if (!cluster) {
    logger.warn('[Opinion Map] Cluster not found for tweet', {
      tweet_id: tweet.id,
      cluster_id: projection.cluster_id
    });
    
    return {
      ...tweet,
      cluster: null,
      cluster_confidence: null
    };
  }
  
  // Return enriched tweet
  return {
    ...tweet,
    cluster,
    cluster_confidence: projection.cluster_confidence
  };
}

/**
 * Enrich multiple tweets with cluster data
 * Efficient batch operation using maps for O(1) lookups
 * 
 * @param tweets - Tweets to enrich
 * @param projectionMap - Map of tweet_id -> projection
 * @param clusterMap - Map of cluster_id -> cluster
 * @returns Tweets enriched with cluster data
 */
export function enrichTweetsWithClusters(
  tweets: TwitterTweetWithProfile[],
  projectionMap: Map<string, TwitterTweetProjection>,
  clusterMap: Map<number, TwitterOpinionCluster>
): TwitterTweetWithCluster[] {
  return tweets.map(tweet => 
    enrichTweetWithCluster(tweet, projectionMap, clusterMap)
  );
}

/**
 * Filter tweets that belong to clusters (exclude outliers)
 * 
 * @param tweets - Enriched tweets
 * @returns Only tweets with cluster assignments
 */
export function filterTweetsWithClusters(
  tweets: TwitterTweetWithCluster[]
): TwitterTweetWithCluster[] {
  return tweets.filter(tweet => tweet.cluster !== null);
}

/**
 * Group tweets by cluster
 * 
 * @param tweets - Enriched tweets
 * @returns Map of cluster_id -> tweets
 */
export function groupTweetsByCluster(
  tweets: TwitterTweetWithCluster[]
): Map<number, TwitterTweetWithCluster[]> {
  const groups = new Map<number, TwitterTweetWithCluster[]>();
  
  for (const tweet of tweets) {
    if (tweet.cluster === null) continue;
    
    const clusterId = tweet.cluster.cluster_id;
    const existing = groups.get(clusterId) || [];
    groups.set(clusterId, [...existing, tweet]);
  }
  
  return groups;
}

/**
 * Get cluster statistics for a set of tweets
 * 
 * @param tweets - Enriched tweets
 * @returns Statistics about cluster coverage
 */
export function getClusterStatistics(
  tweets: TwitterTweetWithCluster[]
): {
  total: number;
  clustered: number;
  outliers: number;
  coverage: number;
  uniqueClusters: number;
} {
  const total = tweets.length;
  const clustered = tweets.filter(t => t.cluster !== null).length;
  const outliers = total - clustered;
  const coverage = total > 0 ? (clustered / total) * 100 : 0;
  
  const clusterIds = new Set(
    tweets
      .filter(t => t.cluster !== null)
      .map(t => t.cluster!.cluster_id)
  );
  
  return {
    total,
    clustered,
    outliers,
    coverage: Math.round(coverage * 10) / 10,
    uniqueClusters: clusterIds.size
  };
}

