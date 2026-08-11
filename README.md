# AI Social Media Studio

> **Multi-Account, Multi-Platform AI Content Creation, Review, Scheduling, Publishing and Analytics Platform**

AI Social Media Studio is an enterprise-grade social content engine built with **Next.js (App Router)**, **TypeScript**, **Prisma**, **PostgreSQL**, **Redis / BullMQ**, and **Supabase Auth & Storage**. It turns single creative sources (product inputs, brand guidelines, achievements, or educational materials) into dedicated, platform-optimized social content across major global social networks.

---

## 🌟 Platform Live / Stub Matrix

| Platform | Integration Status | Auth Flow | Publishing | Analytics |
| :--- | :--- | :--- | :--- | :--- |
| **Instagram** | **LIVE** | OAuth 2.0 (Meta Graph API) | Live Graph API | Live Insights API |
| **LinkedIn** | **LIVE** | OAuth 2.0 (LinkedIn REST API) | Live Posts & Image Upload API | Permission Guarded |
| **Threads** | **LIVE** | OAuth 2.0 (Meta Threads API) | Live 2-Step Container API | Live Insights API |
| **Pinterest** | **LIVE** | OAuth 2.0 (Pinterest API v5) | Live Image Pin & Board API | Permission Guarded |
| **Facebook** | **MOCK/STUB** | Stub Account Service | Mock Engine | Stub |
| **TikTok** | **MOCK/STUB** | Stub Account Service | Mock Engine | Stub |
| **YouTube** | **MOCK/STUB** | Stub Account Service | Mock Engine | Stub |
| **X (Twitter)** | **MOCK/STUB** | Stub Account Service | Mock Engine | Stub |
| **Reddit** | **MOCK/STUB** | Stub Account Service | Mock Engine | Stub |
| **Telegram** | **MOCK/STUB** | Stub Account Service | Mock Engine | Stub |
| **Bluesky** | **MOCK/STUB** | Stub Account Service | Mock Engine | Stub |
| **Google Business** | **MOCK/STUB** | Stub Account Service | Mock Engine | Stub |
| **Mastodon** | **MOCK/STUB** | Stub Account Service | Mock Engine | Stub |
| **Discord** | **MOCK/STUB** | Stub Account Service | Mock Engine | Stub |

---

## 🚀 Completed Implementation Features

1. **Brand Identity Engine**: Multiple brand personas, luxury visual anchors, tone of voice, guidelines, and custom CTA defaults.
2. **1:N Batch Asset Generation**: Multi-image product input processing with style-vector reference anchors.
3. **OpenAI Multi-Modal Integration**: Automated image generation & multi-aspect ratio processing with background execution.
4. **AI Social Copywriting Engine**: Multi-platform post copy, hashtag generation, CTAs, and alt text using structured OpenAI outputs.
5. **AI Quality Assessment Engine**: Multi-dimensional vision evaluation (lighting, style consistency, composition, product fidelity) with scoring and feedback.
6. **Multi-Version Regeneration**: Version-tracked asset iterations with custom prompt adjustments and prompt history.
7. **Human Governance & Approval Inbox**: Multi-stage approval workflow (`PENDING`, `APPROVED`, `CHANGES_REQUESTED`, `REJECTED`) with approval isolation.
8. **Instagram Production Integration**: Meta Graph API OAuth connection with AES-256-GCM encrypted token storage.
9. **LinkedIn Production Integration**:
   - OAuth 2.0 Authorization Code flow (`/api/integrations/linkedin/...`).
   - OpenID identity resolution (`https://api.linkedin.com/v2/userinfo`).
   - Live REST API v202604 post & image publishing with URN formatting and token refresh.
10. **Threads Production Integration**:
    - Meta Threads OAuth flow (`/api/integrations/threads/...`).
    - 2-Step container publishing (`POST /v1.0/{user_id}/threads` & `POST /v1.0/{user_id}/threads_publish`) with status polling.
    - Live insights analytics adapter (`GET /v1.0/{post_id}/threads_insights`).
11. **Pinterest Production Integration**:
    - **Pinterest API v5 OAuth 2.0**: Endpoints at `/api/integrations/pinterest/connect`, `/api/integrations/pinterest/callback`, `/api/integrations/pinterest/disconnect` using Basic Auth header token exchange.
    - **Board Management & Selection**: Board discovery endpoint at `/api/integrations/pinterest/boards` (`GET /v5/boards`). Automatic default board fallback and custom board assignment via `platformMetadataJson.boardId`.
    - **Image Pin Publishing**: Direct Pin creation (`POST /v5/pins`) with destination URLs (`link`), searchable titles (max 100 chars), rich descriptions (max 800 chars), and alt text (`alt_text`).
    - **Content Archetype Optimizations**:
      - **Affiliate Product**: Mandatory disclosure (`#ad #affiliate`), preserved affiliate destination URLs, strict non-fabrication of unverified prices/claims.
      - **Certification**: Clean visual achievement pins featuring credential URLs and issuing organizations.
      - **Teaching / Masterclass**: Tutorial titles, key educational objectives, guide URLs, and non-spam keyword tags.
      - **Project / Portfolio**: Project titles, tech stack keywords, and editorial portfolio links.
12. **Content Calendar & Automated Scheduler**: Universal background publishing dispatching through provider registry with idempotency, grace periods, and retry queues.

---

## 📌 Pinterest Integration Setup & Developer Guide

### 1. Pinterest Developer Console Configuration
1. Log into the [Pinterest Developer Console](https://developers.pinterest.com/).
2. Create an App under your Business account.
3. Under **OAuth Settings**, configure Redirect URIs:
   - `http://localhost:3000/api/integrations/pinterest/callback` (Local Development)
   - `https://yourdomain.com/api/integrations/pinterest/callback` (Production)
4. Enable App Scopes:
   - `user_accounts:read`: Read user profile
   - `boards:read`: Retrieve account boards
   - `boards:write`: Create or manage boards
   - `pins:read`: Access Pin metrics and details
   - `pins:write`: Create image Pins

### 2. Environment Variables
Add the following to `.env`:
```env
PINTEREST_APP_ID="your-pinterest-app-id"
PINTEREST_APP_SECRET="your-pinterest-app-secret"
PINTEREST_REDIRECT_URI="http://localhost:3000/api/integrations/pinterest/callback"
```

### 3. Analytics Limitations & Permissions
- Pinterest Analytics (`PinterestAnalyticsAdapter`) queries `GET /v5/pins/{pin_id}/analytics`.
- Requires `pins:read` scope approval. If permission is missing, the adapter returns a truthful `available: false` message without fabricating metrics.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript (Strict Mode)
- **Database & ORM**: PostgreSQL & Prisma ORM v7
- **Background Queues & Workers**: Redis & BullMQ
- **Auth & Storage**: Supabase SSR Auth & Supabase Storage
- **Testing**: Vitest (168 unit, integration, and E2E tests)

---

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Run database setup
npx prisma validate
npx prisma generate
npx prisma db push

# Start development server
npm run dev

# Run full test suite
npm test
```
