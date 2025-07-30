# URGENT: Fix Production Issues

## Critical Issues Found

1. **analyze-errors API returning 500 errors** - No corrections are being saved
2. **Timezone mismatch** - Sessions showing wrong times (7:57 PM showing as 2:27 PM)
3. **Speaking time not tracking** - Dashboard shows 0:00 despite conversations

## Root Cause

The `analyze-errors` API is failing because the environment variables are not properly set in Vercel.

## Immediate Actions Required

### 1. Add Missing Environment Variables to Vercel

Go to your Vercel project settings and add these environment variables:

```bash
OPENAI_API_KEY=[Copy from your local .env file]
SUPABASE_SERVICE_ROLE_KEY=[Copy from your local .env file]
```

**IMPORTANT**: These are already in your `.env` file but NOT in Vercel! Copy the exact values from your `.env` file.

### 2. Verify Environment Variables

After adding, visit this URL to verify they're set:

```
https://just-speak-mvp-7uhu-r5277v4ay-shojuros-projects.vercel.app/api/debug-env-status
```

Add header: `x-debug-key: debug-2025`

### 3. What We Fixed

1. **Added environment check logging** to analyze-errors API
2. **Fixed timezone handling** - Now using UTC dates consistently
3. **Added debug endpoint** to check environment variables
4. **Improved error handling** in analyze-errors

### 4. Testing After Fix

Once environment variables are added:

1. **Test analyze-errors**: Have a conversation and check if corrections are saved
2. **Check dashboard**: Verify speaking time updates
3. **Verify timezone**: Check if times display correctly

### 5. Additional Debug URLs

- Check system health: `/api/system-health`
- Debug progress: `/api/debug-progress?userId=YOUR_USER_ID`
- Debug corrections: `/api/debug-corrections?userId=YOUR_USER_ID`
- Dashboard debug mode: `/dashboard?debug=true`

## Timeline Fix Explanation

The timezone issue occurs because:

- Client shows local time (Bangkok - UTC+7)
- Server was using inconsistent date handling
- Now fixed to use UTC dates consistently

## Next Steps After Environment Variables

The app should work correctly once the environment variables are added. The parallelization we implemented earlier will also help with latency.
