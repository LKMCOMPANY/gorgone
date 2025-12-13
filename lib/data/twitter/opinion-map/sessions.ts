/**
 * Opinion map session management
 * Handles clustering job lifecycle and progress tracking
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import type { TwitterOpinionSession } from '@/types'

const ACTIVE_SESSION_STATUSES = [
  'pending',
  'vectorizing',
  'reducing',
  'clustering',
  'labeling',
] as const

type ActiveSessionStatus = (typeof ACTIVE_SESSION_STATUSES)[number]

/**
 * Sessions not updated for more than this duration are considered "stuck".
 * They will be auto-failed to unblock new generation requests.
 */
const SESSION_STUCK_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Check if a session is stuck (no progress for too long).
 * 
 * Heuristic: if a session has been in an active status for longer than
 * SESSION_STUCK_THRESHOLD_MS since it started (or was created), consider it stuck.
 */
function isSessionStuck(session: TwitterOpinionSession): boolean {
  // If session hasn't started processing yet (pending), use created_at
  // Otherwise use started_at (when processing began)
  const referenceTime = session.started_at || session.created_at
  if (!referenceTime) return false

  const startTime = new Date(referenceTime).getTime()
  const now = Date.now()
  const elapsed = now - startTime

  // Only consider stuck if enough time has passed
  if (elapsed <= SESSION_STUCK_THRESHOLD_MS) {
    return false
  }

  // Additional check: if progress is 0 and we've been waiting, definitely stuck
  // Or if we've been in the same state for too long
  // For now, any active session older than threshold is considered stuck
  return true
}

/**
 * Get the currently running session for a zone.
 * Returns null if no active session exists.
 * 
 * Note: This does NOT auto-fail stuck sessions. Use `getRunningSessionOrFailStuck`
 * if you want that behavior.
 */
export async function getRunningSessionForZone(
  zoneId: string
): Promise<TwitterOpinionSession | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('twitter_opinion_sessions')
    .select('*')
    .eq('zone_id', zoneId)
    .in('status', [...ACTIVE_SESSION_STATUSES] as ActiveSessionStatus[])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error('[Opinion Map] Failed to get running session', { error, zone_id: zoneId })
    return null
  }

  return data as TwitterOpinionSession | null
}

/**
 * Get the currently running session for a zone, auto-failing stuck sessions.
 * 
 * If a session is found but has not been updated for > SESSION_STUCK_THRESHOLD_MS,
 * it is marked as 'failed' and null is returned (allowing a new session to be created).
 */
async function getRunningSessionOrFailStuck(
  zoneId: string
): Promise<TwitterOpinionSession | null> {
  const session = await getRunningSessionForZone(zoneId)
  
  if (!session) return null

  if (isSessionStuck(session)) {
    logger.warn('[Opinion Map] Detected stuck session, auto-failing', {
      zone_id: zoneId,
      session_id: session.session_id,
      status: session.status,
      progress: session.progress,
      started_at: session.started_at,
      created_at: session.created_at,
      stuck_threshold_min: SESSION_STUCK_THRESHOLD_MS / 60000,
    })

    await markSessionFailed(
      session.session_id,
      `Session stuck (no progress for ${Math.round(SESSION_STUCK_THRESHOLD_MS / 60000)} minutes). Auto-failed to allow retry.`
    )

    return null
  }

  return session
}

/**
 * Create a new opinion map session
 * 
 * @param zoneId - Zone ID
 * @param config - Session configuration
 * @param userId - User creating the session
 * @returns Created session
 */
export async function createSession(
  zoneId: string,
  config: TwitterOpinionSession['config'],
  userId: string
): Promise<TwitterOpinionSession> {
  const supabase = createAdminClient()

  const sessionId = `zone_${zoneId}_${new Date().toISOString()}`

  const { data, error } = await supabase
    .from('twitter_opinion_sessions')
    .insert({
      zone_id: zoneId,
      session_id: sessionId,
      status: 'pending',
      progress: 0,
      config,
      total_tweets: config.actual_sample_size,
      created_by: userId
    })
    .select()
    .single()

  if (error) {
    logger.error('[Opinion Map] Failed to create session', { 
      error, 
      zone_id: zoneId 
    })
    throw new Error(`Failed to create session: ${error.message}`)
  }

  logger.info('[Opinion Map] Session created', {
    session_id: sessionId,
    zone_id: zoneId,
    total_tweets: config.actual_sample_size
  })

  return data as TwitterOpinionSession
}

