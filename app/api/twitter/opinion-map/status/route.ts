/**
 * Opinion Map Status API
 * Get session status and results
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { canAccessZone } from '@/lib/auth/permissions'
import { logger } from '@/lib/logger'
import {
  getSessionById,
  getEnrichedProjections,
  getClusters
} from '@/lib/data/twitter/opinion-map'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id parameter' },
        { status: 400 }
      )
    }

    // Get session
    const session = await getSessionById(sessionId)
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

    // If completed, include results
    let projections
    let clusters

    if (session.status === 'completed') {
      [projections, clusters] = await Promise.all([
        getEnrichedProjections(session.zone_id, session.session_id),
        getClusters(session.zone_id, session.session_id)
      ])
    }

    return NextResponse.json({
      success: true,
      session,
      projections: projections || null,
      clusters: clusters || null
    })

  } catch (error) {
    logger.error('[Opinion Map] Status check failed', { error })

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
