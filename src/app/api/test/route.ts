import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Test endpoint is working',
    env: {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
    }
  })
}

export async function POST() {
  return NextResponse.json({
    status: 'ok',
    method: 'POST',
    message: 'POST endpoint is working'
  })
}