/**
 * Idempotent session creation:
 * - If there is already an active (and healthy) session for the zone, reuse it.
 * - If there is a stuck session (no update for > threshold), auto-fail it and create new.
 * - Otherwise create a new one.
 *
 * This avoids 500s when the user double-clicks "generate" or the UI retries,
 * while also preventing "zombie" sessions from blocking new generation forever.
 */
export async function createOrReuseActiveSession(
  zoneId: string,
  config: TwitterOpinionSession['config'],
  userId: string
): Promise<{ session: TwitterOpinionSession; reused: boolean }> {
  // Check for existing active session (auto-fails stuck sessions)
  const existing = await getRunningSessionOrFailStuck(zoneId)
  if (existing) {
    logger.info('[Opinion Map] Reusing existing active session', {
      zone_id: zoneId,
      session_id: existing.session_id,
      status: existing.status,
      progress: existing.progress,
    })
    return { session: existing, reused: true }
  }

  // Create new session
  try {
    const created = await createSession(zoneId, config, userId)
    return { session: created, reused: false }
  } catch (e) {
    // Race condition: another request created a session after our check.
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('idx_one_active_session_per_zone') || message.includes('duplicate key')) {
      // Don't auto-fail on race - just get whatever exists
      const raced = await getRunningSessionForZone(zoneId)
      if (raced) {
        logger.info('[Opinion Map] Reusing active session (race)', {
          zone_id: zoneId,
          session_id: raced.session_id,
          status: raced.status,
          progress: raced.progress,
        })
        return { session: raced, reused: true }
      }
    }
    throw e
  }
}

/**
 * Get the most recent session for a zone
 * 
 * @param zoneId - Zone ID
 * @returns Latest session or null
 */
export async function getLatestSession(
  zoneId: string
): Promise<TwitterOpinionSession | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('twitter_opinion_sessions')
    .select('*')
    .eq('zone_id', zoneId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error('[Opinion Map] Failed to get latest session', { error })
    return null
  }

  return data as TwitterOpinionSession | null
}

/**
 * Get the latest COMPLETED session for a zone (for reports)
 * Unlike getLatestSession, this ignores pending/failed sessions
 * 
 * @param zoneId - Zone ID
 * @returns Latest completed session or null
 */
export async function getLatestCompletedSession(
  zoneId: string
): Promise<TwitterOpinionSession | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('twitter_opinion_sessions')
    .select('*')
    .eq('zone_id', zoneId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error('[Opinion Map] Failed to get latest completed session', { error })
    return null
  }

  return data as TwitterOpinionSession | null
}

/**
 * Get session by session ID
 * Uses admin client to bypass RLS (for workers without user context)
 * 
 * @param sessionId - Session ID
 * @returns Session or null
 */
export async function getSessionById(
  sessionId: string
): Promise<TwitterOpinionSession | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('twitter_opinion_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (error) {
    logger.error('[Opinion Map] Failed to get session', { error, session_id: sessionId })
    return null
  }

  return data as TwitterOpinionSession | null
}

/**
 * Update session progress
 * Uses admin client to bypass RLS (for workers)
 * 
 * @param sessionId - Session ID
 * @param status - New status
 * @param progress - Progress percentage (0-100)
 * @param phaseMessage - User-friendly message
 */
export async function updateSessionProgress(
  sessionId: string,
  status: TwitterOpinionSession['status'],
  progress: number,
  phaseMessage?: string
): Promise<void> {
  const supabase = createAdminClient()

  const updates: Partial<TwitterOpinionSession> = {
    status,
    progress: Math.min(100, Math.max(0, progress)),
    phase_message: phaseMessage || null
  }

  // Add started_at on first update
  if (status !== 'pending') {
    const session = await getSessionById(sessionId)
    if (session && !session.started_at) {
      updates.started_at = new Date().toISOString()
    }
  }

  // Add completed_at on completion
  if (status === 'completed') {
    updates.completed_at = new Date().toISOString()
    
    // Calculate execution time
    const session = await getSessionById(sessionId)
    if (session?.started_at) {
      const executionTime = Date.now() - new Date(session.started_at).getTime()
      updates.execution_time_ms = executionTime
    }
  }

  await supabase
    .from('twitter_opinion_sessions')
    .update(updates)
    .eq('session_id', sessionId)

  logger.debug('[Opinion Map] Session progress updated', {
    session_id: sessionId,
    status,
    progress,
    message: phaseMessage
  })
}

