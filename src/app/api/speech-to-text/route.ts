import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await audioFile.arrayBuffer())
    
    // Create a File object for OpenAI
    const file = new File([buffer], 'audio.webm', { type: 'audio/webm' })

    // Use OpenAI Whisper API for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
      // Remove prompt to avoid any potential interference
    })

    return NextResponse.json({ text: transcription.text })

  } catch (error) {
    console.error('Speech-to-text error:', error)
    
    // Fallback response if transcription fails
    return NextResponse.json(
      { text: '', error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}