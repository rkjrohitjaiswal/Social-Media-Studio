import { SocialPlatform, SocialAccountStatus, ContentType, ApprovalStatus } from "@ai-social/database";

export { SocialPlatform, SocialAccountStatus, ContentType, ApprovalStatus };

export type PlatformCapability =
  | "IMAGE_POST"
  | "VIDEO"
  | "CAROUSEL"
  | "CAPTION"
  | "HASHTAGS"
  | "ALT_TEXT"
  | "SCHEDULING"
  | "TEXT"
  | "DOCUMENT"
  | "ARTICLE"
  | "PIN"
  | "TITLE"
  | "DESCRIPTION"
  | "DESTINATION_URL"
  | "BOARD"
  | "SHORT"
  | "TAGS"
  | "THUMBNAIL"
  | "PHOTO"
  | "HOOK"
  | "THREAD"
  | "SUBREDDIT"
  | "LINK";

export interface SocialAccountData {
  id: string;
  workspaceId: string;
  platform: SocialPlatform;
  externalAccountId: string;
  username?: string | null;
  displayName?: string | null;
  profileImageUrl?: string | null;
  accountType?: string | null;
  status: SocialAccountStatus;
  encryptedAccessToken?: string | null;
  encryptedRefreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  metadataJson?: Record<string, unknown> | null;
  connectedAt: Date;
  updatedAt: Date;
  createdAt: Date;
}

export interface PlatformContentData {
  id: string;
  workspaceId: string;
  campaignId?: string | null;
  assetId?: string | null;
  platform: SocialPlatform;
  socialAccountId?: string | null;
  contentType: ContentType;
  caption?: string | null;
  title?: string | null;
  description?: string | null;
  hashtagsJson?: string[] | null;
  keywordsJson?: string[] | null;
  cta?: string | null;
  altText?: string | null;
  destinationUrl?: string | null;
  platformMetadataJson?: Record<string, unknown> | null;
  status: string;
  approvalStatus: ApprovalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateContentData {
  productName: string;
  productUrl?: string;
  affiliateUrl?: string;
  category?: string;
  price?: number | string;
  currency?: string;
  keyFeatures?: string[];
  targetAudience?: string;
  disclosure?: string;
  brandName?: string;
}

export interface CertificationContentData {
  certificationName: string;
  issuingOrganization: string;
  completionDate?: string;
  skillsLearned?: string[];
  certificateUrl?: string;
  description?: string;
}

export type TeachingFormat =
  | "SINGLE_POST"
  | "CAROUSEL"
  | "THREAD"
  | "SHORT_VIDEO_SCRIPT"
  | "INFOGRAPHIC"
  | "TUTORIAL";

export interface TeachingContentData {
  topic: string;
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  learningObjective?: string;
  keyPoints?: string[];
  codeExample?: string;
  contentFormat?: TeachingFormat;
}

export interface GeneratePlatformContentInput {
  platform: SocialPlatform;
  contentType: ContentType;
  sourceData?: {
    affiliate?: AffiliateContentData;
    certification?: CertificationContentData;
    teaching?: TeachingContentData;
    general?: Record<string, unknown>;
  };
  brand?: {
    name: string;
    toneVoice?: string;
    targetAudience?: string;
    defaultCta?: string;
    website?: string;
  };
  assetUrl?: string;
}

export interface PublishParams {
  workspaceId: string;
  platform: SocialPlatform;
  account: SocialAccountData;
  content: PlatformContentData;
  mediaUrl?: string;
}

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  permalink?: string;
  errorMessage?: string;
  publishedAt?: Date;
  executionMode?: "REAL" | "SIMULATED" | "FAILED";
  simulationMode?: boolean;
}

export interface SocialPlatformProvider {
  platform: SocialPlatform;
  getCapabilities(): PlatformCapability[];
  verifyConnection(account: SocialAccountData): Promise<boolean>;
  publish(params: PublishParams): Promise<PublishResult>;
  getPublicationStatus?(externalId: string): Promise<{ statusCode: string }>;
}
