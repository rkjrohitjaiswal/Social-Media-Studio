# AI Social Media Studio

> **Multi-Account, Multi-Platform AI Content Creation, Review, Scheduling, Publishing and Analytics Platform**

AI Social Media Studio is an enterprise-grade social content engine built with **Next.js (App Router)**, **TypeScript**, **Prisma**, **PostgreSQL**, **Redis / BullMQ**, and **Supabase Auth & Storage**. It turns single creative sources (product inputs, brand guidelines, achievements, or educational materials) into dedicated, platform-optimized social content across major global social networks.

---

## 🚀 Completed Milestones (Milestones 1–13)

This repository includes the complete implementation of **Milestones 1 through 13**:

1. **Brand Identity Engine**: Multiple brand personas, luxury visual anchors, tone of voice, guidelines, and custom CTA defaults.
2. **1:N Batch Asset Generation**: Multi-image product input processing with style-vector reference anchors.
3. **OpenAI Multi-Modal Integration**: Automated image generation & multi-aspect ratio processing with background execution.
4. **AI Social Copywriting Engine**: Multi-platform post copy, hashtag generation, CTAs, and alt text using structured OpenAI outputs.
5. **AI Quality Assessment Engine**: Multi-dimensional vision evaluation (lighting, style consistency, composition, product fidelity) with scoring and feedback.
6. **Multi-Version Regeneration**: Version-tracked asset iterations with custom prompt adjustments and prompt history.
7. **Human Governance & Approval Inbox**: Multi-stage approval workflow (`PENDING`, `APPROVED`, `CHANGES_REQUESTED`, `REJECTED`) with approval isolation.
8. **Instagram Account Management**: Meta Graph API OAuth connection with AES-256-GCM encrypted token storage.
9. **Direct Instagram Publishing**: Container creation, media publishing, status polling, and error categorization.
10. **Content Calendar & Automated Scheduler**: Cron worker scheduler with grace periods, idempotency, and timezone handling.
11. **Instagram Performance Intelligence**: Media & account insights, engagement rate computation, and analytics dashboards.
12. **n8n Webhook & Event Integration**: Fire-and-forget async webhook pipeline with HMAC-SHA256 signatures, retry exponential backoff, and delivery tracking.
13. **Multi-Platform Social Engine & Multi-Account Management**:
    - `SocialPlatformProvider` adapter architecture supporting 14 platforms (Instagram, LinkedIn, Threads, Pinterest, Facebook, TikTok, YouTube, X, Reddit, Telegram, Bluesky, Google Business, Mastodon, Discord).
    - Multi-account management per workspace (`workspaceId + platform + externalAccountId` isolation).
    - Specialized Content Archetypes: **Affiliate Product** (strict price/claim guardrails + mandatory `#ad` disclosure), **Certification**, **Teaching / Masterclass**, **Project / Portfolio**, **Personal Brand**, **Announcement**, and **General Post**.
    - Dedicated platform-specific AI prompt strategies and Zod validation rules.
    - Universal Calendar with platform/account filters and bulk scheduling.
    - Universal Publishing Service and Analytics Provider abstractions.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript (Strict Mode)
- **Database & ORM**: PostgreSQL & Prisma ORM v7
- **Background Queues & Workers**: Redis & BullMQ
- **Auth & Storage**: Supabase SSR Auth & Supabase Storage
- **Styling**: Vanilla CSS tokens & TailwindCSS utilities (Obsidian, Warm Ivory, Champagne Gold aesthetics)
- **Validation**: Zod
- **Testing**: Vitest (129 unit, integration, and E2E tests)

---

## 📁 Repository Structure

```
├── prisma/
│   ├── schema.prisma         # Complete PostgreSQL schema (14 platforms, accounts, campaigns, n8n)
│   └── config.ts             # Prisma configuration
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login, Signup, Forgot Password routes
│   │   ├── (marketing)/      # Public landing & pricing pages
│   │   ├── (studio)/         # Studio dashboard, Create, Campaigns, Review, Calendar, Analytics, Settings
│   │   └── api/              # RESTful API endpoints (Campaigns, Integrations, Analytics, n8n)
│   ├── components/
│   │   ├── icons/            # Platform & UI SVG icons
│   │   ├── layout/           # StudioLayout sidebar & navigation
│   │   └── studio/           # Bulk uploader, cards, modals
│   ├── lib/
│   │   ├── ai/               # OpenAI vision, image, and copy providers
│   │   ├── instagram/        # Legacy Meta Instagram Graph API providers
│   │   ├── integrations/     # n8n webhook event dispatcher & signature verification
│   │   ├── queue/            # BullMQ background workers (Generation, Scheduler, Webhooks)
│   │   ├── security/         # AES-256-GCM token encryption & HMAC signature helpers
│   │   ├── social-engine/    # Multi-Platform Engine (Providers, Strategies, Validation, Publishing, Accounts)
│   │   └── studio-context.tsx# React Studio Provider state
│   └── __tests__/            # Complete Vitest test suite (13 test files, 129 tests)
├── .env.example              # Environment variables template
├── eslint.config.mjs         # ESLint configuration
├── next.config.ts            # Next.js configuration
├── package.json              # Project dependencies & scripts
└── tsconfig.json             # TypeScript configuration
```

---

## ⚡ Quick Start & Local Development

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: Local instance or remote URL
- **Redis**: Local instance or remote URL
- **Supabase Account**: (Optional for local mock mode; required for live Auth/Storage)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/rkjrohitjaiswal/Social-Media-Studio.git
cd Social-Media-Studio

# Install dependencies
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in required credentials or use local development defaults.

### 4. Database Setup
```bash
# Validate Prisma schema
npx prisma validate

# Generate Prisma client
npx prisma generate

# Apply database migrations (or push schema)
npx prisma db push
```

### 5. Running the Application
```bash
# Start Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Quality Assurance

Run the complete test suite:
```bash
# Run all Vitest unit, integration, and E2E tests
npm test

# Run TypeScript type check
npx tsc --noEmit

# Run ESLint check
npm run lint

# Build production bundle
npm run build
```

### Opt-In Real API Testing
By default, all external network calls (OpenAI, Meta, LinkedIn, n8n, etc.) are mocked during test execution to prevent unauthenticated network calls. To opt into real API testing, enable the respective environment flags in `.env`:
```env
RUN_REAL_OPENAI_TEST="true"
RUN_REAL_INSTAGRAM_TEST="true"
RUN_REAL_LINKEDIN_TEST="true"
```

---

## 🔒 Security & Privacy

- **Token Encryption**: All access tokens and refresh tokens are encrypted at rest using AES-256-GCM (`INSTAGRAM_TOKEN_ENCRYPTION_KEY`). Plaintext secrets are **never** logged or returned to client applications.
- **Workspace Isolation**: Database relationships enforce workspace scoping across all accounts, campaigns, media assets, and scheduled publications.
- **n8n Webhook Security**: Webhook payloads are signed using HMAC-SHA256 with secret keys, timestamp tolerance verification, and automatic credential sanitization.

---

## 📄 License

This project is licensed under the MIT License.
