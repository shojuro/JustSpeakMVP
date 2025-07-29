# Supabase Cookie Authentication Fix

## Problem

Supabase auth cookies were not being sent to API routes, causing authentication failures despite users being logged in.

## Root Cause

The Supabase client configuration was using localStorage for auth tokens instead of cookies, which prevented the tokens from being sent with API requests.

## Solution Implemented

### 1. Client-Side Configuration (`src/lib/supabase/client.ts`)

- Added custom `storage` implementation that uses browser cookies instead of localStorage
- Configured cookies with proper security settings (Secure, SameSite, path)
- Ensures auth tokens are stored as cookies that get sent with all requests

### 2. Server-Side Configuration (`src/lib/supabase/server.ts`)

- Enhanced cookie handling with proper options (httpOnly, secure, sameSite)
- Added logging for debugging cookie operations
- Ensured cookies persist with appropriate maxAge

### 3. Middleware Updates (`src/middleware.ts`)

- Added cookie logging for debugging
- Ensured auth cookies are preserved during request/response cycle
- Set proper cookie attributes including maxAge for persistence

### 4. Auth Provider Enhancement (`src/components/providers/AuthProvider.tsx`)

- Added session refresh on mount to ensure cookies are properly set
- Added session refresh after sign-in to guarantee cookie persistence
- Helps recover from any cookie setting failures

### 5. API Route Cleanup (`src/app/api/chat/route.ts`)

- Removed unnecessary auth header checks
- Relies solely on cookie-based authentication
- Simplified error handling

## Testing

### Test Endpoint Created

- `/api/test-cookies` - Use this to verify cookie configuration
- Shows all cookies, auth status, and tests cookie setting

### Debug Endpoints (Existing)

- `/api/debug-auth` - Shows cookie and auth status
- `/api/debug-sessions` - Queries sessions using service role key

## Security Considerations

1. **Cookies use proper security flags**:
   - `httpOnly: true` for auth tokens (prevents XSS)
   - `secure: true` in production (HTTPS only)
   - `sameSite: 'lax'` for CSRF protection

2. **No sensitive data in client-accessible cookies**:
   - Auth tokens are httpOnly
   - CSRF tokens are separate and client-accessible

3. **Proper domain/path restrictions**:
   - Cookies set with `path: '/'` for site-wide access
   - Domain automatically matches the site domain

## Deployment Steps

1. Deploy these changes to Vercel
2. Test authentication flow:
   - Log in and check `/api/test-cookies`
   - Verify auth cookies are present
   - Test chat functionality
3. Monitor logs for cookie operations

## Expected Behavior After Fix

1. On login, Supabase auth cookies will be set in the browser
2. These cookies will be automatically sent with all API requests
3. Server-side Supabase client will read these cookies and authenticate the user
4. Chat API will work for authenticated users

## Rollback Plan

If issues persist:

1. Check browser developer tools for cookie presence
2. Review Vercel logs for cookie operations
3. Use debug endpoints to diagnose specific issues
4. Consider adding more detailed logging if needed
