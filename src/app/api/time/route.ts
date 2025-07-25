import { NextResponse } from 'next/server'

export async function GET() {
  const serverTime = Date.now()
  
  return NextResponse.json(
    { 
      serverTime,
      serverTimeISO: new Date(serverTime).toISOString(),
      timezone: process.env.TZ || 'UTC'
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  )
}