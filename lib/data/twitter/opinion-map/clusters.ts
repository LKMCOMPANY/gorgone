/**
 * Opinion cluster CRUD operations
 * Manages cluster metadata and statistics
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import type { TwitterOpinionCluster } from '@/types'

/**
 * Save opinion clusters to database
 * 
 * @param clusters - Array of clusters to save
 * @returns Success status
 */
export async function saveClusters(
  clusters: Omit<TwitterOpinionCluster, 'id' | 'created_at' | 'updated_at'>[]
): Promise<boolean> {
  const supabase = createAdminClient()

  logger.info('[Opinion Map] Saving clusters', {
    count: clusters.length
  })

  const { error } = await supabase
    .from('twitter_opinion_clusters')
    .insert(clusters)

  if (error) {
    logger.error('[Opinion Map] Failed to save clusters', { error })
    return false
  }

  logger.info('[Opinion Map] Clusters saved successfully')
  return true
}

/**
 * Get clusters for a session
 * 
 * @param zoneId - Zone ID
 * @param sessionId - Session ID
 * @returns Array of clusters sorted by size
 */
export async function getClusters(
  zoneId: string,
  sessionId: string
): Promise<TwitterOpinionCluster[]> {
  const supabase = createAdminClient()

    const { data, error } = await supabase
    .from('twitter_opinion_clusters')
    .select('*')
    .eq('zone_id', zoneId)
    .eq('session_id', sessionId)
    .order('tweet_count', { ascending: false })

  if (error) {
    logger.error('[Opinion Map] Failed to get clusters', { error })
    return []
  }

  return (data as TwitterOpinionCluster[]) || []
}

/**
 * Get a specific cluster by ID
 * 
 * @param sessionId - Session ID
 * @param clusterId - Cluster ID
 * @returns Cluster or null
 */
export async function getClusterById(
  sessionId: string,
  clusterId: number
): Promise<TwitterOpinionCluster | null> {
  const supabase = createAdminClient()

    const { data, error } = await supabase
    .from('twitter_opinion_clusters')
    .select('*')
    .eq('session_id', sessionId)
    .eq('cluster_id', clusterId)
    .maybeSingle()

    if (error) {
    logger.error('[Opinion Map] Failed to get cluster', { error })
    return null
  }

  return data as TwitterOpinionCluster | null
}
