import {
  AIImageQualityProvider,
  OpenAIImageQualityProvider,
  QualityAnalysisParams,
  QualityAssessmentResult,
} from "../integrations/ai/quality-provider";
import { dispatchN8nEvent } from "../integrations/n8n/event-dispatcher";
import { getUserOpenAIApiKey } from "../services/credential-resolver.js";
import { createNotification } from "../services/notification-service.js";

export interface QueueQualityState {
  id: string;
  workspaceId: string;
  campaignId: string;
  generatedAssetId: string;
  overallScore: number;
  referenceSimilarityScore: number;
  brandConsistencyScore: number;
  compositionScore: number;
  lightingScore: number;
  productFidelityScore: number;
  technicalQualityScore: number;
  verdict: "PASS" | "REVIEW" | "FAIL";
  strengths: string[];
  issues: string[];
  recommendations: string[];
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  provider: string;
  modelUsed?: string;
  attempts: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ReviewEventState {
  id: string;
  workspaceId: string;
  campaignId: string;
  generatedAssetId: string;
  userId?: string;
  eventType:
    | "QUALITY_COMPLETED"
    | "APPROVED"
    | "REJECTED"
    | "CHANGES_REQUESTED"
    | "IMAGE_REGENERATED"
    | "COPY_REGENERATED";
  reviewerComment?: string;
  createdAt: string;
}

export interface AssetApprovalRecord {
  generatedAssetId: string;
  campaignId: string;
  workspaceId: string;
  reviewStatus:
    | "GENERATING"
    | "COPY_PENDING"
    | "QUALITY_PENDING"
    | "READY_FOR_REVIEW"
    | "CHANGES_REQUESTED"
    | "APPROVED"
    | "REJECTED"
    | "READY_TO_PUBLISH";
  reviewerComment?: string;
}

// In-Memory Assessment & Review Event Store (Authoritative backup in PostgreSQL)
const qualityStore = new Map<string, QueueQualityState>(); // id -> assessment
const assetAssessmentsMap = new Map<string, string[]>(); // generatedAssetId -> assessmentIds[]
const reviewEventsStore: ReviewEventState[] = [];
const assetApprovalMap = new Map<string, AssetApprovalRecord>(); // generatedAssetId -> AssetApprovalRecord

export async function enqueueQualityAnalysisJob(params: {
  workspaceId: string;
  campaignId: string;
  userId?: string;
  generatedAssetId: string;
  generatedAssetPath: string;
  referenceAssetPath: string;
  inputAssetPath: string;
  brandName: string;
  toneVoice: string;
  campaignName: string;
  qualityProvider?: AIImageQualityProvider;
}): Promise<QueueQualityState> {
  const existingAssessmentIds = assetAssessmentsMap.get(params.generatedAssetId) || [];

  // Idempotency: Check if there is already an active pending/processing assessment
  for (const id of existingAssessmentIds) {
    const existing = qualityStore.get(id);
    if (existing && (existing.status === "QUEUED" || existing.status === "PROCESSING")) {
      return existing;
    }
  }

  const assessmentId = `qual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const assessmentState: QueueQualityState = {
    id: assessmentId,
    workspaceId: params.workspaceId,
    campaignId: params.campaignId,
    generatedAssetId: params.generatedAssetId,
    overallScore: 0,
    referenceSimilarityScore: 0,
    brandConsistencyScore: 0,
    compositionScore: 0,
    lightingScore: 0,
    productFidelityScore: 0,
    technicalQualityScore: 0,
    verdict: "REVIEW",
    strengths: [],
    issues: [],
    recommendations: [],
    status: "QUEUED",
    provider: "openai",
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  qualityStore.set(assessmentId, assessmentState);
  assetAssessmentsMap.set(params.generatedAssetId, [...existingAssessmentIds, assessmentId]);

  // Set initial asset review status
  if (!assetApprovalMap.has(params.generatedAssetId)) {
    assetApprovalMap.set(params.generatedAssetId, {
      generatedAssetId: params.generatedAssetId,
      campaignId: params.campaignId,
      workspaceId: params.workspaceId,
      reviewStatus: "QUALITY_PENDING",
    });
  }

  // Execute processing asynchronously in worker queue
  executeQualityWorkerJob(assessmentId, params);

  return assessmentState;
}

async function executeQualityWorkerJob(
  assessmentId: string,
  params: {
    workspaceId: string;
    campaignId: string;
    userId?: string;
    generatedAssetId: string;
    generatedAssetPath: string;
    referenceAssetPath: string;
    inputAssetPath: string;
    brandName: string;
    toneVoice: string;
    campaignName: string;
    qualityProvider?: AIImageQualityProvider;
  }
) {
  const assessment = qualityStore.get(assessmentId);
  if (!assessment) return;

  assessment.status = "PROCESSING";
  assessment.attempts += 1;
  assessment.updatedAt = new Date().toISOString();

  let provider = params.qualityProvider;
  if (!provider) {
    let apiKey: string | undefined;
    if (params.userId) {
      try {
        apiKey = await getUserOpenAIApiKey(params.userId);
      } catch {
        apiKey = process.env.OPENAI_API_KEY;
      }
    } else {
      apiKey = process.env.OPENAI_API_KEY;
    }
    provider = new OpenAIImageQualityProvider(apiKey);
  }

  try {
    const analysisParams: QualityAnalysisParams = {
      generatedAssetPath: params.generatedAssetPath,
      referenceAssetPath: params.referenceAssetPath,
      inputAssetPath: params.inputAssetPath,
      brandName: params.brandName,
      toneVoice: params.toneVoice,
      campaignName: params.campaignName,
    };

    const result: QualityAssessmentResult = await provider.analyzeImageQuality(analysisParams);

    assessment.overallScore = result.overallScore;
    assessment.referenceSimilarityScore = result.referenceSimilarityScore;
    assessment.brandConsistencyScore = result.brandConsistencyScore;
    assessment.compositionScore = result.compositionScore;
    assessment.lightingScore = result.lightingScore;
    assessment.productFidelityScore = result.productFidelityScore;
    assessment.technicalQualityScore = result.technicalQualityScore;
    assessment.verdict = result.verdict;
    assessment.strengths = result.strengths;
    assessment.issues = result.issues;
    assessment.recommendations = result.recommendations;
    assessment.modelUsed = result.model;
    assessment.status = "COMPLETED";
    assessment.completedAt = new Date().toISOString();
    assessment.updatedAt = new Date().toISOString();

    // Log QUALITY_COMPLETED Review Event
    reviewEventsStore.push({
      id: `rev-evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspaceId: params.workspaceId,
      campaignId: params.campaignId,
      generatedAssetId: params.generatedAssetId,
      eventType: "QUALITY_COMPLETED",
      reviewerComment: `Quality analysis completed with score ${result.overallScore}/100 (${result.verdict})`,
      createdAt: new Date().toISOString(),
    });

    // Update asset review status
    const approval = assetApprovalMap.get(params.generatedAssetId);
    if (approval && approval.reviewStatus === "QUALITY_PENDING") {
      approval.reviewStatus = "READY_FOR_REVIEW";
    }

    dispatchN8nEvent({
      eventType: "quality.completed",
      workspaceId: params.workspaceId,
      data: {
        campaignId: params.campaignId,
        assetId: params.generatedAssetId,
        qualityAssessmentId: assessment.id,
        overallScore: result.overallScore,
        verdict: result.verdict,
      },
    }).catch(() => {});

    if (params.userId && (result.verdict !== "PASS" || result.overallScore < 85)) {
      createNotification({
        userId: params.userId,
        workspaceId: params.workspaceId,
        type: "QUALITY_ALERT",
        title: `Quality Alert: ${result.overallScore}/100 (${result.verdict})`,
        message: `Asset in ${params.campaignName} scored ${result.overallScore}/100 and requires review.`,
        actionUrl: "/content-studio",
        entityType: "quality_assessment",
        entityId: assessment.id,
        metadata: { score: result.overallScore, verdict: result.verdict },
      });
    }
  } catch (err: unknown) {
    assessment.status = "FAILED";
    assessment.errorMessage = err instanceof Error ? err.message : "Quality analysis failed";
    assessment.updatedAt = new Date().toISOString();
  }
}

