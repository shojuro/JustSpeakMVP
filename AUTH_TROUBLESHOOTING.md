# Authentication Troubleshooting Guide

## Issue: Can't Login After Email Confirmation

### 1. **Vercel Environment Variables**

Make sure these environment variables are set correctly in Vercel:

```bash
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app  # YOUR ACTUAL PRODUCTION URL
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**CRITICAL**: The `NEXT_PUBLIC_APP_URL` must match your actual Vercel deployment URL!

### 2. **Supabase Dashboard Configuration**

1. **Go to Supabase Dashboard** → Your Project → Authentication → Email Templates

2. **Update Confirm Signup Template**:
   - Find the "Confirm signup" template
   - Look for the confirmation URL, it should be:
   ```
   {{ .SiteURL }}/auth/callback?code={{ .Token }}&type=signup
   ```
   - If it's using localhost, update it

3. **Update Auth Settings**:
   - Go to Authentication → URL Configuration
   - Set **Site URL** to your production URL: `https://your-app-name.vercel.app`
   - Add to **Redirect URLs**:
     - `https://your-app-name.vercel.app/auth/callback`
     - `https://your-app-name.vercel.app/**`
     - `http://localhost:3000/**` (for local development)

4. **Email Settings**:
   - Go to Authentication → Settings
   - Ensure "Enable email confirmations" is ON
   - Check "Email Auth" is enabled

### 3. **Debug Steps**

1. **Visit the debug page**: `https://your-app-name.vercel.app/auth/debug`
   - This will show you the current auth status
   - Check if email is confirmed
   - Resend confirmation if needed

2. **Check browser console** for errors when clicking the email confirmation link

3. **Verify the confirmation link format** in the email:
   - Should be: `https://your-app-name.vercel.app/auth/callback?code=xxxxx`
   - NOT: `http://localhost:3000/auth/callback?code=xxxxx`

### 4. **Common Issues & Solutions**

#### Issue: "No authorization code found"
- **Cause**: Email link is malformed or expired
- **Solution**: Request new confirmation email from debug page

#### Issue: Email confirmed but still can't login
- **Cause**: Password might be incorrect or session issues
- **Solution**: 
  1. Try resetting password
  2. Clear browser cookies for your domain
  3. Try incognito/private browsing mode

#### Issue: Redirected to localhost after confirmation
- **Cause**: Supabase Site URL is set to localhost
- **Solution**: Update Site URL in Supabase dashboard (see step 2.3)

### 5. **Quick Fix Checklist**

- [ ] Verify `NEXT_PUBLIC_APP_URL` in Vercel matches your deployment URL
- [ ] Update Supabase Site URL to production URL
- [ ] Add production URL to Supabase Redirect URLs
- [ ] Check email template uses `{{ .SiteURL }}` not hardcoded localhost
- [ ] Clear browser cache/cookies and try again
- [ ] Use `/auth/debug` page to check email confirmation status

### 6. **Testing After Changes**

1. Sign up with a new email address
2. Check the confirmation email link URL
3. Click the link and verify you're redirected to production site
4. Should automatically log in and redirect to `/chat`

### 7. **Emergency Workaround**

If confirmation emails are not working, you can temporarily:
1. Go to Supabase Dashboard → Authentication → Users
2. Find the user and manually confirm their email
3. This allows testing while fixing the email flow

## Need More Help?

1. Check Vercel function logs for auth-related errors
2. Check Supabase logs (Dashboard → Logs → Auth)
3. Use the `/auth/debug` page to diagnose issues