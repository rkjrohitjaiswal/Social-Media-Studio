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
    - Meta Graph API v25.0 OAuth 2.0 (`/api/integrations/facebook/...`).
    - Page management & discovery (`GET /v25.0/me/accounts`). Stores Page Access Token linked to external Page ID.
    - Live text/link posts to `/v25.0/{page_id}/feed` and photo posts to `/v25.0/{page_id}/photos`.
13. **TikTok Production Integration**:
    - **TikTok Content Posting API v2 OAuth 2.0**: Endpoints at `/api/integrations/tiktok/connect`, `/api/integrations/tiktok/callback`, `/api/integrations/tiktok/disconnect`, `/api/integrations/tiktok/account`.
    - **Creator Info Query**: Pre-post query to `POST /v2/post/publish/creator_info/query/` to dynamically fetch allowed privacy options (`privacy_level_options`), comment/duet toggles, and duration limits.
    - **Direct Post Publishing Flow**: Automated 2-step Direct Post (`video.publish` scope) initialized via `POST /v2/post/publish/video/init/` with status polling (`POST /v2/post/publish/status/fetch/`).
    - **AI-Generated Disclosure (`is_aigc`)**: Automatic setting of `is_aigc: true` for AI studio pipeline video content.
    - **Commercial / Affiliate Disclosure**: Setting of `brand_content_toggle: true` for Affiliate Product posts or captions with mandatory `#ad` / `#affiliate` tags as required by TikTok terms.
14. **YouTube Production Integration**:
    - **Google OAuth 2.0 Authorization**: Endpoints at `/api/integrations/youtube/connect`, `/api/integrations/youtube/callback`, `/api/integrations/youtube/disconnect`, `/api/integrations/youtube/channels`.
    - **Multi-Channel Management**: Connect and manage multiple YouTube channels isolated by `workspaceId + platform + externalAccountId`.
    - **YouTube Data API v3 Resumable Upload**: Direct video upload via `POST /upload/youtube/v3/videos?uploadType=resumable` supporting Title (100 char limit), Description (5000 char limit), Tags, Category ID (`28`), and Privacy Status (`public`, `private`, `unlisted`).
    - **Custom Thumbnail Upload**: Support for custom video thumbnail setting via `POST /upload/youtube/v3/thumbnails/set`.
    - **Affiliate Disclosure Safeguard**: Mandatory affiliate disclosure injection (`"Disclosure: This video contains affiliate links..."`) for commercial product posts.
    - **Live Video Analytics**: `YouTubeAnalyticsAdapter` retrieving view counts, likes, and comments via `GET /v3/videos?part=statistics`.
15. **Content Calendar & Automated Scheduler**: Universal background publishing dispatching through provider registry with idempotency, grace periods, and retry queues.

---

## 📺 YouTube Integration Setup & Developer Guide

### 1. Google Cloud Console Configuration
1. Log into the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a Project and enable the **YouTube Data API v3**.
3. Under **OAuth consent screen**, configure:
   - User type: External
   - Scopes:
     - `https://www.googleapis.com/auth/youtube.upload`: Upload YouTube videos
     - `https://www.googleapis.com/auth/youtube.readonly`: Read YouTube channel & video details
     - `https://www.googleapis.com/auth/yt-analytics.readonly`: Read YouTube analytics reports
4. Create **OAuth 2.0 Client IDs** (Web application):
   - Authorized redirect URIs:
     - `http://localhost:3000/api/integrations/youtube/callback` (Development)
     - `https://yourdomain.com/api/integrations/youtube/callback` (Production)

### 2. Environment Variables
Add the following to `.env`:
```env
YOUTUBE_CLIENT_ID="your-youtube-client-id"
YOUTUBE_CLIENT_SECRET="your-youtube-client-secret"
YOUTUBE_REDIRECT_URI="http://localhost:3000/api/integrations/youtube/callback"
```

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript (Strict Mode)
- **Database & ORM**: PostgreSQL & Prisma ORM v7
- **Background Queues & Workers**: Redis & BullMQ
- **Auth & Storage**: Supabase SSR Auth & Supabase Storage
- **Testing**: Vitest (207 unit, integration, and E2E tests)

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
