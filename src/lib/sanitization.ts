/**
 * Input sanitization utilities for preventing XSS attacks
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows basic formatting tags but removes scripts and dangerous attributes
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty) return ''
  
  // Configure DOMPurify to allow only safe tags
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input'],
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload'],
  }
  
  return DOMPurify.sanitize(dirty, config)
}

/**
 * Sanitize plain text input (removes all HTML)
 */
export function sanitizeText(dirty: string): string {
  if (!dirty) return ''
  
  // Remove all HTML tags and decode entities
  const cleaned = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] })
  
  // Additional cleanup for common injection patterns
  return cleaned
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .trim()
}

/**
 * Sanitize URL to prevent javascript: and data: URLs
 */
export function sanitizeURL(dirty: string): string {
  if (!dirty) return ''
  
  // Trim and lowercase for comparison
  const trimmed = dirty.trim()
  const lower = trimmed.toLowerCase()
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
  for (const protocol of dangerousProtocols) {
    if (lower.startsWith(protocol)) {
      return ''
    }
  }
  
  // Ensure URL is properly encoded
  try {
    const url = new URL(trimmed)
    // Only allow http(s) and mailto
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
      return ''
    }
    return url.toString()
  } catch {
    // If not a valid URL, treat as relative path
    // Remove any potential path traversal
    return trimmed.replace(/\.\./g, '').replace(/\/\//g, '/')
  }
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(dirty: string): string {
  if (!dirty) return ''
  
  // Basic email validation and sanitization
  const cleaned = sanitizeText(dirty).toLowerCase()
  
  // Simple email regex for basic validation
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/
  
  return emailRegex.test(cleaned) ? cleaned : ''
}

/**
 * Sanitize username/display name
 * Allows alphanumeric, spaces, hyphens, underscores
 */
export function sanitizeUsername(dirty: string): string {
  if (!dirty) return ''
  
  // Remove any HTML first
  const cleaned = sanitizeText(dirty)
  
  // Allow only safe characters for usernames
  return cleaned
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .trim()
    .slice(0, 50) // Limit length
}

/**
 * Sanitize search query input
 * Prevents SQL injection and XSS in search
 */
export function sanitizeSearchQuery(dirty: string): string {
  if (!dirty) return ''
  
  // Remove any HTML
  const cleaned = sanitizeText(dirty)
  
  // Remove SQL-like patterns and special characters
  return cleaned
    .replace(/['";\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comments
    .replace(/\*\//g, '')
    .trim()
    .slice(0, 200) // Limit length
}

/**
 * Sanitize JSON string input
 * Ensures the string is valid JSON and removes any executable content
 */
export function sanitizeJSON(dirty: string): string {
  if (!dirty) return '{}'
  
  try {
    // Parse and re-stringify to ensure valid JSON
    const parsed = JSON.parse(dirty)
    
    // Recursively sanitize string values in the JSON
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeText(obj)
      } else if (Array.isArray(obj)) {
        return obj.map(sanitizeObject)
      } else if (obj !== null && typeof obj === 'object') {
        const sanitized: any = {}
        for (const [key, value] of Object.entries(obj)) {
          // Sanitize the key as well
          const cleanKey = sanitizeText(key).replace(/[^a-zA-Z0-9_]/g, '_')
          sanitized[cleanKey] = sanitizeObject(value)
        }
        return sanitized
      }
      return obj
    }
    
    return JSON.stringify(sanitizeObject(parsed))
  } catch {
    // If not valid JSON, return empty object
    return '{}'
  }
}

/**
 * Escape HTML entities for safe display
 * Use this when you need to display user input as-is but safely
 */
export function escapeHTML(str: string): string {
  if (!str) return ''
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  
  return str.replace(/[&<>"'/]/g, (char) => map[char] || char)
}

/**
 * Validate and sanitize file paths to prevent directory traversal
 */
export function sanitizeFilePath(dirty: string): string {
  if (!dirty) return ''
  
  // Remove any HTML first
  const cleaned = sanitizeText(dirty)
  
  // Remove directory traversal attempts
  return cleaned
    .replace(/\.\./g, '') // Remove ..
    .replace(/[<>"|*?:\\]/g, '') // Remove invalid filename characters
    .replace(/\/+/g, '/') // Normalize multiple slashes
    .trim()
}