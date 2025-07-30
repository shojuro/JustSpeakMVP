# Post-Deployment Verification Instructions

## 🚀 Deployment Status

Your changes have been pushed to GitHub. Vercel will automatically deploy them.

**Monitor deployment at**: https://vercel.com/shojuros-projects/just-speak-mvp

## 📋 Verification Steps (In Order)

### Step 1: Verify Deployment Complete
1. Go to Vercel dashboard
2. Check that the deployment is successful
3. Note the deployment URL (usually https://justspeakmvp.vercel.app)

### Step 2: Check System Health (CRITICAL)
```
https://justspeakmvp.vercel.app/api/system-health
```

**What to look for:**
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "checks": {
    "environment": {
      "details": {
        "projectId": "vokeaqpxhrroaisyaizz",
        "serviceKeyProjectId": "???",
        "projectMatch": true/false  // ⚠️ CRITICAL: Must be true
      }
    },
    "database": {
      "details": {
        "allTablesExist": true/false  // ⚠️ Must be true
      }
    }
  },
  "recommendations": [...]  // ⚠️ Check for critical issues
}
```

### Step 3: If Service Key Mismatch (projectMatch: false)

**This is the most likely issue!**

1. Go to Supabase Dashboard: https://app.supabase.com
2. Select project "vokeaqpxhrroaisyaizz"
3. Go to Settings → API
4. Copy the "service_role" key (starts with `eyJ...`)
5. Go to Vercel Dashboard
6. Settings → Environment Variables
7. Update `SUPABASE_SERVICE_ROLE_KEY` with the correct key
8. Redeploy by clicking "Redeploy" on the latest deployment

### Step 4: Test Debug Endpoints

After fixing any service key issues:

1. **Get your user ID first**:
   - Go to Supabase Dashboard → Authentication → Users
   - Copy your user ID (UUID format)

2. **Test Progress Debug**:
   ```
   https://justspeakmvp.vercel.app/api/debug-progress?userId=YOUR_USER_ID
   ```
   
   Look for:
   - `serviceClient.success: true`
   - `serviceClient.data` should have your progress records

3. **Test Corrections Debug**:
   ```
   https://justspeakmvp.vercel.app/api/debug-corrections?userId=YOUR_USER_ID
   ```
   
   Look for:
   - `serviceClient.success: true`
   - `tableStatus.exists: true`

### Step 5: Test Dashboard Debug Mode

1. Go to: `https://justspeakmvp.vercel.app/dashboard?debug=true`
2. Look at the debug panel at the bottom
3. Check for any errors in red
4. Click "Progress API" and "Corrections API" buttons

### Step 6: Test Chat with Console Monitoring

1. Go to: `https://justspeakmvp.vercel.app/chat`
2. Open browser console (F12)
3. Say something with grammar errors: "I go to store yesterday"
4. Watch console for:
   ```
   [ChatInterface][req_xxx] Starting analyze-errors request
   [ChatInterface][req_xxx] Error analysis complete
   [ChatInterface][req_xxx] Debug info: {...}
   ```

5. Check if debug info shows:
   - `clientType: "service-role"` (good) vs `"regular"` (bad)
   - `operations` array with success/failure status
   - `summary.correctionSaved: true`
   - `summary.progressUpdated: true`

### Step 7: Verify Data is Saved

1. Go back to dashboard (regular view): `https://justspeakmvp.vercel.app/dashboard`
2. Check if speaking time is shown (not 0:00)
3. Check "Recent Corrections" section
4. Go to Feedback page to see corrections

### Step 8: Check Vercel Function Logs

1. Go to Vercel Dashboard
2. Functions tab
3. Click on "analyze-errors"
4. View recent invocations
5. Look for detailed logging with request IDs

## 🔧 Troubleshooting Guide

### Issue: Service Key Mismatch
**Symptom**: `projectMatch: false` in system-health
**Fix**: Update SUPABASE_SERVICE_ROLE_KEY in Vercel (see Step 3)

### Issue: Tables Don't Exist
**Symptom**: `allTablesExist: false` in system-health
**Fix**: 
1. Go to Supabase SQL Editor
2. Run migrations 002 and 003
3. Verify with system-health endpoint

### Issue: Regular Client Being Used
**Symptom**: `clientType: "regular"` in debug logs
**Fix**: Ensure SUPABASE_SERVICE_ROLE_KEY is set correctly

### Issue: OpenAI Errors
**Symptom**: analyze-errors fails at OpenAI step
**Fix**: Check OPENAI_API_KEY in Vercel env vars

## ✅ Success Criteria

You know the fix is working when:
1. System-health shows `status: "healthy"`
2. Dashboard shows actual speaking time (not 0:00)
3. Corrections appear in the feedback page
4. Debug endpoints show data with service client
5. Console logs show `clientType: "service-role"`

## 📱 Quick Links

- **Your App**: https://justspeakmvp.vercel.app
- **System Health**: https://justspeakmvp.vercel.app/api/system-health
- **Dashboard Debug**: https://justspeakmvp.vercel.app/dashboard?debug=true
- **Vercel Dashboard**: https://vercel.com/shojuros-projects/just-speak-mvp
- **Supabase Dashboard**: https://app.supabase.com/project/vokeaqpxhrroaisyaizz

## 🎯 Most Likely Fix Needed

Based on the .env file analysis, you'll likely need to:
1. Get the correct service role key for project "vokeaqpxhrroaisyaizz"
2. Update it in Vercel environment variables
3. Redeploy
4. Everything should work!

Good luck! 🚀