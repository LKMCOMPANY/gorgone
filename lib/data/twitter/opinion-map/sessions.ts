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
 * - If there is already an active session for the zone, reuse it.
 * - Otherwise create a new one.
 *
 * This avoids 500s when the user double-clicks "generate" or the UI retries.
 */
export async function createOrReuseActiveSession(
  zoneId: string,
  config: TwitterOpinionSession['config'],
  userId: string
): Promise<{ session: TwitterOpinionSession; reused: boolean }> {
  // Fast path: existing active session
  const existing = await getRunningSessionForZone(zoneId)
  if (existing) {
    logger.info('[Opinion Map] Reusing existing active session', {
      zone_id: zoneId,
      session_id: existing.session_id,
      status: existing.status,
      progress: existing.progress,
    })
    return { session: existing, reused: true }
  }

  // Create new
  try {
    const created = await createSession(zoneId, config, userId)
    return { session: created, reused: false }
  } catch (e) {
    // Race condition: another request created a session after our check.
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('idx_one_active_session_per_zone') || message.includes('duplicate key')) {
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
