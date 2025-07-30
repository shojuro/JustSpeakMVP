import { NextResponse } from 'next/server'

export async function GET() {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY
  const keyLength = process.env.OPENAI_API_KEY?.length || 0

  return NextResponse.json({
    configured: hasOpenAIKey,
    keyLength,
    startsWithSk: process.env.OPENAI_API_KEY?.startsWith('sk-') || false,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
}
