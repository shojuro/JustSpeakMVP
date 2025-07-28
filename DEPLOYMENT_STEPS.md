# Deployment Steps - Action Required

## Current Status

✅ Code has been pushed to main branch
✅ Security keys have been generated
✅ Environment variables documented

## 1. Vercel Dashboard Actions

### Add Environment Variables

1. Go to your Vercel project: https://vercel.com/dashboard
2. Navigate to Settings → Environment Variables
3. Add these variables (copy values from your .env file):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://vokeaqpxhrroaisyaizz.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZva2VhcXB4aHJyb2Fpc3lhaXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTk0OTQsImV4cCI6MjA2ODk5NTQ5NH0.zBcsntGMiGp1Vgbe_3PnT1Rn7qsfKOzjLwCSwf8xbao`
   - `SUPABASE_SERVICE_ROLE_KEY` = [Copy from your .env file]
   - `OPENAI_API_KEY` = [Copy from your .env file]
   - `JWT_SECRET` = `zoa1fIctbsztSeJezwgGzfjMeWBojEbs`
   - `ENCRYPTION_KEY` = `13DV8ggWFPWCz2a7i4fkXVmKsnGGO8jX`
   - `NEXT_PUBLIC_APP_URL` = `https://just-speak-mvp-7uhu.vercel.app`

4. Make sure to select all environments: Production, Preview, Development
5. Click "Save"

### Trigger Redeployment

1. Go to the Deployments tab
2. Find the latest deployment
3. Click the three dots → "Redeploy"
4. This will deploy with the new environment variables

## 2. Supabase Dashboard Actions

### Update Redirect URLs

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to Authentication → URL Configuration
4. Update these settings:
   - **Site URL**: `https://just-speak-mvp-7uhu.vercel.app`
   - **Redirect URLs** (add both):
     - `https://just-speak-mvp-7uhu.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback`
5. Click "Save"

### Email Configuration (Choose One)

#### Option A: Quick Testing (Manual Confirmation)

- Go to Authentication → Users
- Manually confirm users by clicking the three dots → "Confirm email"

#### Option B: Production Ready (Custom SMTP)

1. Sign up for SendGrid (100 emails/day free)
2. Go to Authentication → Settings → SMTP Settings
3. Enable "Custom SMTP" and enter:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - Username: `apikey`
   - Password: [Your SendGrid API key]
   - Sender email: `noreply@yourdomain.com`
   - Sender name: `Just Speak`

## 3. Verify Deployment

Once redeployed, test these URLs:

1. Homepage: https://just-speak-mvp-7uhu.vercel.app
2. System Check: https://just-speak-mvp-7uhu.vercel.app/system-check
3. Auth Debug: https://just-speak-mvp-7uhu.vercel.app/auth/debug

## 4. Test Authentication Flow

1. Sign up with a new email
2. Check email (or manually confirm in Supabase)
3. Click confirmation link
4. Verify auto-login works
5. Test manual login
6. Test chat interface

## Deployment Timeline

1. **Immediate** (5 minutes):
   - Add environment variables to Vercel
   - Update Supabase redirect URLs
   - Trigger redeployment

2. **Testing** (10 minutes):
   - Verify all pages load
   - Test signup/login flow
   - Check system diagnostics

3. **Optional** (30 minutes):
   - Set up custom SMTP for reliable emails
   - Configure GitHub Actions for auto-deployment

## Need Help?

- Check deployment logs in Vercel dashboard
- Use `/system-check` page for diagnostics
- Check Supabase logs for auth issues
- Environment variables not loading? Make sure to redeploy after adding them
