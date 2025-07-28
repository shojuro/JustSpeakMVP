import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { validateAudioFile, sanitizeFileName } from '@/lib/fileValidation'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('Speech-to-text error: OPENAI_API_KEY not configured')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Validate the audio file
    const validation = await validateAudioFile(audioFile)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid audio file' },
        { status: 400 }
      )
    }

    console.log('Speech-to-text: Processing audio file', {
      name: sanitizeFileName(audioFile.name),
      size: audioFile.size,
      type: audioFile.type
    })

    // Convert File to Buffer
    const buffer = Buffer.from(await audioFile.arrayBuffer())
    
    // Create a File object for OpenAI with the correct extension
    // Whisper API accepts: mp3, mp4, mpeg, mpga, m4a, wav, webm
    const sanitizedName = sanitizeFileName(audioFile.name)
    const file = new File([buffer], sanitizedName, { type: audioFile.type || 'audio/webm' })

    // Use OpenAI Whisper API for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'json',
      temperature: 0, // More deterministic results
    })

    console.log('Speech-to-text: Transcription successful', {
      text: transcription.text
    })

    return NextResponse.json({ text: transcription.text })

  } catch (error: any) {
    console.error('Speech-to-text error:', error)
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code
    })
    
    // Provide more specific error messages
    if (error.status === 401) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key' },
        { status: 500 }
      )
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { error: 'Could not connect to OpenAI API' },
        { status: 500 }
      )
    }
    
    // Fallback response if transcription fails
    return NextResponse.json(
      { error: 'Failed to transcribe audio: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}