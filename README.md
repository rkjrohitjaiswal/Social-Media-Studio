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
| **TikTok** | **IMPLEMENTED (REQUIRES TIKTOK CLIENT AUDIT FOR PUBLIC VISIBILITY)** | OAuth 2.0 (TikTok API v2) | Live Direct Post API v2 (`video.publish`) | Permission Guarded (`video.list`) |
| **YouTube** | **LIVE** | OAuth 2.0 (Google OAuth 2.0) | Live YouTube Data API v3 Upload | Live YouTube Data API v3 |
| **X** | **IMPLEMENTED** | OAuth 2.0 PKCE | Live X API v2 Posts + Image Upload | Permission / Plan Guarded |
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
5. **AI Quality Assessment Engine**: Multi-dimensional vision evaluation with scoring and feedback.
6. **Multi-Version Regeneration**: Version-tracked asset iterations with custom prompt adjustments and prompt history.
7. **Human Governance & Approval Inbox**: Multi-stage approval workflow with approval isolation.
8. **Instagram Production Integration**: Meta Graph API OAuth connection with AES-256-GCM encrypted token storage.
9. **LinkedIn Production Integration**: OAuth 2.0, live REST publishing, image upload, member/organization posting and token refresh.
10. **Threads Production Integration**: Meta OAuth, container publishing, status polling and insights analytics.
11. **Pinterest Production Integration**: API v5 OAuth, board discovery, image Pin publishing and analytics.
12. **Facebook Production Integration**: Graph API v25.0 OAuth, Page discovery, Page feed/photo publishing and insights.
13. **TikTok Production Integration**: Content Posting API v2 OAuth, Creator Info, Direct Post, AI-generated disclosure and analytics permission handling.
14. **YouTube Production Integration**: Google OAuth, multi-channel management, resumable video uploads, thumbnails, affiliate disclosure and analytics.
15. **X Production Integration**:
    - OAuth 2.0 Authorization Code with PKCE.
    - Encrypted access/refresh token storage and automatic refresh.
    - Multi-account workspace isolation through the existing SocialAccount service.
    - X API v2 text posting via `POST /2/tweets`.
    - X API v2 image upload via `/2/media/upload` and attachment through `POST /2/tweets`.
    - 280-character platform-specific caption enforcement.
    - Affiliate posts automatically receive `#ad #affiliate` disclosure tags when absent.
    - Real post metrics adapter using `public_metrics`, with truthful unavailable responses when the current X API plan does not expose metrics.
16. **Content Calendar & Automated Scheduler**: Universal background publishing dispatching through provider registry with idempotency, grace periods, and retry queues.

---

## 🐦 X Integration Setup

Create an application in the X Developer Portal and configure OAuth 2.0 User Authentication with the callback URL:

```text
http://localhost:3000/api/integrations/x/callback
```

Request these scopes:

```text
tweet.read tweet.write users.read offline.access media.write
```

Set the following environment variables:

```env
X_CLIENT_ID="your-x-client-id"
X_CLIENT_SECRET="your-x-client-secret"
X_REDIRECT_URI="http://localhost:3000/api/integrations/x/callback"
X_API_VERSION="v2"
```

The X integration uses the current X API v2 media upload flow rather than the deprecated v1.1 `media/upload.json` endpoint. X API access and rate/post caps depend on the developer plan attached to the application.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript (Strict Mode)
- **Database & ORM**: PostgreSQL & Prisma ORM v7
- **Background Queues & Workers**: Redis & BullMQ
- **Auth & Storage**: Supabase SSR Auth & Supabase Storage
- **Testing**: Vitest

---

## ⚡ Quick Start

```bash
npm install
npx prisma validate
npx prisma generate
npx prisma db push
npm run dev
npm test
```
