# Developer Onboarding Checklist

Welcome to the JustSpeak MVP project! This checklist ensures you have everything set up for a productive development experience.

## 📋 Pre-requisites

- [ ] Node.js 18+ installed (recommend using nvm)
- [ ] npm 8+ installed
- [ ] Git 2.30+ installed
- [ ] GitHub account with repository access
- [ ] Code editor installed (VS Code, PyCharm, WebStorm, etc.)

## 🚀 Initial Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/shojuro/JustSpeakMVP.git
cd JustSpeakMVP/justspeakmvp

# Install dependencies
npm install

# Verify Husky installation
ls -la .husky/
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Add required API keys:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENAI_API_KEY
```

### 3. Git Hooks Setup

```bash
# Initialize Husky (should run automatically via prepare script)
npm run prepare

# Test pre-commit hook
echo "test" > test.txt
git add test.txt
git commit -m "test: verify hooks"
# Should see Prettier and ESLint running

# Clean up test
git reset --hard HEAD
```

## 🛠️ Development Workflow Verification

### 4. Code Quality Tools

- [ ] **Prettier formatting works**

  ```bash
  npm run format:check
  npm run format
  ```

- [ ] **ESLint linting works**

  ```bash
  npm run lint
  npm run lint:fix
  ```

- [ ] **TypeScript checking works**
  ```bash
  npm run typecheck
  ```

### 5. Git Hooks Verification

- [ ] **Pre-commit hook**
  - Create a file with formatting issues
  - Stage and commit
  - Verify auto-formatting happens

- [ ] **Commit message validation**

  ```bash
  # This should fail
  git commit -m "bad commit message"

  # This should pass
  git commit -m "feat: add new feature"
  ```

- [ ] **Pre-push hook**
  - Make changes with TypeScript errors
  - Try to push
  - Verify type checking prevents push

## 💻 IDE Configuration

### For VS Code Users

1. Install recommended extensions when prompted
2. Verify auto-formatting on save works
3. Check ESLint errors appear in editor

### For PyCharm/WebStorm Users

1. Enable Prettier:
   - Settings → Languages & Frameworks → JavaScript → Prettier
   - Set Prettier package path: `./node_modules/prettier`
   - Check "On save" and "On code reformat"

2. Enable ESLint:
   - Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
   - Select "Automatic ESLint configuration"
   - Check "Run eslint --fix on save"

3. Configure Node.js:
   - Settings → Languages & Frameworks → Node.js
   - Set Node interpreter and enable coding assistance

### For Other IDEs

- Configure Prettier as the default formatter
- Enable ESLint integration
- Set up format on save

## 🧪 Running the Application

```bash
# Start development server
npm run dev

# Open http://localhost:3000
# Verify the app loads correctly
```

## 📝 Making Your First Contribution

### 6. Create a Feature Branch

```bash
git checkout develop
git checkout -b feature/your-name-test
```

### 7. Make a Small Change

1. Edit `src/app/page.tsx`
2. Add a comment: `// Onboarding test by [Your Name]`
3. Save the file

### 8. Commit Your Change

```bash
git add .
git commit -m "docs: add onboarding test comment"
```

Observe:

- Prettier formats your code
- ESLint checks for issues
- Commit message is validated

### 9. Push Your Branch

```bash
git push origin feature/your-name-test
```

Observe:

- TypeScript checking runs before push
- Push succeeds if no type errors

## ✅ Final Checks

- [ ] Development server runs without errors
- [ ] Can make and commit changes
- [ ] Git hooks execute properly
- [ ] IDE shows linting errors in real-time
- [ ] Formatting happens automatically

## 🚨 Troubleshooting

If you encounter issues:

1. Check [CLAUDE.md](./CLAUDE.md) troubleshooting section
2. Ensure Node.js version is correct: `node --version`
3. Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
4. For Husky issues: `rm -rf .husky && npm run prepare`

## 📚 Next Steps

1. Read the full [CLAUDE.md](./CLAUDE.md) for workflow details
2. Review [SECURITY.md](./docs/SECURITY.md) for security guidelines
3. Check GitHub Actions tab to understand CI/CD pipeline
4. Join the team Slack channel for questions

## 🎉 You're Ready!

Once you've completed this checklist, you're ready to start contributing. Remember:

- **Write clean code**: Let the tools help you
- **Follow conventions**: Use conventional commits
- **Trust the process**: If hooks prevent commits, fix the issues
- **Ask questions**: The team is here to help

Welcome aboard! 🚀
