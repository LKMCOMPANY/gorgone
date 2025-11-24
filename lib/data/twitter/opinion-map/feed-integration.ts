/**
 * Opinion Map Feed Integration
 * Helper functions to integrate cluster data into Twitter feeds
 * 
 * Usage Example:
 * 
 * ```tsx
 * // In a server component or API route
 * const tweets = await getTweets(zoneId);
 * const enrichedTweets = await enrichFeedWithClusters(zoneId, tweets);
 * 
 * // In the component
 * {enrichedTweets.map(tweet => (
 *   <TwitterFeedCard
 *     key={tweet.id}
 *     tweet={tweet}
 *     zoneId={zoneId}
 *     cluster={tweet.cluster}
 *     clusterConfidence={tweet.cluster_confidence}
 *   />
 * ))}
 * ```
 */

import type { 
  TwitterTweetWithProfile,
  TwitterTweetWithCluster,
  TwitterOpinionSession 
} from '@/types';
import { logger } from '@/lib/logger';
import { getLatestSession } from './sessions';
import { getClusters } from './clusters';
import { getProjections } from './projections';
import { 
  buildClusterMap, 
  buildProjectionMap, 
  enrichTweetsWithClusters 
} from './enrichment';

/**
 * Enriches a feed of tweets with opinion cluster data
 * Uses the latest completed session for the zone
 * 
 * Performance: O(n) where n = number of tweets
 * - Single session lookup
 * - Single clusters fetch
 * - Single projections fetch
 * - Fast Map-based enrichment
 * 
 * @param zoneId - Zone ID
 * @param tweets - Tweets to enrich
 * @returns Tweets enriched with cluster data
 */
export async function enrichFeedWithClusters(
  zoneId: string,
  tweets: TwitterTweetWithProfile[]
): Promise<TwitterTweetWithCluster[]> {
  try {
    // 1. Get latest completed session
    const session = await getLatestSession(zoneId);
    
    if (!session || session.status !== 'completed') {
      logger.debug('[Opinion Map] No completed session found, skipping cluster enrichment', {
        zone_id: zoneId,
        session_status: session?.status
      });
      
      // Return tweets without cluster data
      return tweets.map(tweet => ({
        ...tweet,
        cluster: null,
        cluster_confidence: null
      }));
    }
    
    // 2. Fetch clusters and projections for this session
    const [clusters, projections] = await Promise.all([
      getClusters(zoneId, session.session_id),
      getProjections(zoneId, session.session_id)
    ]);
    
    if (clusters.length === 0 || projections.length === 0) {
      logger.debug('[Opinion Map] No clusters or projections found', {
        zone_id: zoneId,
        session_id: session.session_id,
        clusters: clusters.length,
        projections: projections.length
      });
      
      return tweets.map(tweet => ({
        ...tweet,
        cluster: null,
        cluster_confidence: null
      }));
    }
    
    // 3. Build fast lookup maps
    const clusterMap = buildClusterMap(clusters);
    const projectionMap = buildProjectionMap(projections);
    
    logger.debug('[Opinion Map] Enriching feed with cluster data', {
      zone_id: zoneId,
      session_id: session.session_id,
      tweets: tweets.length,
      clusters: clusters.length,
      projections: projections.length
    });
    
    // 4. Enrich tweets
    const enrichedTweets = enrichTweetsWithClusters(tweets, projectionMap, clusterMap);
    
    // Log statistics
    const clusteredCount = enrichedTweets.filter(t => t.cluster !== null).length;
    logger.debug('[Opinion Map] Feed enrichment complete', {
      total: enrichedTweets.length,
      clustered: clusteredCount,
      coverage: `${Math.round((clusteredCount / enrichedTweets.length) * 100)}%`
    });
    
    return enrichedTweets;
    
  } catch (error) {
    logger.error('[Opinion Map] Failed to enrich feed with clusters', {
      error: error instanceof Error ? error.message : String(error),
      zone_id: zoneId
    });
    
    // On error, return tweets without cluster data (graceful degradation)
    return tweets.map(tweet => ({
      ...tweet,
      cluster: null,
      cluster_confidence: null
    }));
  }
}

/**
 * Checks if a zone has completed opinion map sessions
 * Useful for conditionally showing cluster-related UI
 * 
 * @param zoneId - Zone ID
 * @returns True if zone has completed sessions
 */
export async function hasCompletedOpinionMap(zoneId: string): Promise<boolean> {
  try {
    const session = await getLatestSession(zoneId);
    return session !== null && session.status === 'completed';
  } catch (error) {
    logger.error('[Opinion Map] Failed to check for completed sessions', { 
      error,
      zone_id: zoneId 
    });
    return false;
  }
}

/**
 * Gets the latest completed session for a zone
 * Returns null if no completed session exists
 * 
 * @param zoneId - Zone ID
 * @returns Latest completed session or null
 */
export async function getActiveOpinionMapSession(
  zoneId: string
): Promise<TwitterOpinionSession | null> {
  try {
    const session = await getLatestSession(zoneId);
    
    if (!session || session.status !== 'completed') {
      return null;
    }
    
    return session;
  } catch (error) {
    logger.error('[Opinion Map] Failed to get active session', { 
      error,
      zone_id: zoneId 
    });
    return null;
  }
}

/**
 * Gets cluster statistics for a zone
 * Useful for displaying summary information
 * 
 * @param zoneId - Zone ID
 * @returns Cluster statistics or null
 */
export async function getOpinionMapStats(zoneId: string): Promise<{
  totalClusters: number;
  totalTweets: number;
  sessionCreatedAt: string;
  sessionId: string;
} | null> {
  try {
    const session = await getActiveOpinionMapSession(zoneId);
    
    if (!session) {
      return null;
    }
    
    const clusters = await getClusters(zoneId, session.session_id);
    const totalTweets = clusters.reduce((sum, c) => sum + c.tweet_count, 0);
    
    return {
      totalClusters: clusters.length,
      totalTweets,
      sessionCreatedAt: session.created_at,
      sessionId: session.session_id
    };
  } catch (error) {
    logger.error('[Opinion Map] Failed to get stats', { 
      error,
      zone_id: zoneId 
    });
    return null;
  }
}

