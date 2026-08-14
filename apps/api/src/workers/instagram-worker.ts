import { encryptToken, decryptToken } from "../utils/encryption.js";
import { InstagramProvider, MetaInstagramProvider } from "../integrations/instagram/provider";
import { dispatchN8nEvent } from "../integrations/n8n/event-dispatcher";

export interface AccountState {
  id: string;
  workspaceId: string;
  instagramUserId: string;
  username: string;
  accountType: string;
  accessTokenEncrypted: string;
  status: "CONNECTED" | "DISCONNECTED" | "REAUTH_REQUIRED" | "ERROR";
  connectedAt: string;
  updatedAt: string;
}

export interface PublicationState {
  id: string;
  workspaceId: string;
  campaignId: string;
  generatedAssetId: string;
  socialCopyId: string;
  instagramAccountId: string;
  status: "QUEUED" | "PROCESSING" | "PUBLISHED" | "FAILED" | "CANCELLED";
  instagramMediaId?: string;
  instagramContainerId?: string;
  captionSnapshot: string;
  hashtagsSnapshot: string[];
  ctaSnapshot: string;
  publishedAt?: string;
  errorCategory?: "AUTHENTICATION" | "RATE_LIMIT" | "INVALID_MEDIA" | "PERMISSION" | "NETWORK" | "PROVIDER" | "UNKNOWN";
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// In-Memory Account & Publication Store (Authoritative backup in PostgreSQL)
const accountsStore = new Map<string, AccountState>(); // workspaceId -> AccountState
const publicationsStore = new Map<string, PublicationState>(); // id -> PublicationState
const assetPublicationsMap = new Map<string, string[]>(); // generatedAssetId -> publicationIds[]

export function connectInstagramAccount(params: {
  workspaceId: string;
  instagramUserId: string;
  username: string;
  rawAccessToken: string;
}): AccountState {
  const encrypted = encryptToken(params.rawAccessToken);
  const account: AccountState = {
    id: `ig-acc-${Date.now()}`,
    workspaceId: params.workspaceId,
    instagramUserId: params.instagramUserId,
    username: params.username,
    accountType: "PROFESSIONAL",
    accessTokenEncrypted: encrypted,
    status: "CONNECTED",
    connectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  accountsStore.set(params.workspaceId, account);
  return account;
}

export function getConnectedInstagramAccount(workspaceId: string): AccountState | null {
  const acc = accountsStore.get(workspaceId);
  if (!acc || acc.status === "DISCONNECTED") return null;
  return acc;
}

export function disconnectInstagramAccount(workspaceId: string): boolean {
  const acc = accountsStore.get(workspaceId);
  if (!acc) return false;
  acc.status = "DISCONNECTED";
  acc.accessTokenEncrypted = "";
  acc.updatedAt = new Date().toISOString();
  return true;
}

export function composeFinalCaption(caption: string, cta: string, hashtags: string[]): string {
  const hashtagBlock = hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
  return `${caption}\n\n${cta}\n\n${hashtagBlock}`.trim();
}

export async function enqueueInstagramPublishJob(params: {
  workspaceId: string;
  campaignId: string;
  generatedAssetId: string;
  socialCopyId: string;
  caption: string;
  hashtags: string[];
  cta: string;
  approvalStatus: string;
  imageStatus: string;
  copyStatus: string;
  qualityStatus: string;
  imageUrl: string;
  simulateAuthError?: boolean;
  instagramProvider?: InstagramProvider;
}): Promise<PublicationState> {
  // APPROVAL GATING RULE: MUST pass all approval requirements
  if (
    params.approvalStatus !== "APPROVED" ||
    params.imageStatus !== "COMPLETED" ||
    params.copyStatus !== "COMPLETED" ||
    params.qualityStatus !== "COMPLETED"
  ) {
    throw new Error(
      "Publishing Rejected: Asset must have COMPLETED image, COMPLETED copy, COMPLETED quality analysis, and explicit APPROVED human status."
    );
  }

  const account = getConnectedInstagramAccount(params.workspaceId);
  if (!account || account.status !== "CONNECTED") {
    throw new Error("Publishing Rejected: No connected Instagram Professional account found for workspace.");
  }

  // IDEMPOTENCY CHECK: Prevent double-click active publications
  const existingPubIds = assetPublicationsMap.get(params.generatedAssetId) || [];
  for (const id of existingPubIds) {
    const existing = publicationsStore.get(id);
    if (existing && (existing.status === "QUEUED" || existing.status === "PROCESSING" || existing.status === "PUBLISHED")) {
      return existing;
    }
  }

  const pubId = `pub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const pubState: PublicationState = {
    id: pubId,
    workspaceId: params.workspaceId,
    campaignId: params.campaignId,
    generatedAssetId: params.generatedAssetId,
    socialCopyId: params.socialCopyId,
    instagramAccountId: account.id,
    status: "QUEUED",
    captionSnapshot: params.caption,
    hashtagsSnapshot: params.hashtags,
    ctaSnapshot: params.cta,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  publicationsStore.set(pubId, pubState);
  assetPublicationsMap.set(params.generatedAssetId, [...existingPubIds, pubId]);

  // Execute publishing asynchronously in worker queue
  executePublishWorkerJob(pubId, account, params);

  return pubState;
}

async function executePublishWorkerJob(
  pubId: string,
  account: AccountState,
  params: {
    imageUrl: string;
    caption: string;
    cta: string;
    hashtags: string[];
    simulateAuthError?: boolean;
    instagramProvider?: InstagramProvider;
  }
) {
  const pub = publicationsStore.get(pubId);
  if (!pub) return;

  pub.status = "PROCESSING";
  pub.updatedAt = new Date().toISOString();

  const provider = params.instagramProvider || new MetaInstagramProvider();

  try {
    if (params.simulateAuthError) {
      throw new Error("Meta Graph API error Code 190: Invalid OAuth access token");
    }
    const rawToken = decryptToken(account.accessTokenEncrypted);
    const finalCaption = composeFinalCaption(params.caption, params.cta, params.hashtags);

    // Step 1: Create Container
    const containerId = await provider.createMediaContainer({
      accessToken: rawToken,
      instagramUserId: account.instagramUserId,
      imageUrl: params.imageUrl,
      caption: finalCaption,
    });

    pub.instagramContainerId = containerId;

    // Step 2: Publish Container
    const mediaId = await provider.publishMediaContainer(
      rawToken,
      account.instagramUserId,
      containerId
    );

    pub.instagramMediaId = mediaId;
    pub.status = "PUBLISHED";
    pub.publishedAt = new Date().toISOString();
    pub.updatedAt = new Date().toISOString();

    dispatchN8nEvent({
      eventType: "instagram.published",
      workspaceId: pub.workspaceId,
      data: {
        campaignId: pub.campaignId,
        assetId: pub.generatedAssetId,
        instagramPublicationId: pub.id,
        instagramMediaId: mediaId,
        publishedAt: pub.publishedAt,
      },
    }).catch(() => {});
  } catch (err: unknown) {
    pub.status = "FAILED";
    const msg = err instanceof Error ? err.message : "Publishing failed";
    pub.errorMessage = msg;

    if (
      msg.includes("API error") ||
      msg.includes("Auth") ||
      msg.includes("Decryption failed") ||
      msg.includes("invalid") ||
      msg.includes("expired") ||
      msg.includes("190")
    ) {
      pub.errorCategory = "AUTHENTICATION";
      account.status = "REAUTH_REQUIRED";
    } else if (msg.includes("rate limit") || msg.includes("Rate")) {
      pub.errorCategory = "RATE_LIMIT";
    } else if (msg.includes("format") || msg.includes("Media")) {
      pub.errorCategory = "INVALID_MEDIA";
    } else {
      pub.errorCategory = "PROVIDER";
    }

    pub.updatedAt = new Date().toISOString();
  }
}

export function getPublicationsByCampaign(campaignId: string): PublicationState[] {
  return Array.from(publicationsStore.values()).filter((p) => p.campaignId === campaignId);
}

export function getAllPublications(): PublicationState[] {
  return Array.from(publicationsStore.values());
}

export function clearInstagramAccountStore(): void {
  accountsStore.clear();
  publicationsStore.clear();
  assetPublicationsMap.clear();
}

export function getPublicationByAsset(generatedAssetId: string): PublicationState | null {
  const ids = assetPublicationsMap.get(generatedAssetId) || [];
  if (ids.length === 0) return null;
  const latestId = ids[ids.length - 1];
  return publicationsStore.get(latestId) || null;
}
