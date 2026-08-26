# DEPLOYMENT GUIDE — AI SOCIAL MEDIA STUDIO

This guide details the step-by-step production deployment procedure for **AI SOCIAL MEDIA STUDIO**.

---

## 1. Production Deployment Architecture

The application uses a modular monorepo architecture:

- **Web Application (`apps/web`)**: Next.js 16 (React 19) server-side rendered and static application serving studio UI routes (`/dashboard`, `/create`, `/repurpose`, `/calendar`, `/published`, `/analytics`, `/settings/*`).
- **API Server (`apps/api`)**: Express 4 Node.js REST API processing authentication, workspace isolation, content generation orchestration, BYOK encryption, and analytics query engines.
- **Database Layer (`packages/database`)**: PostgreSQL database hosted on Supabase managed instance with Prisma ORM client & migrations.
- **Background Publishing Worker (`apps/api/src/workers/publishing-worker.js`)**: Singleton background publishing ticker embedded in API process (or standalone Node process) executing scheduled social media publications.

---

## 2. Production Environment Setup

Copy `.env.example` to `.env` on your deployment server or configure environment variables in your cloud deployment dashboard (e.g. Render, Vercel, AWS App Runner).

### Essential Production Variables
- `NODE_ENV="production"`
- `PORT=4000`
- `WEB_URL="https://app.aisocialstudio.com"`
- `API_URL="https://api.aisocialstudio.com"`
- `NEXT_PUBLIC_API_URL="https://api.aisocialstudio.com"`
- `DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true"`
- `USER_CREDENTIAL_ENCRYPTION_KEY="[64-character-hex-key]"`

---

## 3. Database Deployment Procedure

Run database migrations using Prisma CLI without resetting existing production data:

```bash
# Generate Prisma Client
npx prisma generate --schema=packages/database/prisma/schema.prisma

# Deploy Database Migrations to Supabase PostgreSQL
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
```

> [!CAUTION]
> **NEVER** run `prisma migrate reset` or `prisma db push --force-reset` in production. Always use `prisma migrate deploy`.

---

## 4. Production Build Process

Execute full monorepo build:

```bash
# 1. Install dependencies
npm install

# 2. Build monorepo packages and apps
npm run build
```

The build command compiles:
1. `@ai-social/shared` → `packages/shared/dist`
2. `@ai-social/database` → `packages/database/dist`
3. `@ai-social/api` → `apps/api/dist`
4. `@ai-social/web` → `apps/web/.next`

---

## 5. API & Worker Deployment

Start the Express API server and publishing worker:

```bash
# Start production API server
npm run start --workspace=@ai-social/api
```

### Health Check Endpoint
Verify API health via load balancer or curl:
```bash
curl -f https://api.aisocialstudio.com/health
# Response: {"status":"ok","timestamp":"2026-08-26T15:10:00.000Z","version":"0.1.0","service":"AI Social Media Studio API"}
```

---

## 6. Web Application Deployment

Deploy the Next.js frontend build:

```bash
# Start production Web server
npm run start --workspace=@ai-social/web
```

---

## 7. Social OAuth Credentials Matrix

| Platform | Code Implementation | Credentials Status | Callback Route |
| :--- | :--- | :--- | :--- |
| **YouTube** | `READY` | Configuration Required | `/api/integrations/youtube/callback` |
| **Instagram** | `READY` | Configuration Required | `/api/integrations/instagram/callback` |
| **TikTok** | `READY` | Configuration Required | `/api/integrations/tiktok/callback` |
| **Facebook** | `READY` | Configuration Required | `/api/integrations/facebook/callback` |
| **LinkedIn** | `READY` | Configuration Required | `/api/integrations/linkedin/callback` |
| **X (Twitter)** | `READY` | Configuration Required | `/api/integrations/x/callback` |
| **Pinterest** | `READY` | Configuration Required | `/api/integrations/pinterest/callback` |
| **Threads** | `READY` | Configuration Required | `/api/integrations/threads/callback` |

---

## 8. Rollback Procedure

If a deployment fails:
1. Revert to previous Git release tag (`git checkout tags/vX.Y.Z`).
2. Re-run `npm run build`.
3. Restart API and Web services (`npm run start --workspace=@ai-social/api`, `npm run start --workspace=@ai-social/web`).

---

## 9. Security Checklist

- [x] HTTPS enforced on Web & API endpoints
- [x] CORS origin restricted to `ALLOWED_ORIGINS` / `WEB_URL` in production
- [x] `USER_CREDENTIAL_ENCRYPTION_KEY` 64-character hex key configured for BYOK encryption at rest
- [x] Server error stack traces suppressed in production API responses
- [x] Cookie flags set to `HttpOnly`, `SameSite=Lax`, and `Secure`
- [x] Zero raw API keys or passwords logged or exposed in UI
