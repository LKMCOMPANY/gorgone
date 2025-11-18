/**
 * Opinion Map Cancellation API
 * Cancel a running clustering job
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { canAccessZone } from '@/lib/auth/permissions'
import { logger } from '@/lib/logger'
import { getSessionById, cancelSession } from '@/lib/data/twitter/opinion-map'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id } = body

    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      )
    }

    // Get session
    const session = await getSessionById(session_id)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Authenticate
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Authorize
    const hasAccess = await canAccessZone(user, session.zone_id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Cancel session
    const success = await cancelSession(session_id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to cancel session' },
        { status: 500 }
      )
    }

    logger.info('[Opinion Map] Session cancelled', {
      session_id,
      user_id: user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Session cancelled successfully'
    })

  } catch (error) {
    logger.error('[Opinion Map] Cancellation failed', { error })

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

