# Vercel Environment Variables Setup

## Quick Fix for Deployment Error

The error "Environment Variable 'NEXT_PUBLIC_SUPABASE_URL' references Secret 'supabase-url', which does not exist" occurs because Vercel is looking for secrets that haven't been created yet.

## Setup Instructions

### 1. Get Your Environment Variables

First, ensure you have all the required values from your `.env` file:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `OPENAI_API_KEY` - Your OpenAI API key
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `ENCRYPTION_KEY` - Generate with: `openssl rand -hex 32`

### 2. Add to Vercel Dashboard (Easiest Method)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add each variable:
   - Click "Add New"
   - Enter the Key (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter the Value
   - Select environments (Production, Preview, Development)
   - Click "Save"

### 3. Using Vercel CLI (Alternative)

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add OPENAI_API_KEY
vercel env add JWT_SECRET
vercel env add ENCRYPTION_KEY
```

### 4. Verify Setup

After adding all environment variables:

1. Trigger a new deployment:
   ```bash
   vercel --prod
   ```

2. Or push to your repository to trigger automatic deployment

## Important Notes

- The `vercel.json` has been updated to remove the secret references
- Environment variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, and `ENCRYPTION_KEY` secret
- Never commit `.env` files with real values to version control

## Troubleshooting

If deployment still fails:

1. Check all variable names match exactly (case-sensitive)
2. Ensure no trailing spaces in values
3. Verify Supabase project is active
4. Check OpenAI API key has sufficient credits

For more details, see the [Vercel Environment Variables documentation](https://vercel.com/docs/environment-variables).