export function getLatestQualityAssessmentByAsset(generatedAssetId: string): QueueQualityState | null {
  const ids = assetAssessmentsMap.get(generatedAssetId) || [];
  if (ids.length === 0) return null;
  const latestId = ids[ids.length - 1];
  return qualityStore.get(latestId) || null;
}

export function getQualityAssessmentHistoryByAsset(generatedAssetId: string): QueueQualityState[] {
  const ids = assetAssessmentsMap.get(generatedAssetId) || [];
  return ids.map((id) => qualityStore.get(id)).filter(Boolean) as QueueQualityState[];
}

export function getReviewEventsByAsset(generatedAssetId: string): ReviewEventState[] {
  return reviewEventsStore.filter((evt) => evt.generatedAssetId === generatedAssetId);
}

export function getAssetApprovalRecord(generatedAssetId: string): AssetApprovalRecord | null {
  return assetApprovalMap.get(generatedAssetId) || null;
}

// Reviewer Actions
export function approveAsset(
  generatedAssetId: string,
  userId?: string
): AssetApprovalRecord | null {
  let approval = assetApprovalMap.get(generatedAssetId);
  if (!approval) {
    approval = {
      generatedAssetId,
      campaignId: "campaign-1",
      workspaceId: "workspace-1",
      reviewStatus: "APPROVED",
    };
    assetApprovalMap.set(generatedAssetId, approval);
  } else {
    approval.reviewStatus = "APPROVED";
  }

  reviewEventsStore.push({
    id: `rev-evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    workspaceId: approval.workspaceId,
    campaignId: approval.campaignId,
    generatedAssetId,
    userId,
    eventType: "APPROVED",
    reviewerComment: "Approved for publishing",
    createdAt: new Date().toISOString(),
  });

  dispatchN8nEvent({
    eventType: "review.approved",
    workspaceId: approval.workspaceId,
    data: {
      campaignId: approval.campaignId,
      assetId: generatedAssetId,
      reviewStatus: "APPROVED",
    },
  }).catch(() => {});

  return approval;
}

export function requestChangesOnAsset(
  generatedAssetId: string,
  reviewerComment: string,
  userId?: string
): AssetApprovalRecord | null {
  let approval = assetApprovalMap.get(generatedAssetId);
  if (!approval) {
    approval = {
      generatedAssetId,
      campaignId: "campaign-1",
      workspaceId: "workspace-1",
      reviewStatus: "CHANGES_REQUESTED",
      reviewerComment,
    };
    assetApprovalMap.set(generatedAssetId, approval);
  } else {
    approval.reviewStatus = "CHANGES_REQUESTED";
    approval.reviewerComment = reviewerComment;
  }

  reviewEventsStore.push({
    id: `rev-evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    workspaceId: approval.workspaceId,
    campaignId: approval.campaignId,
    generatedAssetId,
    userId,
    eventType: "CHANGES_REQUESTED",
    reviewerComment,
    createdAt: new Date().toISOString(),
  });

  dispatchN8nEvent({
    eventType: "review.changes_requested",
    workspaceId: approval.workspaceId,
    data: {
      campaignId: approval.campaignId,
      assetId: generatedAssetId,
      reviewStatus: "CHANGES_REQUESTED",
      reviewerComment,
    },
  }).catch(() => {});

  return approval;
}

export function rejectAsset(
  generatedAssetId: string,
  userId?: string
): AssetApprovalRecord | null {
  let approval = assetApprovalMap.get(generatedAssetId);
  if (!approval) {
    approval = {
      generatedAssetId,
      campaignId: "campaign-1",
      workspaceId: "workspace-1",
      reviewStatus: "REJECTED",
    };
    assetApprovalMap.set(generatedAssetId, approval);
  } else {
    approval.reviewStatus = "REJECTED";
  }

  reviewEventsStore.push({
    id: `rev-evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    workspaceId: approval.workspaceId,
    campaignId: approval.campaignId,
    generatedAssetId,
    userId,
    eventType: "REJECTED",
    reviewerComment: "Asset rejected",
    createdAt: new Date().toISOString(),
  });

  dispatchN8nEvent({
    eventType: "review.rejected",
    workspaceId: approval.workspaceId,
    data: {
      campaignId: approval.campaignId,
      assetId: generatedAssetId,
      reviewStatus: "REJECTED",
    },
  }).catch(() => {});

  return approval;
}
