import { NextRequest, NextResponse } from 'next/server'
import { securityLogger, SecurityEventType } from '@/lib/securityLogger'

export async function GET(request: NextRequest) {
  // Only allow in development or with special header
  if (
    process.env.NODE_ENV !== 'development' &&
    request.headers.get('x-security-key') !== process.env.SECURITY_MONITORING_KEY
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') as SecurityEventType | null
  const userId = searchParams.get('userId')
  const limit = parseInt(searchParams.get('limit') || '100', 10)

  let events
  if (type) {
    events = securityLogger.getEventsByType(type, limit)
  } else if (userId) {
    events = securityLogger.getEventsByUser(userId, limit)
  } else {
    events = securityLogger.getRecentEvents(limit)
  }

  return NextResponse.json({ events, count: events.length })
}