# Cookie Debug Endpoints

## Debug Endpoints Created

### 1. `/api/debug-auth`

Tests cookie authentication from multiple angles:

- Lists ALL cookies received by the server
- Shows expected vs actual cookie names
- Tests standard Supabase auth
- Shows environment configuration

### 2. `/api/debug-sessions`

Uses service role key to bypass RLS:

- Query by userId: `/api/debug-sessions?userId=044a4734-6ff1-465e-879a-544859605cfa`
- Query by sessionId: `/api/debug-sessions?sessionId=a346b9ef-517f-4bbb-8035-a5854ff12cc5`
- Shows all recent sessions if no params

## What These Will Show

1. **Cookie Issue**: If NO cookies are being sent at all
2. **Cookie Name Issue**: If cookies have unexpected names
3. **Domain Issue**: If cookies are set for wrong domain
4. **RLS Issue**: If data exists but RLS blocks access
5. **Auth Issue**: If cookies exist but auth fails

## How to Use

After deployment:

1. First check `/api/debug-auth` to see cookie status
2. Then check `/api/debug-sessions?userId=YOUR_USER_ID` to verify data exists
3. Compare results to identify the exact issue

## Enhanced Chat API Logging

The chat API now logs:

- ALL cookies received (not just auth ones)
- Expected cookie prefix based on Supabase URL
- Cookie value lengths to verify they contain data
