/**
 * Environment utilities for security checks
 */

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function isDebugEnabled(): boolean {
  // Only allow debug in development or if explicitly enabled
  return isDevelopment() || process.env.ENABLE_DEBUG === 'true'
}