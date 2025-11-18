/**
 * Get latest opinion map session for a zone
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { canAccessZone } from '@/lib/auth/permissions'
import { logger } from '@/lib/logger'
import {
  getLatestSession,
  getEnrichedProjections,
  getClusters
} from '@/lib/data/twitter/opinion-map'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const zoneId = searchParams.get('zone_id')

    if (!zoneId) {
      return NextResponse.json(
        { error: 'Missing zone_id parameter' },
        { status: 400 }
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
    const hasAccess = await canAccessZone(user, zoneId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get latest session
    const session = await getLatestSession(zoneId)

    if (!session) {
      return NextResponse.json({
        success: true,
        session: null,
        projections: null,
        clusters: null
      })
    }

    // If completed, include results
    let projections = null
    let clusters = null

    if (session.status === 'completed') {
      [projections, clusters] = await Promise.all([
        getEnrichedProjections(session.zone_id, session.session_id),
        getClusters(session.zone_id, session.session_id)
      ])
    }

    return NextResponse.json({
      success: true,
      session,
      projections,
      clusters
    })

  } catch (error) {
    logger.error('[Opinion Map] Latest session fetch failed', { error })

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

