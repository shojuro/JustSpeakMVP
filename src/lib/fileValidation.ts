/**
 * File validation utilities for secure file uploads
 */

interface ValidationResult {
  valid: boolean
  error?: string
}

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed MIME types for audio files
const ALLOWED_MIME_TYPES = [
  'audio/webm',
  'audio/wav',
  'audio/wave',
  'audio/mp3',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
]

// Magic numbers for common audio formats
const MAGIC_NUMBERS: Record<string, number[]> = {
  // WebM
  webm: [0x1a, 0x45, 0xdf, 0xa3],
  // WAV
  wav: [0x52, 0x49, 0x46, 0x46], // RIFF
  // MP3
  mp3_1: [0xff, 0xfb],
  mp3_2: [0xff, 0xfa],
  mp3_3: [0xff, 0xf3],
  mp3_4: [0xff, 0xf2],
  // MP4/M4A
  mp4: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // ftyp
  // OGG
  ogg: [0x4f, 0x67, 0x67, 0x53], // OggS
}

export async function validateAudioFile(file: File | Blob): Promise<ValidationResult> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    }
  }

  // Check if file has content
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    }
  }

  // Check MIME type (extract base type without parameters)
  const baseType = file.type.split(';')[0].trim()
  if (!ALLOWED_MIME_TYPES.includes(baseType)) {
    return {
      valid: false,
      error: `File type "${baseType}" is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }
  }

  // Check magic numbers (file signature)
  try {
    const buffer = await file.slice(0, 8).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    let isValidMagicNumber = false

    for (const [, magicBytes] of Object.entries(MAGIC_NUMBERS)) {
      if (magicBytes.every((byte, index) => bytes[index] === byte)) {
        isValidMagicNumber = true
        break
      }
    }

    if (!isValidMagicNumber) {
      return {
        valid: false,
        error: 'File content does not match expected audio format',
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to validate file content',
    }
  }

  return { valid: true }
}

export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  const baseName = fileName.split(/[/\\]/).pop() || 'file'

  // Remove special characters, keep only alphanumeric, dots, hyphens, and underscores
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Ensure it has a proper extension
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(sanitized)
  if (!hasExtension) {
    return `${sanitized}.webm`
  }

  return sanitized
}
