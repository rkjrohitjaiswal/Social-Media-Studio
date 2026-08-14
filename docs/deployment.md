# AI Social Media Studio - Deployment & Monorepo Guide

This document outlines the architecture, local development commands, and production deployment configuration for **AI Social Media Studio**.

---

## Monorepo Architecture Overview

The repository is structured as a production-grade **npm workspace monorepo**:

```
/
├── apps/
│   ├── web/                         # Next.js 16 Frontend (Deployed to Vercel)
│   └── api/                         # Node/Express Backend API & Workers (Deployed to Render)
│
├── packages/
│   ├── database/                    # Prisma 7 Database Layer (@ai-social/database)
│   ├── shared/                      # Shared Schemas, Types, & Constants (@ai-social/shared)
│   └── config/                      # Shared TypeScript Base Config (@ai-social/config)
│
├── tests/                           # Consolidated Vitest Test Suite
├── docs/                            # Deployment & Architectural Documentation
├── .env.example
├── README.md
└── package.json
```

---

## Environment Variables Breakdown

### PUBLIC FRONTEND (`apps/web`)
Set these in Vercel environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### BACKEND ONLY (`apps/api` & Workers)
Set these in Render environment variables:
```env
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app

DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

OPENAI_API_KEY=your-openai-api-key
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
THREADS_APP_ID=your-threads-app-id
THREADS_APP_SECRET=your-threads-app-secret
PINTEREST_APP_ID=your-pinterest-app-id
PINTEREST_APP_SECRET=your-pinterest-app-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
TIKTOK_CLIENT_KEY=your-tiktok-client-key
TIKTOK_CLIENT_SECRET=your-tiktok-client-secret
YOUTUBE_CLIENT_ID=your-youtube-client-id
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
X_CLIENT_ID=your-x-client-id
X_CLIENT_SECRET=your-x-client-secret

INSTAGRAM_TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
LINKEDIN_TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

REDIS_URL=redis://red-xxx:6379
```

---

## Local Development Commands

```bash
# Install all dependencies across monorepo
npm install

# Generate Prisma Client
npm run db:generate

# Run both Web & API dev servers
npm run dev

# Run individual apps
npm run dev:web        # Frontend on http://localhost:3000
npm run dev:api        # Backend API on http://localhost:4000

# Run worker clusters
npm run worker:generation
npm run worker:publishing
npm run worker:analytics

# Run tests, typecheck, lint, and build
npm test
npm run typecheck
npm run lint
npm run build
```

---

## Production Deployment Configuration

### 1. Vercel Deployment (Frontend: `apps/web`)
1. Create a new Vercel project connected to your Git repository.
2. Set **Root Directory** to `apps/web`.
3. Set **Framework Preset** to Next.js.
4. Add Frontend Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`).

### 2. Render Deployment (Backend API: `apps/api`)
1. Create a new **Web Service** on Render.
2. Connect your Git repository.
3. Set **Root Directory** to `apps/api`.
4. Set **Environment** to Node or Docker (`apps/api/Dockerfile`).
5. Set **Build Command**: `npm run build --workspace=@ai-social/api`
6. Set **Start Command**: `npm run start --workspace=@ai-social/api`
7. Health Check Path: `/health`

### 3. Render Worker Deployments (Background Workers)
Create 3 separate **Background Worker** services on Render sharing the same repository and environment variables:
- **Generation Worker**: Start Command: `npm run worker:generation`
- **Publishing Worker**: Start Command: `npm run worker:publishing`
- **Analytics Worker**: Start Command: `npm run worker:analytics`

### 4. Supabase Setup
- PostgreSQL Database & Connection Pooling
- Auth Provider (Email & OAuth)
- Public / Private Media Buckets (`logos`, `assets`, `generated`)

### 5. Redis Setup (BullMQ)
- Provision a Managed Redis Instance (Upstash, Render Redis, or Redis Cloud).
- Pass `REDIS_URL` to `apps/api` and workers.
