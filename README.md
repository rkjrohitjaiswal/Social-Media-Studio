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
| **Facebook** | **LIVE** | OAuth 2.0 (Meta Graph API v25.0) | Live Page Feed & Photo API | Live Page Insights API |
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
    - Pinterest API v5 OAuth 2.0 (`/api/integrations/pinterest/...`).
    - Board management & discovery endpoint (`/api/integrations/pinterest/boards`).
    - Direct Pin creation (`POST /v5/pins`) with destination URLs, searchable titles, rich descriptions, and alt text.
12. **Facebook Production Integration**:
    - **Meta Graph API v25.0 OAuth 2.0**: Endpoints at `/api/integrations/facebook/connect`, `/api/integrations/facebook/callback`, `/api/integrations/facebook/disconnect`.
    - **Page Management & Discovery**: Page lookup endpoint at `/api/integrations/facebook/pages` (`GET /v25.0/me/accounts`). Stores Page Access Token linked to external Page ID.
    - **Page Publishing**: Live text/link posts to `/v25.0/{page_id}/feed` and photo posts to `/v25.0/{page_id}/photos`.
    - **Content Archetypes**: Supports Affiliate Product (with mandatory disclosure `#ad`), Certification, Teaching/Masterclass, Project/Portfolio, Personal Brand, Announcement, and General Posts.
13. **Content Calendar & Automated Scheduler**: Universal background publishing dispatching through provider registry with idempotency, grace periods, and retry queues.

---

## 📘 Facebook Integration Setup & Developer Guide

### 1. Meta Developer Portal Setup
1. Log into [Meta for Developers](https://developers.facebook.com/).
2. Create an App of type **Business**.
3. Under **Facebook Login for Business**, configure OAuth Redirect URIs:
   - `http://localhost:3000/api/integrations/facebook/callback` (Local Development)
   - `https://yourdomain.com/api/integrations/facebook/callback` (Production)
4. Enable Permissions:
   - `pages_show_list`: Retrieve Facebook Pages managed by user (Standard Access for admins; Advanced Access required for general public users).
   - `pages_read_engagement`: Access Page engagement insights (Requires Meta App Review / Advanced Access).
   - `pages_manage_posts`: Publish text, photo, and link posts to Facebook Pages (Requires Meta App Review / Advanced Access).

### 2. Environment Variables
Add the following to `.env`:
```env
FACEBOOK_APP_ID="your-facebook-app-id"
FACEBOOK_APP_SECRET="your-facebook-app-secret"
FACEBOOK_REDIRECT_URI="http://localhost:3000/api/integrations/facebook/callback"
FACEBOOK_API_VERSION="v25.0"
```

### 3. Analytics & Scope Limitations
- Facebook Page Analytics (`FacebookAnalyticsAdapter`) queries `GET /v25.0/{post_id}/insights`.
- Requires `pages_read_engagement` scope. If permission is missing, the adapter returns a truthful `available: false` message without fabricating values.
- **Reels & Video Uploads**: Reels and video chunking uploads are not implemented in this milestone.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript (Strict Mode)
- **Database & ORM**: PostgreSQL & Prisma ORM v7
- **Background Queues & Workers**: Redis & BullMQ
- **Auth & Storage**: Supabase SSR Auth & Supabase Storage
- **Testing**: Vitest (181 unit, integration, and E2E tests)

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
