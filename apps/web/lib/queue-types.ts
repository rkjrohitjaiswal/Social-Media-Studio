import { SocialPlatform } from "@ai-social/shared";

export interface AccountState {
  id: string;
  username: string;
  status: "CONNECTED" | "DISCONNECTED" | "REAUTH_REQUIRED" | "ERROR";
  accountType?: string;
  connectedAt?: string;
}

export interface PublicationState {
  id: string;
  platform: SocialPlatform;
  status: "QUEUED" | "PROCESSING" | "PUBLISHED" | "FAILED" | "CANCELLED";
  publishedAt?: string;
  permalink?: string;
  errorMessage?: string;
  captionSnapshot?: string;
  hashtagsSnapshot?: string[];
  instagramMediaId?: string;
}

export interface ScheduledState {
  id: string;
  platform: SocialPlatform;
  scheduledFor: string;
  status: "DRAFT" | "SCHEDULED" | "PROCESSING" | "PUBLISHED" | "FAILED" | "CANCELLED";
  captionSnapshot?: string;
  socialCopyId?: string;
}

export interface QueueRunState {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "PARTIAL_FAILURE" | "FAILED" | "CANCELLED";
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  jobs?: QueueJobState[];
}

export interface QueueJobState {
  id: string;
  inputAssetId?: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  errorMessage?: string;
  generatedAsset?: Record<string, unknown>;
}

export interface QueueCopyVersionState {
  id: string;
  versionNumber: number;
  caption: string;
  hashtags: string[];
  cta: string;
  altText: string;
  createdAt: string;
}

export interface QueueCopyState {
  id: string;
  caption: string;
  hashtags: string[];
  cta: string;
  altText: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  generatedAssetId: string;
  currentVersionNumber?: number;
  versions?: QueueCopyVersionState[];
}

export interface QueueQualityState {
  id: string;
  overallScore: number;
  verdict: "PASS" | "REVIEW" | "FAIL";
  issues: string[];
  recommendations: string[];
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  referenceSimilarityScore?: number;
  brandConsistencyScore?: number;
  productFidelityScore?: number;
  lightingScore?: number;
}

export interface ReviewEventState {
  id: string;
  eventType: string;
  reviewerComment?: string;
  createdAt: string;
}

export interface AssetApprovalRecord {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  feedback?: string;
  createdAt: string;
  reviewStatus?: string;
}
