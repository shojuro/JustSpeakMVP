/**
 * Security configuration and utilities
 */

export const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self';
    connect-src 'self' https://*.supabase.co https://api.openai.com wss://*.supabase.co;
    media-src 'self';
    frame-src 'none';
  `
    .replace(/\s+/g, ' ')
    .trim(),
}

// Rate limiting configuration
export const rateLimits = {
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
  },
  speech: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per minute
  },
}
