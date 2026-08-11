# AI Social Media Studio

> **Multi-Account, Multi-Platform AI Content Creation, Review, Scheduling, Publishing and Analytics Platform**

AI Social Media Studio is an enterprise-grade social content engine built with **Next.js (App Router)**, **TypeScript**, **Prisma**, **PostgreSQL**, **Redis / BullMQ**, and **Supabase Auth & Storage**. It turns single creative sources (product inputs, brand guidelines, achievements, or educational materials) into dedicated, platform-optimized social content across major global social networks.

---

## 🌟 Platform Live / Stub Matrix

| Platform | Integration Status | Auth Flow | Publishing | Analytics |
| :--- | :--- | :--- | :--- | :--- |
| **Instagram** | **LIVE** | OAuth 2.0 (Meta Graph API) | Live Graph API | Live Insights API |
| **LinkedIn** | **LIVE** | OAuth 2.0 (LinkedIn REST API) | Live Posts & Image Upload API | Permission Guarded |
| **Threads** | **MOCK/STUB** | Stub Account Service | Mock Engine | Stub |
| **Pinterest** | **MOCK/STUB** | Stub Account Service | Mock Engine | Stub |
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
   - **OAuth 2.0 Authorization Flow**: Endpoints at `/api/integrations/linkedin/connect`, `/api/integrations/linkedin/callback`, `/api/integrations/linkedin/disconnect` with HMAC signed state CSRF protection.
   - **User Info Identity Resolution**: OpenID Connect identity retrieval (`https://api.linkedin.com/v2/userinfo`).
   - **Token Encryption & Automatic Refresh**: AES-256-GCM encrypted access and refresh token storage. Automatic token expiration detection and refresh exchange at `https://www.linkedin.com/oauth/v2/accessToken`. Automatic fallback to `REAUTH_REQUIRED` status when refresh tokens are revoked or expired.
   - **LinkedIn Posts API (REST API v202604)**: Direct text, image (`/rest/images?action=initializeUpload`), and article link publishing.
   - **Member & Organization Posting Guards**: Support for person (`urn:li:person:...`) and organization (`urn:li:organization:...`) posting with permission checks (`w_organization_social`).
10. **Content Calendar & Automated Scheduler**: Universal background publishing dispatching through provider registry with idempotency, grace periods, and retry queues.
11. **Content Archetypes**: **Affiliate Product** (strict claim guardrails + mandatory `#ad` disclosure), **Certification** (skills learned, issuing organization, credential links), **Teaching / Masterclass**, **Project / Portfolio**, **Personal Brand**, **Announcement**, and **General Post**.

---

## 🔑 LinkedIn Integration Setup & Developer Guide

### 1. LinkedIn Developer Portal Configuration
1. Log into the [LinkedIn Developer Portal](https://www.linkedin.com/developers/).
2. Create an App linked to your LinkedIn Page.
3. Under the **Products** tab, request access to:
   - **Sign In with LinkedIn using OpenID Connect**
   - **Share on LinkedIn**
   - **Community Management API** (for organization posting permissions)
4. Under **Auth Settings**, configure Redirect URIs:
   - `http://localhost:3000/api/integrations/linkedin/callback` (Local Development)
   - `https://yourdomain.com/api/integrations/linkedin/callback` (Production)

### 2. Environment Variables
Add the following to `.env`:
```env
LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"
LINKEDIN_REDIRECT_URI="http://localhost:3000/api/integrations/linkedin/callback"
LINKEDIN_API_VERSION="202604"
LINKEDIN_TOKEN_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

### 3. Required Permissions & Scopes
- `openid`: Basic profile authentication
- `profile`: Full name and profile picture URL
- `email`: Member email address
- `w_member_social`: Post on behalf of individual member profiles
- `w_organization_social`: Post on behalf of company pages (requires organization admin permissions)

### 4. Known LinkedIn API Approvals & Restrictions
- **Member vs Organization Posting**: Member posting works out of the box with standard Share scope. Organization posting requires the company page admin to grant access during OAuth consent.
- **Analytics Restrictions**: LinkedIn Analytics requires special product approval from LinkedIn for `r_organization_social` or `r_member_social_analytics`. The platform analytics adapter (`LinkedInAnalyticsAdapter`) returns a truthful permission-required state without fabricating metrics.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript (Strict Mode)
- **Database & ORM**: PostgreSQL & Prisma ORM v7
- **Background Queues & Workers**: Redis & BullMQ
- **Auth & Storage**: Supabase SSR Auth & Supabase Storage
- **Testing**: Vitest (143 unit, integration, and E2E tests)

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
