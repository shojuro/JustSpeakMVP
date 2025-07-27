import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

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

    console.log('Speech-to-text: Processing audio file', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    })

    // Convert File to Buffer
    const buffer = Buffer.from(await audioFile.arrayBuffer())
    
    // Create a File object for OpenAI with the correct extension
    // Whisper API accepts: mp3, mp4, mpeg, mpga, m4a, wav, webm
    const fileName = audioFile.type.includes('webm') ? 'audio.webm' : 'audio.wav'
    const file = new File([buffer], fileName, { type: audioFile.type || 'audio/webm' })

    // Use OpenAI Whisper API for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
      // Remove prompt to avoid any potential interference
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