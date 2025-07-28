# Just Speak MVP Development Standards

## 🚀 Quick Start

### New Developer Setup

```bash
# 1. Clone and install
git clone https://github.com/shojuro/JustSpeakMVP.git
cd JustSpeakMVP/justspeakmvp
npm install

# 2. Set up environment
cp .env.example .env
# Add your API keys to .env

# 3. Initialize Git hooks
npm run prepare

# 4. Start development
npm run dev
```

### Essential Commands

```bash
npm run dev          # Start development server
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run typecheck    # TypeScript type checking
npm run build        # Production build
```

## 🛠️ Development Workflow

### Multi-Layered Quality Assurance

1. **IDE** → Real-time feedback (ESLint + Prettier on save)
2. **Pre-commit** → Fast, targeted checks via Husky + lint-staged
3. **CI/CD** → Comprehensive validation via GitHub Actions

### Git Workflow

```bash
# Feature development
git checkout develop
git checkout -b feature/your-feature

# Make changes, then commit
git add .
git commit -m "feat: add new feature"  # Follows conventional commits

# Push (triggers pre-push type check)
git push origin feature/your-feature
```

### Commit Message Format

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
```

Examples:

- `feat: add user authentication`
- `fix(chat): resolve message ordering issue`
- `docs: update deployment guide`

## 💻 IDE Setup (VS Code Recommended)

### Required Extensions

- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)

### Auto-Installation

VS Code will prompt to install recommended extensions from `.vscode/extensions.json`

### Key Features

- ✅ Format on save (Prettier)
- ✅ Auto-fix linting issues (ESLint)
- ✅ TypeScript IntelliSense
- ✅ Tailwind CSS completions

## 🔧 Tool Configuration

### Separation of Concerns

- **Prettier** → All formatting (runs first)
- **ESLint** → Code quality & bugs (runs second)
- **TypeScript** → Type checking

### Performance Optimizations

- Local hooks run only on staged files
- Heavy checks offloaded to CI
- Use `--no-verify` only in emergencies

## 🚀 CI/CD Pipeline

### GitHub Actions Workflows

- **CI Pipeline** (`ci.yml`) → Runs on all PRs
  - ✨ Optimized with dependency & Next.js build caching
  - Parallel linting, type checking, security scans
  - Matrix testing across Node versions
  - Enhanced Lighthouse CI performance budgets

- **Deploy** (`deploy.yml`) → Automatic Vercel deployment
  - Preview deployments for PRs
  - Production deployment on main branch

- **Security** (`security.yml`) → Comprehensive security monitoring
  - Dependency vulnerability scanning
  - Secret detection with Gitleaks
  - CodeQL SAST analysis
  - License compliance checks
  - Container security scanning (if Dockerfile exists)
  - Security report generation

### Reusable Workflows

- **Node Setup** (`reusable-node-setup.yml`)
  - Standardized Node.js environment setup
  - Automatic dependency caching
- **Code Quality** (`reusable-code-quality.yml`)
  - Reusable linting, formatting, and type checking
  - Configurable for different scenarios

### Performance Optimizations

1. **Smart Caching**:
   - Node modules cached based on package-lock.json
   - Next.js build cache for faster builds
   - Incremental TypeScript checking

2. **Parallel Execution**:
   - Lint, typecheck, and security scans run in parallel
   - Matrix builds for multiple Node versions

3. **Conditional Execution**:
   - Skip hooks in CI environment
   - Manual workflow triggers for security scans

### Monitoring

- Check workflow status: Actions tab in GitHub
- Failed checks block PR merging
- Security alerts in Security tab
- Job summaries in workflow logs

## 🐛 Troubleshooting

### Common Issues

**Husky hooks not running:**

```bash
# Solution 1: Reinstall Husky
rm -rf .husky
npm run prepare

# Solution 2: Check Git hooks path
git config core.hooksPath

# Solution 3: Ensure hooks are executable
chmod +x .husky/*
```

**Husky in GUI clients (SourceTree, GitKraken, etc.):**

```bash
# If you get "command not found" errors
# Option 1: Use terminal for commits
# Option 2: Add Node to PATH in ~/.huskyrc
echo 'export PATH="/usr/local/bin:$PATH"' > ~/.huskyrc
```

**ESLint/Prettier conflicts:**

```bash
# Run Prettier first, then ESLint
npm run format
npm run lint:fix

# Check for conflicting rules
npx eslint --print-config .eslintrc.js | grep -E "indent|quotes|semi"
```

**Type errors:**

```bash
npm run typecheck

# For incremental checking (faster)
npx tsc --noEmit --incremental

# Clear TypeScript cache
rm -rf tsconfig.tsbuildinfo
```

**lint-staged running slowly:**

```bash
# Check number of staged files
git diff --cached --name-only | wc -l

# For large commits, skip hooks temporarily
HUSKY=0 git commit -m "large refactor"
```

**micromatch not found error:**

```bash
# Install missing dependency
npm install --save-dev micromatch
```

### Git Hook Bypass

```bash
# Emergency only - CI will still catch issues
git commit --no-verify

# Skip all hooks for current command
HUSKY=0 git commit -m "emergency fix"

# Disable Husky temporarily
npx husky uninstall
# Re-enable later
npx husky install
```

### Performance Tips

1. **Optimize lint-staged**: The configuration now uses smart thresholds
   - Small changes: Incremental TypeScript checking
   - Large changes (>10 files): Full type check
   - Critical files: Always full check

2. **CI Caching**: GitHub Actions now caches:
   - Node modules
   - npm cache
   - Next.js build cache

3. **Local vs CI**: Heavy checks run in CI, not locally
   - Local: Fast formatting and basic linting
   - CI: Comprehensive security scans and tests

## 📚 Additional Resources

- [Project README](./README.md) - Setup and deployment
- [Security Policy](./docs/SECURITY.md) - Security guidelines
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment

### External Documentation

- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions](https://docs.github.com/en/actions)

## 🎯 Key Principles

1. **Fast Local, Comprehensive CI** - Quick feedback locally, thorough validation in CI
2. **No Forced Settings** - IDE configs are recommendations, not requirements
3. **Progressive Enhancement** - Start simple, add complexity as needed
4. **Security First** - All changes scanned for vulnerabilities

---

**Remember:** This workflow enhances productivity without being intrusive. When in doubt, let the CI catch it!
