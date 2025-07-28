# Vercel Environment Variables Setup

Add these environment variables to your Vercel project dashboard:

## Required Variables

### Supabase Configuration

```
NEXT_PUBLIC_SUPABASE_URL=https://vokeaqpxhrroaisyaizz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZva2VhcXB4aHJyb2Fpc3lhaXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTk0OTQsImV4cCI6MjA2ODk5NTQ5NH0.zBcsntGMiGp1Vgbe_3PnT1Rn7qsfKOzjLwCSwf8xbao
SUPABASE_SERVICE_ROLE_KEY=[Copy from your .env file - already configured]
```

### OpenAI Configuration

```
OPENAI_API_KEY=[Copy from your .env file - already configured]
```

### App Configuration

```
NEXT_PUBLIC_APP_URL=https://just-speak-mvp-7uhu.vercel.app
```

### Security Configuration

```
JWT_SECRET=zoa1fIctbsztSeJezwgGzfjMeWBojEbs
ENCRYPTION_KEY=13DV8ggWFPWCz2a7i4fkXVmKsnGGO8jX
```

## Optional Variables (Not required for basic functionality)

### Google Cloud (for Speech-to-Text - currently using OpenAI Whisper)

```
GOOGLE_APPLICATION_CREDENTIALS=[Path to credentials - not needed in Vercel]
GOOGLE_CLOUD_PROJECT_ID=[Your project ID]
```

### ElevenLabs (for Text-to-Speech - not currently used)

```
ELEVENLABS_API_KEY=[Your API key]
```

## How to Add to Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with its value
4. Make sure to select "Production", "Preview", and "Development" environments
5. Click "Save" after adding all variables

## Important Notes

- The `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` need to be obtained from your .env file
- The `NEXT_PUBLIC_APP_URL` should match your Vercel deployment URL
- Do NOT commit these values to Git
- The JWT_SECRET and ENCRYPTION_KEY shown here are the newly generated ones
