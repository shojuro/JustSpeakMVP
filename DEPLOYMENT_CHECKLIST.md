# Deployment Checklist - Debug Implementation

## Pre-Deployment Steps

### 1. Code Changes Summary
- ✅ Enhanced analyze-errors API with comprehensive logging
- ✅ Created debug-progress endpoint
- ✅ Created debug-corrections endpoint  
- ✅ Created system-health endpoint
- ✅ Added debug mode to dashboard (?debug=true)
- ✅ Added request tracking to ChatInterface

### 2. Files to Commit
- `src/app/api/analyze-errors/route.ts` - Enhanced logging
- `src/app/api/debug-progress/route.ts` - New debug endpoint
- `src/app/api/debug-corrections/route.ts` - New debug endpoint
- `src/app/api/system-health/route.ts` - New health check endpoint
- `src/app/dashboard/page.tsx` - Added debug mode
- `src/components/chat/ChatInterface.tsx` - Added request tracking
- `DEBUG_IMPLEMENTATION_SUMMARY.md` - Documentation

## Deployment Steps

### 1. Commit Changes
```bash
git add -A
git commit -m "feat: add comprehensive debugging tools for dashboard issues

- Enhanced analyze-errors API with request tracking and detailed logging
- Added debug endpoints for user_progress and corrections verification
- Added system-health endpoint to check configuration
- Added debug mode to dashboard (?debug=true)
- Added request tracking to ChatInterface

This will help identify why dashboard shows 0:00 and corrections aren't saved"
```

### 2. Push to GitHub
```bash
git push origin main
```

### 3. Vercel Deployment
- Vercel will automatically deploy from the main branch
- Monitor deployment at: https://vercel.com/dashboard

## Post-Deployment Verification

### 1. Check System Health (FIRST PRIORITY)
```
https://your-app.vercel.app/api/system-health
```

Expected findings:
- Check if `projectMatch: false` (indicates service key mismatch)
- Check if all tables exist
- Check OpenAI connectivity
- Review recommendations section

### 2. Test Debug Endpoints
```
# Replace USER_ID with actual user ID from Supabase Auth
https://your-app.vercel.app/api/debug-progress?userId=USER_ID
https://your-app.vercel.app/api/debug-corrections?userId=USER_ID
```

### 3. Test Dashboard Debug Mode
```
https://your-app.vercel.app/dashboard?debug=true
```

Look for:
- Debug panel at bottom
- Any errors in red
- Comparison between regular and service clients

### 4. Test Chat with Debugging
1. Go to chat interface
2. Open browser console (F12)
3. Say something with grammar errors like "I go to store yesterday"
4. Look for console logs:
   - `[ChatInterface][req_xxx]` entries
   - `[analyze-errors][req_xxx]` entries
   - Any error details

### 5. Check Vercel Function Logs
- Go to Vercel dashboard
- Navigate to Functions tab
- Check logs for analyze-errors function
- Look for detailed logging output

## Expected Issues & Solutions

### Issue 1: Service Role Key Mismatch
**Symptom**: system-health shows `projectMatch: false`
**Solution**: 
1. Go to Supabase dashboard for project "vokeaqpxhrroaisyaizz"
2. Settings → API → Service Role Key
3. Copy the service role key
4. Update in Vercel: Settings → Environment Variables → SUPABASE_SERVICE_ROLE_KEY

### Issue 2: Missing Tables
**Symptom**: system-health shows tables don't exist
**Solution**: Run migrations 002 and 003 in Supabase SQL editor

### Issue 3: OpenAI API Errors
**Symptom**: analyze-errors fails at OpenAI step
**Solution**: Verify OpenAI API key in Vercel environment variables

## Success Criteria
- [ ] system-health shows "healthy" or identifies specific issues
- [ ] debug-progress shows user data (with service client)
- [ ] debug-corrections shows corrections data
- [ ] Dashboard shows speaking time after conversation
- [ ] Corrections appear in feedback page

## Rollback Plan
If issues occur:
1. Revert to previous commit: `git revert HEAD`
2. Push to trigger new deployment: `git push origin main`
3. Debug locally with enhanced logging