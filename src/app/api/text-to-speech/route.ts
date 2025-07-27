import { NextRequest, NextResponse } from 'next/server'

const VOICE_ID = 'pwMBn0SsmN1220Aorv15' // Matt voice

export async function POST(request: NextRequest) {
  try {
    // Get API key at runtime
    const ELEVEN_LABS_API_KEY = process.env.ELEVENLABS_API_KEY
    
    // Check if API key is configured
    if (!ELEVEN_LABS_API_KEY) {
      console.error('Text-to-speech error: ELEVENLABS_API_KEY not configured')
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('ELEVEN')))
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      )
    }

    const { text } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      )
    }

    console.log('Text-to-speech: Processing text', {
      textLength: text.length,
      voiceId: VOICE_ID,
      hasApiKey: !!ELEVEN_LABS_API_KEY,
      apiKeyLength: ELEVEN_LABS_API_KEY?.length || 0,
      apiKeyPrefix: ELEVEN_LABS_API_KEY?.substring(0, 10) + '...'
    })

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVEN_LABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      // Parse error if it's JSON
      let errorMessage = `ElevenLabs API error: ${response.status}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.detail?.message || errorJson.detail || errorJson.message || errorMessage
      } catch (e) {
        // Not JSON, use text
        errorMessage = errorText || errorMessage
      }
      
      throw new Error(errorMessage)
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer()
    
    console.log('Text-to-speech: Audio generated successfully', {
      size: audioBuffer.byteLength
    })

    // Return the audio data
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })

  } catch (error: any) {
    console.error('Text-to-speech error:', error)
    
    return NextResponse.json(
      { error: 'Failed to generate speech: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}