/**
 * Mark session as failed
 * Uses admin client to bypass RLS
 * 
 * @param sessionId - Session ID
 * @param errorMessage - Error message
 * @param errorStack - Stack trace (optional)
 */
export async function markSessionFailed(
  sessionId: string,
  errorMessage: string,
  errorStack?: string
): Promise<void> {
  const supabase = createAdminClient()

  await supabase
    .from('twitter_opinion_sessions')
    .update({
      status: 'failed',
      error_message: errorMessage,
      error_stack: errorStack || null,
      completed_at: new Date().toISOString()
    })
    .eq('session_id', sessionId)

  logger.error('[Opinion Map] Session failed', {
    session_id: sessionId,
    error: errorMessage
  })
}

/**
 * Sentiment evolution data point
 */
export interface SentimentEvolutionPoint {
  session_id: string
  created_at: string
  total_tweets: number
  avg_sentiment: number
  positive_tweets: number
  neutral_tweets: number
  negative_tweets: number
}

/**
 * Get sentiment evolution over multiple sessions for a zone
 * Used for the opinion evolution chart in reports
 * 
 * @param zoneId - Zone ID
 * @param limit - Maximum number of sessions to retrieve (default 10)
 * @returns Array of sentiment evolution data points, ordered chronologically
 */
export async function getSentimentEvolution(
  zoneId: string,
  limit: number = 10
): Promise<SentimentEvolutionPoint[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .rpc('get_sentiment_evolution', {
      p_zone_id: zoneId,
      p_limit: limit
    })

  if (error) {
    // Fallback: direct query if RPC doesn't exist
    logger.warn('[Opinion Map] RPC get_sentiment_evolution not found, using fallback', { error })
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('twitter_opinion_sessions')
      .select('session_id, created_at, total_tweets')
      .eq('zone_id', zoneId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (sessionsError || !sessions) {
      logger.error('[Opinion Map] Failed to get sessions for evolution', { error: sessionsError })
      return []
    }

    // Get cluster data for each session
    const evolution: SentimentEvolutionPoint[] = []
    
    for (const session of sessions) {
      const { data: clusters } = await supabase
        .from('twitter_opinion_clusters')
        .select('avg_sentiment, tweet_count')
        .eq('session_id', session.session_id)

      if (clusters && clusters.length > 0) {
        let positive = 0, neutral = 0, negative = 0
        let totalSentiment = 0
        let sentimentCount = 0

        for (const c of clusters) {
          const sentiment = parseFloat(String(c.avg_sentiment || 0))
          const count = c.tweet_count || 0
          
          if (sentiment > 0.2) positive += count
          else if (sentiment < -0.2) negative += count
          else neutral += count

          if (c.avg_sentiment !== null) {
            totalSentiment += sentiment
            sentimentCount++
          }
        }

        evolution.push({
          session_id: session.session_id,
          created_at: session.created_at,
          total_tweets: session.total_tweets || 0,
          avg_sentiment: sentimentCount > 0 ? totalSentiment / sentimentCount : 0,
          positive_tweets: positive,
          neutral_tweets: neutral,
          negative_tweets: negative
        })
      }
    }

    // Return in chronological order
    return evolution.reverse()
  }

  return (data || []) as SentimentEvolutionPoint[]
}

/**
 * Cancel a running session
 * 
 * @param sessionId - Session ID
 * @returns Success status
 */
export async function cancelSession(sessionId: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('twitter_opinion_sessions')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString()
    })
    .eq('session_id', sessionId)
    .in('status', ['pending', 'vectorizing', 'reducing', 'clustering', 'labeling'])

  if (error) {
    logger.error('[Opinion Map] Failed to cancel session', { error, session_id: sessionId })
    return false
  }

  logger.info('[Opinion Map] Session cancelled', { session_id: sessionId })
  return true
}
