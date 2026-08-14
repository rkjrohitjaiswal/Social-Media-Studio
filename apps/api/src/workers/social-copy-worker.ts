import { AITextProvider, OpenAITextProvider, TextGenerationParams } from "../integrations/ai/text-provider";
import { dispatchN8nEvent } from "../integrations/n8n/event-dispatcher";

export interface QueueCopyState {
  id: string;
  workspaceId: string;
  campaignId: string;
  generationJobId: string;
  generatedAssetId: string;
  caption: string;
  hashtags: string[];
  cta: string;
  altText: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  currentVersionNumber: number;
  provider: string;
  modelUsed?: string;
  attempts: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  versions: Array<{
    id: string;
    versionNumber: number;
    caption: string;
    hashtags: string[];
    cta: string;
    altText: string;
    createdAt: string;
  }>;
}

// In-Memory Social Copy Store (Authoritative backup in PostgreSQL)
const copyStore = new Map<string, QueueCopyState>(); // copyId -> QueueCopyState
const assetCopyMap = new Map<string, string>(); // generatedAssetId -> copyId

export async function enqueueSocialCopyJob(params: {
  workspaceId: string;
  campaignId: string;
  generationJobId: string;
  generatedAssetId: string;
  brand: {
    name: string;
    description?: string | null;
    toneVoice: string;
    contentStyle?: string | null;
    targetAudience?: string | null;
    defaultCta?: string | null;
    guidelines?: string | null;
  };
  campaign: {
    name: string;
    description?: string | null;
  };
  inputFileName: string;
  textProvider?: AITextProvider;
}): Promise<QueueCopyState> {
  const existingCopyId = assetCopyMap.get(params.generatedAssetId);
  if (existingCopyId) {
    const existing = copyStore.get(existingCopyId);
    if (existing) return existing;
  }

  const copyId = `copy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const copyState: QueueCopyState = {
    id: copyId,
    workspaceId: params.workspaceId,
    campaignId: params.campaignId,
    generationJobId: params.generationJobId,
    generatedAssetId: params.generatedAssetId,
    caption: "",
    hashtags: [],
    cta: "",
    altText: "",
    status: "QUEUED",
    approvalStatus: "PENDING",
    currentVersionNumber: 1,
    provider: "openai",
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versions: [],
  };

  copyStore.set(copyId, copyState);
  assetCopyMap.set(params.generatedAssetId, copyId);

  // Execute processing asynchronously in worker queue
  executeCopyWorkerJob(copyId, params);

  return copyState;
}

async function executeCopyWorkerJob(
  copyId: string,
  params: {
    brand: {
      name: string;
      description?: string | null;
      toneVoice: string;
      contentStyle?: string | null;
      targetAudience?: string | null;
      defaultCta?: string | null;
      guidelines?: string | null;
    };
    campaign: {
      name: string;
      description?: string | null;
    };
    inputFileName: string;
    textProvider?: AITextProvider;
  }
) {
  const copyState = copyStore.get(copyId);
  if (!copyState) return;

  copyState.status = "PROCESSING";
  copyState.attempts += 1;
  copyState.updatedAt = new Date().toISOString();

  const provider = params.textProvider || new OpenAITextProvider();

  try {
    const textParams: TextGenerationParams = {
      brandName: params.brand.name,
      brandDescription: params.brand.description,
      toneVoice: params.brand.toneVoice,
      contentStyle: params.brand.contentStyle,
      targetAudience: params.brand.targetAudience,
      defaultCta: params.brand.defaultCta,
      guidelines: params.brand.guidelines,
      campaignName: params.campaign.name,
      campaignDescription: params.campaign.description,
      inputFileName: params.inputFileName,
    };

    const result = await provider.generateSocialCopy(textParams);

    copyState.caption = result.caption;
    copyState.hashtags = result.hashtags;
    copyState.cta = result.cta;
    copyState.altText = result.altText;
    copyState.modelUsed = result.model;
    copyState.status = "COMPLETED";
    copyState.completedAt = new Date().toISOString();
    copyState.updatedAt = new Date().toISOString();

    // Create Version 1 record
    const versionRecord = {
      id: `ver-${copyState.id}-1`,
      versionNumber: copyState.currentVersionNumber,
      caption: result.caption,
      hashtags: result.hashtags,
      cta: result.cta,
      altText: result.altText,
      createdAt: new Date().toISOString(),
    };

    copyState.versions = [versionRecord];

    dispatchN8nEvent({
      eventType: "social_copy.completed",
      workspaceId: copyState.workspaceId,
      data: {
        campaignId: copyState.campaignId,
        assetId: copyState.generatedAssetId,
        copyId: copyState.id,
      },
    }).catch(() => {});
  } catch (err: unknown) {
    copyState.status = "FAILED";
    copyState.errorMessage = err instanceof Error ? err.message : "Social copy generation failed";
    copyState.updatedAt = new Date().toISOString();
  }
}

export function getSocialCopiesByCampaign(campaignId: string): QueueCopyState[] {
  return Array.from(copyStore.values()).filter((c) => c.campaignId === campaignId);
}

export function getSocialCopyByAsset(generatedAssetId: string): QueueCopyState | null {
  const copyId = assetCopyMap.get(generatedAssetId);
  if (!copyId) return null;
  return copyStore.get(copyId) || null;
}

export function updateSocialCopyUserEdit(
  copyId: string,
  edits: { caption?: string; hashtags?: string[]; cta?: string; altText?: string }
): QueueCopyState | null {
  const copy = copyStore.get(copyId);
  if (!copy) return null;

  if (edits.caption !== undefined) copy.caption = edits.caption;
  if (edits.hashtags !== undefined) copy.hashtags = edits.hashtags;
  if (edits.cta !== undefined) copy.cta = edits.cta;
  if (edits.altText !== undefined) copy.altText = edits.altText;

  copy.updatedAt = new Date().toISOString();
  return copy;
}

export function updateSocialCopyApprovalStatus(
  copyId: string,
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED"
): QueueCopyState | null {
  const copy = copyStore.get(copyId);
  if (!copy) return null;

  copy.approvalStatus = approvalStatus;
  copy.updatedAt = new Date().toISOString();
  return copy;
}

export async function regenerateSocialCopyForAsset(
  generatedAssetId: string,
  textProvider?: AITextProvider
): Promise<QueueCopyState | null> {
  const copyId = assetCopyMap.get(generatedAssetId);
  if (!copyId) return null;

  const copyState = copyStore.get(copyId);
  if (!copyState) return null;

  const newVersionNum = copyState.currentVersionNumber + 1;
  const provider = textProvider || new OpenAITextProvider();

  try {
    const textParams: TextGenerationParams = {
      brandName: "Maison Lumière",
      toneVoice: "Editorial",
      contentStyle: "Luxury editorial",
      campaignName: "Campaign Social Copy",
      inputFileName: "product.jpg",
    };

    const result = await provider.generateSocialCopy(textParams);

    copyState.caption = result.caption;
    copyState.hashtags = result.hashtags;
    copyState.cta = result.cta;
    copyState.altText = result.altText;
    copyState.currentVersionNumber = newVersionNum;
    copyState.approvalStatus = "PENDING"; // Reset approval to PENDING / DRAFT on regeneration
    copyState.updatedAt = new Date().toISOString();

    const versionRecord = {
      id: `ver-${copyState.id}-${newVersionNum}`,
      versionNumber: newVersionNum,
      caption: result.caption,
      hashtags: result.hashtags,
      cta: result.cta,
      altText: result.altText,
      createdAt: new Date().toISOString(),
    };

    copyState.versions.push(versionRecord);
    return copyState;
  } catch (err: unknown) {
    copyState.errorMessage = err instanceof Error ? err.message : "Copy regeneration failed";
    return copyState;
  }
}
