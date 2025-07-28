# Vercel CLI Deployment with Root Directory

If you can't find the Root Directory setting in the Vercel Dashboard, use the Vercel CLI:

## Steps:

1. **Install Vercel CLI** (if not already installed):

   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:

   ```bash
   vercel login
   ```

3. **Navigate to your repository root**:

   ```bash
   cd /path/to/JustSpeakMVP
   ```

4. **Deploy with root directory specified**:

   ```bash
   vercel --cwd justspeakmvp
   ```

   Or if you're already in the justspeakmvp directory:

   ```bash
   cd justspeakmvp
   vercel
   ```

5. **Follow the prompts**:
   - Set up and deploy? `Y`
   - Which scope? (select your account)
   - Link to existing project? `Y` (if you want to keep the same project)
   - What's the name of your existing project? (enter your project name)

## Alternative: Create vercel.json at Repository Root

If you have access to push to the repository root (not just the justspeakmvp subdirectory), you could:

1. Create a `vercel.json` at the repository root:

   ```json
   {
     "buildCommand": "cd justspeakmvp && npm install && npm run build",
     "outputDirectory": "justspeakmvp/.next",
     "installCommand": "cd justspeakmvp && npm install",
     "devCommand": "cd justspeakmvp && npm run dev"
   }
   ```

2. Push this to the main branch

## Recommended: Re-import Method

The cleanest solution is to delete and re-import the project with the correct Root Directory setting during the import process.
