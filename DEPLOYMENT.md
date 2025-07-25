# 🚀 Deployment Guide for Just Speak MVP

## 📋 Pre-Deployment Checklist

### 1. **Supabase Setup**
- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Run database migration from `supabase/migrations/001_initial_schema.sql`
- [ ] Enable Email Auth in Authentication settings
- [ ] Add redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://your-domain.vercel.app/auth/callback`
- [ ] Copy all keys to your `.env` file

### 2. **Environment Variables**
Make sure all these are set in your `.env`:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `JWT_SECRET` (use `node scripts/generate-secrets.js`)
- [ ] `ENCRYPTION_KEY` (use `node scripts/generate-secrets.js`)

### 3. **Dependencies Installation**
```bash
npm install
npm install openai @supabase/ssr
```

### 4. **Test Locally**
```bash
npm run dev
```
- [ ] Test signup flow
- [ ] Test login
- [ ] Test speech recording
- [ ] Test AI responses
- [ ] Test on mobile browser

## 🌐 Vercel Deployment

### 1. **Push to GitHub**
```bash
git add .
git commit -m "Ready for deployment"
git push origin feature/initial-setup
```

### 2. **Deploy to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure environment variables:
   - Add all variables from `.env`
   - Use the Vercel dashboard or CLI

### 3. **Vercel CLI Deployment** (Alternative)
```bash
npm i -g vercel
vercel
```

### 4. **Post-Deployment**
- [ ] Update Supabase redirect URLs with your Vercel domain
- [ ] Test all features on production
- [ ] Check mobile PWA installation

## 📱 Mobile Testing

### Android
1. Open Chrome on Android
2. Navigate to your Vercel URL
3. Chrome menu → "Add to Home screen"
4. Test as standalone app

### iOS
1. Open Safari on iPhone/iPad
2. Navigate to your Vercel URL
3. Share button → "Add to Home Screen"
4. Test as standalone app

## 🐛 Troubleshooting

### Common Issues

**1. Microphone not working:**
- Ensure HTTPS is enabled (automatic on Vercel)
- Check browser permissions
- iOS requires user interaction before audio

**2. OpenAI API errors:**
- Verify API key is correct
- Check OpenAI account has credits
- Monitor rate limits

**3. Supabase auth issues:**
- Verify redirect URLs match exactly
- Check email settings in Supabase
- Ensure RLS policies are correct

**4. PWA not installing:**
- Check manifest.json is accessible
- Verify HTTPS is working
- Clear browser cache

## 🎯 Performance Optimization

1. **Enable Vercel Analytics**
   ```bash
   npm i @vercel/analytics
   ```

2. **Monitor API Usage**
   - OpenAI dashboard for token usage
   - Supabase dashboard for database metrics
   - Vercel dashboard for function execution

3. **Optimize Bundle Size**
   ```bash
   npm run build
   # Check .next folder size
   ```

## 🔒 Security Final Check

- [ ] All API keys are in environment variables
- [ ] No secrets in code
- [ ] HTTPS enforced
- [ ] Rate limiting active
- [ ] CORS configured correctly

## 📊 Success Metrics

After deployment, monitor:
- User signups
- Average session length
- Speaking time per session
- API costs
- Error rates

---

## 🎉 Launch!

Once everything is checked:

1. Merge to main branch
2. Announce on social media
3. Share with language learning communities
4. Collect user feedback
5. Iterate and improve!

**Remember: You're changing lives, one conversation at a time! 🚀**