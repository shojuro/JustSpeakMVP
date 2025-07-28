import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  max: number
  identifier?: (req: NextRequest) => string
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting (MVP version)
// TODO: Replace with Redis for production
const store = new Map<string, RateLimitEntry>()

// Cleanup expired entries on each request (serverless compatible)
function cleanupExpiredEntries() {
  const now = Date.now()
  store.forEach((entry, key) => {
    if (entry.resetTime <= now) {
      store.delete(key)
    }
  })
}

export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, max, identifier } = config

  return async function rateLimit(request: NextRequest): Promise<{
    success: boolean
    limit: number
    remaining: number
    reset: number
  }> {
    // Cleanup expired entries
    cleanupExpiredEntries()

    // Get identifier (IP by default)
    const id = identifier
      ? identifier(request)
      : request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'anonymous'

    const now = Date.now()
    const resetTime = now + windowMs

    // Get or create entry
    let entry = store.get(id)

    if (!entry || entry.resetTime <= now) {
      // Create new entry
      entry = { count: 1, resetTime }
      store.set(id, entry)
    } else {
      // Increment existing entry
      entry.count++
    }

    const remaining = Math.max(0, max - entry.count)
    const success = entry.count <= max

    return {
      success,
      limit: max,
      remaining,
      reset: entry.resetTime,
    }
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  // General API rate limit
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  }),

  // Strict rate limit for auth endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
  }),

  // Rate limit for speech endpoints
  speech: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10,
  }),

  // Rate limit for anonymous users (stricter)
  anonymous: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,
  }),
}
