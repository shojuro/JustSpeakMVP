# Supabase Email Configuration for Production

## The Issue

You're not receiving confirmation emails because Supabase's free tier has strict email limitations:
- Only 3 emails per hour
- Default SMTP is for development only
- Production requires custom SMTP configuration

## Solutions

### Option 1: Use Supabase Dashboard to Manually Confirm Users (Quick Fix)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Authentication** → **Users**
4. Find the user and click the three dots
5. Select "Confirm email"

### Option 2: Configure Custom SMTP (Recommended for Production)

1. **Get SMTP Service** (Choose one):
   - [SendGrid](https://sendgrid.com) - 100 emails/day free
   - [Mailgun](https://mailgun.com) - 5,000 emails/month free
   - [Amazon SES](https://aws.amazon.com/ses/) - 62,000 emails/month free
   - Gmail SMTP - 500 emails/day

2. **Configure in Supabase**:
   - Go to **Authentication** → **Settings** → **SMTP Settings**
   - Enable "Custom SMTP"
   - Enter your SMTP details:
     ```
     Host: smtp.sendgrid.net (or your provider)
     Port: 587
     Username: apikey (for SendGrid) or your username
     Password: Your API key or password
     Sender email: noreply@yourdomain.com
     Sender name: Just Speak
     ```

3. **Update Email Templates**:
   - Go to **Authentication** → **Email Templates**
   - Ensure all URLs use your production domain

### Option 3: Disable Email Confirmation (Development Only)

1. Go to **Authentication** → **Settings**
2. Under "Email Auth", disable "Enable email confirmations"
3. Users can sign up and login immediately without confirmation

## Current Workaround

For testing, I've added:
1. Debug info in login/signup forms showing auth state
2. Links to `/auth/debug` and `/system-check`
3. "Clear Cache" button on home page
4. Sign Out button when logged in

## To Test Right Now

1. Click "Clear Cache" on the home page
2. Try signing up with a new email
3. If no email received, go to Supabase Dashboard and manually confirm
4. Try logging in again

## Production Recommendations

1. Set up custom SMTP before launch
2. Consider using magic links instead of passwords
3. Add email delivery monitoring
4. Implement backup auth methods (social login)