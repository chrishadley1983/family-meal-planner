# Family Fuel - Deployment Guide

This guide covers deploying the Family Fuel application to production using Vercel, with separate development and production environments.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Vercel Deployment](#vercel-deployment)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Monitoring & Observability](#monitoring--observability)
9. [Rollback Procedures](#rollback-procedures)
10. [Mobile API Configuration](#mobile-api-configuration)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │  Developer   │────▶│   GitHub     │────▶│   Vercel     │        │
│  │  (Push)      │     │   Actions    │     │   (Deploy)   │        │
│  └──────────────┘     └──────────────┘     └──────────────┘        │
│                              │                     │                │
│                              ▼                     ▼                │
│                       ┌──────────────┐     ┌──────────────┐        │
│                       │  CI Checks   │     │   Preview    │        │
│                       │  - TypeCheck │     │   (PRs)      │        │
│                       │  - Lint      │     └──────────────┘        │
│                       │  - Tests     │            │                │
│                       │  - Build     │            │                │
│                       └──────────────┘            │                │
│                              │                     │                │
│                              ▼                     ▼                │
│                       ┌─────────────────────────────────────┐      │
│                       │         PRODUCTION                   │      │
│                       │  https://familyfuel.vercel.app       │      │
│                       └─────────────────────────────────────┘      │
│                                      │                              │
│                    ┌─────────────────┼─────────────────┐           │
│                    ▼                 ▼                 ▼           │
│             ┌───────────┐     ┌───────────┐     ┌───────────┐      │
│             │ Supabase  │     │ Anthropic │     │  Sentry   │      │
│             │ (Prod DB) │     │ Claude API│     │ (Errors)  │      │
│             └───────────┘     └───────────┘     └───────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Environments

| Environment | URL | Database | Purpose |
|-------------|-----|----------|---------|
| Development | localhost:3000 | Supabase Dev | Local development |
| Preview | pr-{n}.vercel.app | Supabase Dev | PR review & testing |
| Production | familyfuel.vercel.app | Supabase Prod | Live application |

---

## Prerequisites

Before deploying, ensure you have:

1. **Accounts:**
   - [GitHub](https://github.com) account with repository access
   - [Vercel](https://vercel.com) account (free tier works)
   - [Supabase](https://supabase.com) account with two projects (dev/prod)
   - [Anthropic](https://console.anthropic.com) account with API key
   - [Sentry](https://sentry.io) account (optional but recommended)

2. **Tools:**
   - Node.js 20+ installed locally
   - Git configured with SSH keys
   - Vercel CLI (optional): `npm i -g vercel`

---

## Initial Setup

### 1. Fork/Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/family-meal-planner.git
cd family-meal-planner
npm install
```

### 2. Connect to Vercel

```bash
# Option A: Via Vercel Dashboard
# 1. Go to https://vercel.com/new
# 2. Import your GitHub repository
# 3. Select "Next.js" as framework preset

# Option B: Via CLI
vercel link
```

### 3. Configure Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset:** Next.js
- **Build Command:** `npx prisma generate && npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm ci`

---

## Environment Configuration

### Required Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (use pooling) | `postgresql://postgres:xxx@db.xxx.supabase.co:6543/postgres?pgbouncer=true` |
| `NEXTAUTH_SECRET` | Random 32+ character string | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production URL | `https://familyfuel.vercel.app` |
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-xxx` |
| `SENTRY_DSN` | Sentry project DSN (optional) | `https://xxx@xxx.ingest.sentry.io/xxx` |

### Environment-Specific Variables

Configure different values per environment in Vercel:

```
┌─────────────────┬─────────────────┬─────────────────┐
│   Variable      │   Preview       │   Production    │
├─────────────────┼─────────────────┼─────────────────┤
│ DATABASE_URL    │ Dev DB URL      │ Prod DB URL     │
│ NEXTAUTH_URL    │ (auto)          │ Production URL  │
│ SENTRY_ENV      │ preview         │ production      │
└─────────────────┴─────────────────┴─────────────────┘
```

### Generating Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Database Setup

### Creating a Production Database

1. **Go to Supabase Dashboard** → Create New Project
2. **Name it:** `familyfuel-prod` (or similar)
3. **Choose region:** Closest to your users (e.g., London for UK)
4. **Copy connection string** from Settings → Database

### Connection String Format

```
# Direct connection (for migrations)
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Pooled connection (for production - RECOMMENDED)
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true
```

**Always use pooled connection (port 6543) in production** for better connection handling.

### Running Migrations

```bash
# From your local machine with production DATABASE_URL
DATABASE_URL="postgresql://..." npx prisma db push

# Or use Prisma Migrate for versioned migrations
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### Seeding Production Data

Only seed essential reference data (not test data):

```bash
# Seed units of measure and shelf life data
DATABASE_URL="postgresql://..." npx tsx scripts/seed-reference-data.ts
```

---

## Vercel Deployment

### Automatic Deployments

Once connected to GitHub, Vercel automatically:

1. **Production deploys** on push to `main`
2. **Preview deploys** on pull requests
3. Runs build and shows deployment preview

### Manual Deployment

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Deployment Configuration

The `vercel.json` file configures:

- **Region:** `lhr1` (London) for low latency
- **Headers:** Security headers and CORS for mobile
- **Rewrites:** `/health` → `/api/health`

### Custom Domain (Optional)

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your domain (e.g., `familyfuel.app`)
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` environment variable

---

## CI/CD Pipeline

### GitHub Actions Workflow

The `.github/workflows/ci.yml` runs on every PR and push to main:

```yaml
Jobs:
1. typecheck    - TypeScript compilation check
2. lint         - ESLint code quality
3. test-unit    - Jest unit tests
4. test-integration - Integration tests
5. build        - Next.js production build
6. test-e2e     - Playwright browser tests
7. security     - npm audit for vulnerabilities
```

### Pipeline Flow

```
Push to Branch
     │
     ▼
┌─────────────────────┐
│   GitHub Actions    │
│   CI Pipeline       │
│                     │
│  ┌───┐  ┌───┐      │
│  │TSC│  │ESL│      │  (parallel)
│  └─┬─┘  └─┬─┘      │
│    │      │        │
│    ▼      ▼        │
│  ┌───────────┐     │
│  │   Build   │     │
│  └─────┬─────┘     │
│        │           │
│        ▼           │
│  ┌───────────┐     │
│  │  E2E Tests│     │
│  └─────┬─────┘     │
│        │           │
└────────┼───────────┘
         │
         ▼
    All Passed?
     │      │
    Yes     No
     │      │
     ▼      ▼
  Vercel   Block
  Deploy   Merge
```

### Required GitHub Secrets

Add these in GitHub → Repository → Settings → Secrets:

```
DATABASE_URL_DEV     - Development database URL
NEXTAUTH_SECRET      - Auth secret for CI builds
ANTHROPIC_API_KEY    - For integration tests
```

### Branch Protection

Configure in GitHub → Repository → Settings → Branches:

- Require status checks before merging
- Require `ci-success` check to pass
- Require pull request reviews

---

## Monitoring & Observability

### Health Check Endpoint

```bash
# Check application health
curl https://familyfuel.vercel.app/health

# Response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "0.1.0",
  "environment": "production",
  "checks": {
    "database": { "status": "ok", "latency": 45 },
    "memory": { "status": "ok", "usedMB": 128, "totalMB": 512 }
  }
}
```

### Vercel Analytics

Automatically enabled. View in Vercel Dashboard → Analytics:

- Page views and visitors
- Web Vitals (LCP, FID, CLS)
- Geographic distribution
- Device breakdown

### Sentry Error Tracking

1. Create project at sentry.io
2. Choose "Next.js" platform
3. Copy DSN to Vercel environment variables
4. Errors will appear in Sentry dashboard

### Uptime Monitoring

Recommended services (free tiers available):

- [Better Uptime](https://betteruptime.com)
- [UptimeRobot](https://uptimerobot.com)
- [Pingdom](https://www.pingdom.com)

Configure to monitor: `https://familyfuel.vercel.app/health`

---

## Rollback Procedures

### Instant Rollback via Vercel

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

### Git-Based Rollback

```bash
# Revert the problematic commit
git revert HEAD
git push origin main

# Or reset to a specific commit (use with caution)
git reset --hard <commit-hash>
git push origin main --force
```

### Database Rollback

If a migration caused issues:

```bash
# Check migration status
DATABASE_URL="..." npx prisma migrate status

# Rollback last migration (if supported)
DATABASE_URL="..." npx prisma migrate reset

# Or manually run rollback SQL
psql $DATABASE_URL -f rollback.sql
```

---

## Mobile API Configuration

### CORS Headers

The middleware and `vercel.json` configure CORS for mobile apps:

```javascript
// Allowed from any origin (mobile apps don't have origins)
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### React Native Configuration

In your React Native app:

```javascript
// api.config.js
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://familyfuel.vercel.app';

// Example API call
const response = await fetch(`${API_BASE_URL}/api/recipes`, {
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  },
});
```

### Authentication for Mobile

The existing NextAuth setup works with mobile via:

1. Mobile app authenticates user
2. Receives JWT token
3. Includes token in `Authorization` header
4. API validates token server-side

---

## Troubleshooting

### Build Failures

```bash
# Check build locally first
npm run build

# Common issues:
# 1. TypeScript errors - run: npm run typecheck
# 2. Missing env vars - check Vercel environment settings
# 3. Prisma issues - ensure `prisma generate` runs in build command
```

### Database Connection Issues

```bash
# Test connection
DATABASE_URL="..." npx prisma db pull

# Common issues:
# 1. Wrong port (use 6543 for pooling in production)
# 2. IP not whitelisted (Supabase allows all by default)
# 3. SSL required - add ?sslmode=require if needed
```

### Preview Deployments Not Working

1. Check GitHub integration in Vercel settings
2. Verify repository permissions
3. Check branch protection rules

### Environment Variables Not Loading

1. Verify variables are set in Vercel (not just locally)
2. Check environment scope (Production vs Preview)
3. Redeploy after changing variables

### Slow Cold Starts

1. Vercel Serverless Functions have cold starts
2. Consider upgrading to Vercel Pro for better performance
3. Use ISR for static pages where possible

---

## Deployment Checklist

### Before First Production Deploy

- [ ] Production Supabase project created
- [ ] All environment variables set in Vercel
- [ ] Database migrations applied to production
- [ ] NEXTAUTH_SECRET is unique (not copied from dev)
- [ ] Domain configured (if custom)
- [ ] Sentry project created
- [ ] Uptime monitoring configured

### For Each Release

- [ ] All CI checks passing
- [ ] PR reviewed and approved
- [ ] No console errors in preview deployment
- [ ] Health check returns 200
- [ ] Core functionality tested in preview
- [ ] Merge to main triggers production deploy
- [ ] Verify production deployment succeeded
- [ ] Smoke test production site

### Post-Deploy Verification

```bash
# 1. Health check
curl https://familyfuel.vercel.app/health

# 2. Test authentication
# Open browser, log in, verify session

# 3. Test core features
# - View dashboard
# - View recipes list
# - Generate meal plan (tests AI)

# 4. Check Sentry for new errors
# Visit sentry.io dashboard
```

---

## Support

- **GitHub Issues:** Report bugs and feature requests
- **Vercel Support:** https://vercel.com/support
- **Supabase Discord:** https://discord.supabase.com
- **Next.js Docs:** https://nextjs.org/docs

---

*Last updated: December 2024*
