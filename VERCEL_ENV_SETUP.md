# Vercel Environment Variables Setup

## Quick Fix for Deployment Errors

### Error 1: "No Next.js version detected"
This error can occur if Vercel is not looking in the correct directory. Since your repository root is already the Next.js application directory, ensure that:
1. In Vercel Dashboard, the "Root Directory" setting is empty or set to "./"
2. The repository is connected correctly (not pointing to a parent directory)

### Error 2: "Environment Variable references Secret which does not exist"
This occurs because Vercel is looking for secrets that haven't been created yet.

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

## Vercel Project Configuration

**Important**: When importing this repository to Vercel:

1. **GitHub Repository Selection**:
   - Make sure you're selecting the correct repository path
   - If your repo shows as `username/JustSpeakMVP/justspeakmvp`, select `username/JustSpeakMVP`
   - The repository root should already contain the Next.js app

2. **Root Directory Setting**:
   - Leave the "Root Directory" field empty or set to "./"
   - Do NOT set it to "justspeakmvp" if that's already your repo root

3. **Framework Preset**:
   - Vercel should auto-detect "Next.js"
   - If not, manually select it

## Troubleshooting

If deployment still fails:

1. Check all variable names match exactly (case-sensitive)
2. Ensure no trailing spaces in values
3. Verify Supabase project is active
4. Check OpenAI API key has sufficient credits

For more details, see the [Vercel Environment Variables documentation](https://vercel.com/docs/environment-variables).