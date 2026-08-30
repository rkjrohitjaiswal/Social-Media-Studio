-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERATION_COMPLETED', 'GENERATION_FAILED', 'PUBLISH_SUCCESS', 'PUBLISH_FAILED', 'QUALITY_ALERT', 'APPROVAL_REQUEST', 'SYSTEM');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'UPLOADING', 'READY', 'PROCESSING', 'COMPLETED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaAssetType" AS ENUM ('REFERENCE', 'INPUT', 'GENERATED');

-- CreateEnum
CREATE TYPE "GenerationRunStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIAL_FAILURE', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GenerationJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SocialCopyStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "QualityAssessmentStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "QualityVerdict" AS ENUM ('PASS', 'REVIEW', 'FAIL');

-- CreateEnum
CREATE TYPE "ReviewEventType" AS ENUM ('QUALITY_COMPLETED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'IMAGE_REGENERATED', 'COPY_REGENERATED');

-- CreateEnum
CREATE TYPE "InstagramAccountStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'REAUTH_REQUIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "InstagramPublishStatus" AS ENUM ('QUEUED', 'PROCESSING', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScheduledPublicationStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PROCESSING', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InstagramErrorCategory" AS ENUM ('AUTHENTICATION', 'RATE_LIMIT', 'INVALID_MEDIA', 'PERMISSION', 'NETWORK', 'PROVIDER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'ANALYZING_REFERENCE', 'GENERATING_IMAGE', 'GENERATING_COPY', 'EVALUATING_QUALITY', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'LINKEDIN', 'THREADS', 'PINTEREST', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'X', 'REDDIT', 'TELEGRAM', 'BLUESKY', 'GOOGLE_BUSINESS', 'MASTODON', 'DISCORD');

-- CreateEnum
CREATE TYPE "SocialAccountStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'REAUTH_REQUIRED', 'ERROR', 'PENDING');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('AFFILIATE_PRODUCT', 'CERTIFICATION', 'TEACHING', 'PROJECT', 'PERSONAL_BRAND', 'ANNOUNCEMENT', 'GENERAL');

-- CreateEnum
CREATE TYPE "ApiProvider" AS ENUM ('OPENAI', 'GEMINI', 'ANTHROPIC', 'DEEPSEEK');

-- CreateEnum
CREATE TYPE "UsageAction" AS ENUM ('CONTENT_GENERATION');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO', 'ADVANCED', 'PREMIUM', 'BUSINESS');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('RAZORPAY', 'ADMIN_GRANT');

-- CreateEnum
CREATE TYPE "SubscriptionSource" AS ENUM ('RAZORPAY', 'ADMIN_GRANT');

-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('GRANT_SUBSCRIPTION', 'CHANGE_SUBSCRIPTION', 'REVOKE_SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "PaymentProviderType" AS ENUM ('RAZORPAY');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'REVIEWER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ApprovalWorkflowStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SCHEDULED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ApprovalAuditAction" AS ENUM ('SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarUrl" TEXT,
    "supabaseUid" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "message" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "entityType" TEXT,
    "entityId" TEXT,
    "actionUrl" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "logoStoragePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "logoStoragePath" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0B0C0E',
    "secondaryColor" TEXT NOT NULL DEFAULT '#F5F4F0',
    "accentColor" TEXT NOT NULL DEFAULT '#C5A059',
    "toneVoice" TEXT NOT NULL,
    "contentStyle" TEXT,
    "targetAudience" TEXT,
    "defaultCta" TEXT,
    "guidelines" TEXT,
    "website" TEXT,
    "instagramUsername" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "contentType" "ContentType",
    "targetAudience" TEXT,
    "campaignGoal" TEXT,
    "campaignMetadataJson" JSONB,
    "referenceAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "isReference" BOOLEAN NOT NULL DEFAULT false,
    "assetType" "MediaAssetType" NOT NULL DEFAULT 'INPUT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "GenerationRunStatus" NOT NULL DEFAULT 'QUEUED',
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "failedJobs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "generationRunId" TEXT NOT NULL,
    "inputAssetId" TEXT NOT NULL,
    "referenceAssetId" TEXT NOT NULL,
    "generatedAssetId" TEXT,
    "status" "GenerationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "openaiRequestId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "modelUsed" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialCopy" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "generationJobId" TEXT NOT NULL,
    "generatedAssetId" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cta" TEXT NOT NULL DEFAULT '',
    "altText" TEXT NOT NULL DEFAULT '',
    "status" "SocialCopyStatus" NOT NULL DEFAULT 'QUEUED',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "modelUsed" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SocialCopy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialCopyVersion" (
    "id" TEXT NOT NULL,
    "socialCopyId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "caption" TEXT NOT NULL,
    "hashtags" TEXT[],
    "cta" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialCopyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityAssessment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "generatedAssetId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "referenceSimilarityScore" INTEGER NOT NULL DEFAULT 0,
    "brandConsistencyScore" INTEGER NOT NULL DEFAULT 0,
    "compositionScore" INTEGER NOT NULL DEFAULT 0,
    "lightingScore" INTEGER NOT NULL DEFAULT 0,
    "productFidelityScore" INTEGER NOT NULL DEFAULT 0,
    "technicalQualityScore" INTEGER NOT NULL DEFAULT 0,
    "verdict" "QualityVerdict" NOT NULL DEFAULT 'REVIEW',
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "issues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "QualityAssessmentStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "modelUsed" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QualityAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "generatedAssetId" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" "ReviewEventType" NOT NULL,
    "reviewerComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'PROFESSIONAL',
    "accessTokenEncrypted" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "status" "InstagramAccountStatus" NOT NULL DEFAULT 'CONNECTED',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramPublication" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "generatedAssetId" TEXT NOT NULL,
    "socialCopyId" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "status" "InstagramPublishStatus" NOT NULL DEFAULT 'QUEUED',
    "instagramMediaId" TEXT,
    "instagramContainerId" TEXT,
    "captionSnapshot" TEXT NOT NULL,
    "hashtagsSnapshot" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ctaSnapshot" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "errorCategory" "InstagramErrorCategory",
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPublication" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "generatedAssetId" TEXT NOT NULL,
    "socialCopyId" TEXT,
    "instagramAccountId" TEXT,
    "instagramPublicationId" TEXT,
    "platform" "SocialPlatform" NOT NULL DEFAULT 'INSTAGRAM',
    "socialAccountId" TEXT,
    "platformContentId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" "ScheduledPublicationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "captionSnapshot" TEXT NOT NULL,
    "hashtagsSnapshot" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ctaSnapshot" TEXT NOT NULL DEFAULT '',
    "createdByUserId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "ScheduledPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "profileImageUrl" TEXT,
    "accountType" TEXT,
    "status" "SocialAccountStatus" NOT NULL DEFAULT 'CONNECTED',
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformContent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT,
    "assetId" TEXT,
    "platform" "SocialPlatform" NOT NULL,
    "socialAccountId" TEXT,
    "contentType" "ContentType" NOT NULL DEFAULT 'GENERAL',
    "caption" TEXT,
    "title" TEXT,
    "description" TEXT,
    "hashtagsJson" JSONB,
    "keywordsJson" JSONB,
    "cta" TEXT,
    "altText" TEXT,
    "destinationUrl" TEXT,
    "platformMetadataJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramMediaInsight" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "instagramPublicationId" TEXT NOT NULL,
    "instagramMediaId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "engagements" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rawMetricsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramMediaInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramAccountInsight" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "followerGrowth" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "profileViews" INTEGER NOT NULL DEFAULT 0,
    "websiteClicks" INTEGER NOT NULL DEFAULT 0,
    "totalLikes" INTEGER NOT NULL DEFAULT 0,
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "totalSaves" INTEGER NOT NULL DEFAULT 0,
    "totalShares" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rawMetricsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramAccountInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedAsset" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedAssetVersion" (
    "id" TEXT NOT NULL,
    "generatedAssetId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "promptUsed" TEXT NOT NULL,
    "stylePreset" TEXT,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "qualityReport" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedAssetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caption" (
    "id" TEXT NOT NULL,
    "generatedAssetId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "cta" TEXT,
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HashtagSet" (
    "id" TEXT NOT NULL,
    "generatedAssetId" TEXT NOT NULL,
    "hashtags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HashtagSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "generatedAssetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "generatedAssetId" TEXT,
    "userId" TEXT,
    "workspaceId" TEXT,
    "contentPlanItemId" TEXT,
    "platform" "SocialPlatform" NOT NULL DEFAULT 'INSTAGRAM',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedPost" (
    "id" TEXT NOT NULL,
    "scheduledPostId" TEXT,
    "generatedAssetId" TEXT,
    "platform" "SocialPlatform" NOT NULL DEFAULT 'INSTAGRAM',
    "externalPostId" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "publishedPostId" TEXT NOT NULL,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "savesCount" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "N8nIntegration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "webhookUrlEncrypted" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "secretEncrypted" TEXT NOT NULL,
    "eventFiltersJson" JSONB,
    "lastDeliveryAt" TIMESTAMP(3),
    "lastDeliveryStatus" TEXT,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "N8nIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "N8nWebhookDelivery" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "responseStatus" INTEGER,
    "responseBodyPreview" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "N8nWebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserApiCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "ApiProvider" NOT NULL DEFAULT 'OPENAI',
    "encryptedApiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserApiCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "freeCreditsTotal" INTEGER NOT NULL DEFAULT 10,
    "freeCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "permanentCreditsTotal" INTEGER NOT NULL DEFAULT 10,
    "permanentCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "monthlyCreditsAllowance" INTEGER NOT NULL DEFAULT 3,
    "monthlyCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "monthlyCycleStart" TIMESTAMP(3),
    "lastMonthlyReset" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL DEFAULT 'RAZORPAY',
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "subscriptionSource" "SubscriptionSource" NOT NULL DEFAULT 'RAZORPAY',
    "grantedByUserId" TEXT,
    "grantedAt" TIMESTAMP(3),
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'EXPIRED',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "previousPlan" TEXT,
    "newPlan" TEXT,
    "subscriptionSource" "SubscriptionSource" NOT NULL DEFAULT 'ADMIN_GRANT',
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "targetAudience" TEXT,
    "location" TEXT,
    "language" TEXT NOT NULL DEFAULT 'English',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "tone" TEXT,
    "personality" TEXT,
    "writingStyle" TEXT,
    "preferredVocabulary" TEXT,
    "wordsToAvoid" TEXT,
    "preferredCallToActionStyle" TEXT,
    "emojiPreference" TEXT,
    "hashtagStyle" TEXT,
    "logo" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "fontPreference" TEXT,
    "preferredContentTypes" TEXT,
    "preferredPlatforms" TEXT,
    "postingGoals" TEXT,
    "contentTopics" TEXT,
    "contentTopicsToAvoid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'EDITOR',
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contentTitle" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "previewUrl" TEXT,
    "status" "ApprovalWorkflowStatus" NOT NULL DEFAULT 'IN_REVIEW',
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "clientToken" TEXT NOT NULL,
    "contentPlanItemId" TEXT,
    "aiCampaignId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalAuditLog" (
    "id" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "action" "ApprovalAuditAction" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorRole" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "platform" TEXT NOT NULL DEFAULT 'INSTAGRAM',
    "contentType" TEXT NOT NULL DEFAULT 'Post',
    "structureJson" JSONB NOT NULL,
    "promptConfigJson" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentStrategy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "primaryGoal" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "industry" TEXT,
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "postingFrequency" TEXT,
    "contentPreferences" TEXT,
    "campaignInfo" TEXT,
    "strategyJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPillar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "purpose" TEXT,
    "targetAudience" TEXT,
    "recommendedPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contentTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "percentageAllocation" INTEGER NOT NULL DEFAULT 10,
    "color" TEXT NOT NULL DEFAULT '#c5a059',
    "icon" TEXT NOT NULL DEFAULT 'Layers',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPillar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "campaignId" TEXT,
    "title" TEXT NOT NULL,
    "planType" TEXT NOT NULL DEFAULT 'THIRTY_DAY',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "frequency" TEXT,
    "weeklyThemesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPlanItem" (
    "id" TEXT NOT NULL,
    "contentPlanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "pillarId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "platform" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "pillarName" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "objective" TEXT,
    "cta" TEXT,
    "suggestedPostingTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "aiRationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCampaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "productService" TEXT,
    "targetAudience" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budget" TEXT,
    "cta" TEXT,
    "offer" TEXT,
    "positioning" TEXT,
    "coreMessage" TEXT,
    "phasesJson" JSONB,
    "topicsJson" JSONB,
    "platformAdaptationsJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "dimension" TEXT NOT NULL,
    "patternObservation" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "performanceMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dataBasisJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "insightType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "relativeChangePercentage" DOUBLE PRECISION,
    "summary" TEXT NOT NULL,
    "what" TEXT,
    "why" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dataBasisJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trend" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'GENERAL',
    "region" TEXT NOT NULL DEFAULT 'GLOBAL',
    "source" TEXT NOT NULL DEFAULT 'EXTERNAL_PROVIDER',
    "sourceUrl" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observedAt" TIMESTAMP(3),
    "trendStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "relevanceScore" DOUBLE PRECISION,
    "sourceDataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendOpportunity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "trendId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommendedAngle" TEXT NOT NULL,
    "recommendedPlatform" TEXT NOT NULL,
    "recommendedFormat" TEXT NOT NULL,
    "recommendedCta" TEXT NOT NULL,
    "contentPillarId" TEXT,
    "what" TEXT,
    "why" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dataBasisJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseUid_key" ON "User"("supabaseUid");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_read_createdAt_idx" ON "notifications"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_workspaceId_idx" ON "notifications"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_referenceAssetId_key" ON "Campaign"("referenceAssetId");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_idx" ON "Campaign"("workspaceId");

-- CreateIndex
CREATE INDEX "Campaign_brandId_idx" ON "Campaign"("brandId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "MediaAsset_workspaceId_idx" ON "MediaAsset"("workspaceId");

-- CreateIndex
CREATE INDEX "MediaAsset_campaignId_idx" ON "MediaAsset"("campaignId");

-- CreateIndex
CREATE INDEX "MediaAsset_isReference_idx" ON "MediaAsset"("isReference");

-- CreateIndex
CREATE INDEX "MediaAsset_assetType_idx" ON "MediaAsset"("assetType");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationRun_idempotencyKey_key" ON "GenerationRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GenerationRun_workspaceId_idx" ON "GenerationRun"("workspaceId");

-- CreateIndex
CREATE INDEX "GenerationRun_campaignId_idx" ON "GenerationRun"("campaignId");

-- CreateIndex
CREATE INDEX "GenerationRun_status_idx" ON "GenerationRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJob_generatedAssetId_key" ON "GenerationJob"("generatedAssetId");

-- CreateIndex
CREATE INDEX "GenerationJob_workspaceId_idx" ON "GenerationJob"("workspaceId");

-- CreateIndex
CREATE INDEX "GenerationJob_campaignId_idx" ON "GenerationJob"("campaignId");

-- CreateIndex
CREATE INDEX "GenerationJob_generationRunId_idx" ON "GenerationJob"("generationRunId");

-- CreateIndex
CREATE INDEX "GenerationJob_status_idx" ON "GenerationJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJob_generationRunId_inputAssetId_key" ON "GenerationJob"("generationRunId", "inputAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialCopy_generationJobId_key" ON "SocialCopy"("generationJobId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialCopy_generatedAssetId_key" ON "SocialCopy"("generatedAssetId");

-- CreateIndex
CREATE INDEX "SocialCopy_workspaceId_idx" ON "SocialCopy"("workspaceId");

-- CreateIndex
CREATE INDEX "SocialCopy_campaignId_idx" ON "SocialCopy"("campaignId");

-- CreateIndex
CREATE INDEX "SocialCopy_status_idx" ON "SocialCopy"("status");

-- CreateIndex
CREATE INDEX "SocialCopy_approvalStatus_idx" ON "SocialCopy"("approvalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "SocialCopyVersion_socialCopyId_versionNumber_key" ON "SocialCopyVersion"("socialCopyId", "versionNumber");

-- CreateIndex
CREATE INDEX "QualityAssessment_workspaceId_idx" ON "QualityAssessment"("workspaceId");

-- CreateIndex
CREATE INDEX "QualityAssessment_campaignId_idx" ON "QualityAssessment"("campaignId");

-- CreateIndex
CREATE INDEX "QualityAssessment_generatedAssetId_idx" ON "QualityAssessment"("generatedAssetId");

-- CreateIndex
CREATE INDEX "QualityAssessment_status_idx" ON "QualityAssessment"("status");

-- CreateIndex
CREATE INDEX "QualityAssessment_verdict_idx" ON "QualityAssessment"("verdict");

-- CreateIndex
CREATE INDEX "ReviewEvent_workspaceId_idx" ON "ReviewEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "ReviewEvent_campaignId_idx" ON "ReviewEvent"("campaignId");

-- CreateIndex
CREATE INDEX "ReviewEvent_generatedAssetId_idx" ON "ReviewEvent"("generatedAssetId");

-- CreateIndex
CREATE INDEX "ReviewEvent_eventType_idx" ON "ReviewEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccount_instagramUserId_key" ON "InstagramAccount"("instagramUserId");

-- CreateIndex
CREATE INDEX "InstagramAccount_workspaceId_idx" ON "InstagramAccount"("workspaceId");

-- CreateIndex
CREATE INDEX "InstagramAccount_status_idx" ON "InstagramAccount"("status");

-- CreateIndex
CREATE INDEX "InstagramPublication_workspaceId_idx" ON "InstagramPublication"("workspaceId");

-- CreateIndex
CREATE INDEX "InstagramPublication_campaignId_idx" ON "InstagramPublication"("campaignId");

-- CreateIndex
CREATE INDEX "InstagramPublication_generatedAssetId_idx" ON "InstagramPublication"("generatedAssetId");

-- CreateIndex
CREATE INDEX "InstagramPublication_status_idx" ON "InstagramPublication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledPublication_instagramPublicationId_key" ON "ScheduledPublication"("instagramPublicationId");

-- CreateIndex
CREATE INDEX "ScheduledPublication_workspaceId_idx" ON "ScheduledPublication"("workspaceId");

-- CreateIndex
CREATE INDEX "ScheduledPublication_campaignId_idx" ON "ScheduledPublication"("campaignId");

-- CreateIndex
CREATE INDEX "ScheduledPublication_generatedAssetId_idx" ON "ScheduledPublication"("generatedAssetId");

-- CreateIndex
CREATE INDEX "ScheduledPublication_instagramAccountId_idx" ON "ScheduledPublication"("instagramAccountId");

-- CreateIndex
CREATE INDEX "ScheduledPublication_socialAccountId_idx" ON "ScheduledPublication"("socialAccountId");

-- CreateIndex
CREATE INDEX "ScheduledPublication_platformContentId_idx" ON "ScheduledPublication"("platformContentId");

-- CreateIndex
CREATE INDEX "ScheduledPublication_platform_idx" ON "ScheduledPublication"("platform");

-- CreateIndex
CREATE INDEX "ScheduledPublication_status_idx" ON "ScheduledPublication"("status");

-- CreateIndex
CREATE INDEX "ScheduledPublication_scheduledFor_idx" ON "ScheduledPublication"("scheduledFor");

-- CreateIndex
CREATE INDEX "ScheduledPublication_status_scheduledFor_idx" ON "ScheduledPublication"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "SocialAccount_workspaceId_idx" ON "SocialAccount"("workspaceId");

-- CreateIndex
CREATE INDEX "SocialAccount_platform_idx" ON "SocialAccount"("platform");

-- CreateIndex
CREATE INDEX "SocialAccount_status_idx" ON "SocialAccount"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_workspaceId_platform_externalAccountId_key" ON "SocialAccount"("workspaceId", "platform", "externalAccountId");

-- CreateIndex
CREATE INDEX "PlatformContent_workspaceId_idx" ON "PlatformContent"("workspaceId");

-- CreateIndex
CREATE INDEX "PlatformContent_campaignId_idx" ON "PlatformContent"("campaignId");

-- CreateIndex
CREATE INDEX "PlatformContent_platform_idx" ON "PlatformContent"("platform");

-- CreateIndex
CREATE INDEX "PlatformContent_approvalStatus_idx" ON "PlatformContent"("approvalStatus");

-- CreateIndex
CREATE INDEX "InstagramMediaInsight_workspaceId_idx" ON "InstagramMediaInsight"("workspaceId");

-- CreateIndex
CREATE INDEX "InstagramMediaInsight_instagramAccountId_idx" ON "InstagramMediaInsight"("instagramAccountId");

-- CreateIndex
CREATE INDEX "InstagramMediaInsight_instagramPublicationId_idx" ON "InstagramMediaInsight"("instagramPublicationId");

-- CreateIndex
CREATE INDEX "InstagramMediaInsight_instagramMediaId_idx" ON "InstagramMediaInsight"("instagramMediaId");

-- CreateIndex
CREATE INDEX "InstagramMediaInsight_periodStart_idx" ON "InstagramMediaInsight"("periodStart");

-- CreateIndex
CREATE INDEX "InstagramMediaInsight_periodEnd_idx" ON "InstagramMediaInsight"("periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramMediaInsight_instagramPublicationId_periodStart_key" ON "InstagramMediaInsight"("instagramPublicationId", "periodStart");

-- CreateIndex
CREATE INDEX "InstagramAccountInsight_workspaceId_idx" ON "InstagramAccountInsight"("workspaceId");

-- CreateIndex
CREATE INDEX "InstagramAccountInsight_instagramAccountId_idx" ON "InstagramAccountInsight"("instagramAccountId");

-- CreateIndex
CREATE INDEX "InstagramAccountInsight_periodStart_idx" ON "InstagramAccountInsight"("periodStart");

-- CreateIndex
CREATE INDEX "InstagramAccountInsight_periodEnd_idx" ON "InstagramAccountInsight"("periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccountInsight_instagramAccountId_periodStart_key" ON "InstagramAccountInsight"("instagramAccountId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedAsset_jobId_key" ON "GeneratedAsset"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedAsset_currentVersionId_key" ON "GeneratedAsset"("currentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledPost_generatedAssetId_key" ON "ScheduledPost"("generatedAssetId");

-- CreateIndex
CREATE INDEX "ScheduledPost_userId_idx" ON "ScheduledPost"("userId");

-- CreateIndex
CREATE INDEX "ScheduledPost_workspaceId_idx" ON "ScheduledPost"("workspaceId");

-- CreateIndex
CREATE INDEX "ScheduledPost_contentPlanItemId_idx" ON "ScheduledPost"("contentPlanItemId");

-- CreateIndex
CREATE INDEX "ScheduledPost_status_idx" ON "ScheduledPost"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledPost_contentPlanItemId_platform_scheduledAt_key" ON "ScheduledPost"("contentPlanItemId", "platform", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedPost_scheduledPostId_key" ON "PublishedPost"("scheduledPostId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedPost_generatedAssetId_key" ON "PublishedPost"("generatedAssetId");

-- CreateIndex
CREATE INDEX "N8nIntegration_workspaceId_idx" ON "N8nIntegration"("workspaceId");

-- CreateIndex
CREATE INDEX "N8nIntegration_isEnabled_idx" ON "N8nIntegration"("isEnabled");

-- CreateIndex
CREATE INDEX "N8nWebhookDelivery_workspaceId_idx" ON "N8nWebhookDelivery"("workspaceId");

-- CreateIndex
CREATE INDEX "N8nWebhookDelivery_integrationId_idx" ON "N8nWebhookDelivery"("integrationId");

-- CreateIndex
CREATE INDEX "N8nWebhookDelivery_eventType_idx" ON "N8nWebhookDelivery"("eventType");

-- CreateIndex
CREATE INDEX "N8nWebhookDelivery_status_idx" ON "N8nWebhookDelivery"("status");

-- CreateIndex
CREATE INDEX "N8nWebhookDelivery_nextAttemptAt_idx" ON "N8nWebhookDelivery"("nextAttemptAt");

-- CreateIndex
CREATE INDEX "N8nWebhookDelivery_createdAt_idx" ON "N8nWebhookDelivery"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "N8nWebhookDelivery_integrationId_eventId_key" ON "N8nWebhookDelivery"("integrationId", "eventId");

-- CreateIndex
CREATE INDEX "UserApiCredential_userId_idx" ON "UserApiCredential"("userId");

-- CreateIndex
CREATE INDEX "UserApiCredential_provider_idx" ON "UserApiCredential"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "UserApiCredential_userId_provider_key" ON "UserApiCredential"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "UserUsage_userId_key" ON "UserUsage"("userId");

-- CreateIndex
CREATE INDEX "UserUsage_userId_idx" ON "UserUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_subscriptionSource_idx" ON "Subscription"("subscriptionSource");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetUserId_idx" ON "AdminAuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_userId_key" ON "BrandProfile"("userId");

-- CreateIndex
CREATE INDEX "BrandProfile_userId_idx" ON "BrandProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvitation_token_key" ON "WorkspaceInvitation"("token");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_workspaceId_idx" ON "WorkspaceInvitation"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_token_idx" ON "WorkspaceInvitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_clientToken_key" ON "ApprovalRequest"("clientToken");

-- CreateIndex
CREATE INDEX "ApprovalRequest_workspaceId_idx" ON "ApprovalRequest"("workspaceId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_clientToken_idx" ON "ApprovalRequest"("clientToken");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_contentPlanItemId_idx" ON "ApprovalRequest"("contentPlanItemId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_aiCampaignId_idx" ON "ApprovalRequest"("aiCampaignId");

-- CreateIndex
CREATE INDEX "ApprovalAuditLog_approvalRequestId_idx" ON "ApprovalAuditLog"("approvalRequestId");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_provider_eventId_idx" ON "BillingWebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingWebhookEvent_provider_eventId_key" ON "BillingWebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE INDEX "Template_userId_idx" ON "Template"("userId");

-- CreateIndex
CREATE INDEX "Template_category_idx" ON "Template"("category");

-- CreateIndex
CREATE INDEX "Template_platform_idx" ON "Template"("platform");

-- CreateIndex
CREATE INDEX "SavedItem_userId_idx" ON "SavedItem"("userId");

-- CreateIndex
CREATE INDEX "SavedItem_itemType_idx" ON "SavedItem"("itemType");

-- CreateIndex
CREATE UNIQUE INDEX "SavedItem_userId_itemType_itemId_key" ON "SavedItem"("userId", "itemType", "itemId");

-- CreateIndex
CREATE INDEX "ContentStrategy_userId_idx" ON "ContentStrategy"("userId");

-- CreateIndex
CREATE INDEX "ContentStrategy_workspaceId_idx" ON "ContentStrategy"("workspaceId");

-- CreateIndex
CREATE INDEX "ContentPillar_userId_idx" ON "ContentPillar"("userId");

-- CreateIndex
CREATE INDEX "ContentPillar_workspaceId_idx" ON "ContentPillar"("workspaceId");

-- CreateIndex
CREATE INDEX "ContentPillar_isActive_idx" ON "ContentPillar"("isActive");

-- CreateIndex
CREATE INDEX "ContentPlan_userId_idx" ON "ContentPlan"("userId");

-- CreateIndex
CREATE INDEX "ContentPlan_workspaceId_idx" ON "ContentPlan"("workspaceId");

-- CreateIndex
CREATE INDEX "ContentPlan_campaignId_idx" ON "ContentPlan"("campaignId");

-- CreateIndex
CREATE INDEX "ContentPlanItem_contentPlanId_idx" ON "ContentPlanItem"("contentPlanId");

-- CreateIndex
CREATE INDEX "ContentPlanItem_userId_idx" ON "ContentPlanItem"("userId");

-- CreateIndex
CREATE INDEX "ContentPlanItem_workspaceId_idx" ON "ContentPlanItem"("workspaceId");

-- CreateIndex
CREATE INDEX "ContentPlanItem_date_idx" ON "ContentPlanItem"("date");

-- CreateIndex
CREATE INDEX "ContentPlanItem_status_idx" ON "ContentPlanItem"("status");

-- CreateIndex
CREATE INDEX "ContentPlanItem_platform_idx" ON "ContentPlanItem"("platform");

-- CreateIndex
CREATE INDEX "AiCampaign_userId_idx" ON "AiCampaign"("userId");

-- CreateIndex
CREATE INDEX "AiCampaign_workspaceId_idx" ON "AiCampaign"("workspaceId");

-- CreateIndex
CREATE INDEX "AiCampaign_status_idx" ON "AiCampaign"("status");

-- CreateIndex
CREATE INDEX "ContentPattern_userId_idx" ON "ContentPattern"("userId");

-- CreateIndex
CREATE INDEX "ContentPattern_workspaceId_idx" ON "ContentPattern"("workspaceId");

-- CreateIndex
CREATE INDEX "ContentPattern_dimension_idx" ON "ContentPattern"("dimension");

-- CreateIndex
CREATE INDEX "PerformanceInsight_userId_idx" ON "PerformanceInsight"("userId");

-- CreateIndex
CREATE INDEX "PerformanceInsight_workspaceId_idx" ON "PerformanceInsight"("workspaceId");

-- CreateIndex
CREATE INDEX "PerformanceInsight_insightType_idx" ON "PerformanceInsight"("insightType");

-- CreateIndex
CREATE INDEX "Trend_source_idx" ON "Trend"("source");

-- CreateIndex
CREATE INDEX "Trend_platform_idx" ON "Trend"("platform");

-- CreateIndex
CREATE INDEX "Trend_detectedAt_idx" ON "Trend"("detectedAt");

-- CreateIndex
CREATE INDEX "Trend_trendStatus_idx" ON "Trend"("trendStatus");

-- CreateIndex
CREATE INDEX "Trend_category_idx" ON "Trend"("category");

-- CreateIndex
CREATE INDEX "TrendOpportunity_userId_idx" ON "TrendOpportunity"("userId");

-- CreateIndex
CREATE INDEX "TrendOpportunity_workspaceId_idx" ON "TrendOpportunity"("workspaceId");

-- CreateIndex
CREATE INDEX "TrendOpportunity_trendId_idx" ON "TrendOpportunity"("trendId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_referenceAssetId_fkey" FOREIGN KEY ("referenceAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_generationRunId_fkey" FOREIGN KEY ("generationRunId") REFERENCES "GenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_inputAssetId_fkey" FOREIGN KEY ("inputAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_referenceAssetId_fkey" FOREIGN KEY ("referenceAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_generatedAssetId_fkey" FOREIGN KEY ("generatedAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialCopy" ADD CONSTRAINT "SocialCopy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialCopy" ADD CONSTRAINT "SocialCopy_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialCopy" ADD CONSTRAINT "SocialCopy_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialCopy" ADD CONSTRAINT "SocialCopy_generatedAssetId_fkey" FOREIGN KEY ("generatedAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialCopyVersion" ADD CONSTRAINT "SocialCopyVersion_socialCopyId_fkey" FOREIGN KEY ("socialCopyId") REFERENCES "SocialCopy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityAssessment" ADD CONSTRAINT "QualityAssessment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityAssessment" ADD CONSTRAINT "QualityAssessment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityAssessment" ADD CONSTRAINT "QualityAssessment_generatedAssetId_fkey" FOREIGN KEY ("generatedAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewEvent" ADD CONSTRAINT "ReviewEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewEvent" ADD CONSTRAINT "ReviewEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewEvent" ADD CONSTRAINT "ReviewEvent_generatedAssetId_fkey" FOREIGN KEY ("generatedAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramAccount" ADD CONSTRAINT "InstagramAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramPublication" ADD CONSTRAINT "InstagramPublication_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramPublication" ADD CONSTRAINT "InstagramPublication_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramPublication" ADD CONSTRAINT "InstagramPublication_generatedAssetId_fkey" FOREIGN KEY ("generatedAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramPublication" ADD CONSTRAINT "InstagramPublication_socialCopyId_fkey" FOREIGN KEY ("socialCopyId") REFERENCES "SocialCopy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramPublication" ADD CONSTRAINT "InstagramPublication_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPublication" ADD CONSTRAINT "ScheduledPublication_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPublication" ADD CONSTRAINT "ScheduledPublication_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPublication" ADD CONSTRAINT "ScheduledPublication_generatedAssetId_fkey" FOREIGN KEY ("generatedAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPublication" ADD CONSTRAINT "ScheduledPublication_socialCopyId_fkey" FOREIGN KEY ("socialCopyId") REFERENCES "SocialCopy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPublication" ADD CONSTRAINT "ScheduledPublication_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPublication" ADD CONSTRAINT "ScheduledPublication_instagramPublicationId_fkey" FOREIGN KEY ("instagramPublicationId") REFERENCES "InstagramPublication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPublication" ADD CONSTRAINT "ScheduledPublication_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPublication" ADD CONSTRAINT "ScheduledPublication_platformContentId_fkey" FOREIGN KEY ("platformContentId") REFERENCES "PlatformContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformContent" ADD CONSTRAINT "PlatformContent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformContent" ADD CONSTRAINT "PlatformContent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformContent" ADD CONSTRAINT "PlatformContent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformContent" ADD CONSTRAINT "PlatformContent_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramMediaInsight" ADD CONSTRAINT "InstagramMediaInsight_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramMediaInsight" ADD CONSTRAINT "InstagramMediaInsight_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramMediaInsight" ADD CONSTRAINT "InstagramMediaInsight_instagramPublicationId_fkey" FOREIGN KEY ("instagramPublicationId") REFERENCES "InstagramPublication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramAccountInsight" ADD CONSTRAINT "InstagramAccountInsight_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramAccountInsight" ADD CONSTRAINT "InstagramAccountInsight_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedAssetVersion" ADD CONSTRAINT "GeneratedAssetVersion_generatedAssetId_fkey" FOREIGN KEY ("generatedAssetId") REFERENCES "GeneratedAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caption" ADD CONSTRAINT "Caption_generatedAssetId_fkey" FOREIGN KEY ("generatedAssetId") REFERENCES "GeneratedAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HashtagSet" ADD CONSTRAINT "HashtagSet_generatedAssetId_fkey" FOREIGN KEY ("generatedAssetId") REFERENCES "GeneratedAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_generatedAssetId_fkey" FOREIGN KEY ("generatedAssetId") REFERENCES "GeneratedAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_generatedAssetId_fkey" FOREIGN KEY ("generatedAssetId") REFERENCES "GeneratedAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_contentPlanItemId_fkey" FOREIGN KEY ("contentPlanItemId") REFERENCES "ContentPlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedPost" ADD CONSTRAINT "PublishedPost_scheduledPostId_fkey" FOREIGN KEY ("scheduledPostId") REFERENCES "ScheduledPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedPost" ADD CONSTRAINT "PublishedPost_generatedAssetId_fkey" FOREIGN KEY ("generatedAssetId") REFERENCES "GeneratedAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_publishedPostId_fkey" FOREIGN KEY ("publishedPostId") REFERENCES "PublishedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "N8nIntegration" ADD CONSTRAINT "N8nIntegration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "N8nWebhookDelivery" ADD CONSTRAINT "N8nWebhookDelivery_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "N8nWebhookDelivery" ADD CONSTRAINT "N8nWebhookDelivery_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "N8nIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApiCredential" ADD CONSTRAINT "UserApiCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUsage" ADD CONSTRAINT "UserUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAuditLog" ADD CONSTRAINT "ApprovalAuditLog_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentStrategy" ADD CONSTRAINT "ContentStrategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPillar" ADD CONSTRAINT "ContentPillar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPlan" ADD CONSTRAINT "ContentPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPlanItem" ADD CONSTRAINT "ContentPlanItem_contentPlanId_fkey" FOREIGN KEY ("contentPlanId") REFERENCES "ContentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCampaign" ADD CONSTRAINT "AiCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPattern" ADD CONSTRAINT "ContentPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceInsight" ADD CONSTRAINT "PerformanceInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendOpportunity" ADD CONSTRAINT "TrendOpportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendOpportunity" ADD CONSTRAINT "TrendOpportunity_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend"("id") ON DELETE CASCADE ON UPDATE CASCADE;
