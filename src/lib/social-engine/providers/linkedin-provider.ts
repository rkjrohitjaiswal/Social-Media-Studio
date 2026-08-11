import { lookup } from "node:dns/promises";
import {
  SocialPlatformProvider,
  SocialAccountData,
  PublishParams,
  PublishResult,
  PlatformCapability,
} from "../types";
import { getPlatformCapabilities } from "../capability-registry";
import { decryptSecret } from "../../security/encryption";

const LINKEDIN_API = "https://api.linkedin.com";
const LINKEDIN_VERSION = process.env.LINKEDIN_API_VERSION || "202604";
const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

async function assertSafeRemoteUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("LinkedIn media URL is invalid");
  }

  if (url.protocol !== "https:") {
    throw new Error("LinkedIn media URL must use HTTPS");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "metadata.google.internal" || hostname === "169.254.169.254") {
    throw new Error("LinkedIn media URL points to a blocked host");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.some(({ address }) => isPrivateIpv4(address) || isPrivateIpv6(address))) {
    throw new Error("LinkedIn media URL resolves to a private network address");
  }

  return url;
}

function getAccessToken(account: SocialAccountData): string {
  if (!account.encryptedAccessToken) {
    throw new Error("LinkedIn account has no encrypted access token");
  }
  return decryptSecret(account.encryptedAccessToken);
}

function getAuthorUrn(account: SocialAccountData): string {
  const metadata = account.metadataJson;
  const metadataUrn = typeof metadata?.authorUrn === "string" ? metadata.authorUrn : undefined;
  if (metadataUrn?.startsWith("urn:li:")) return metadataUrn;
  if (account.externalAccountId.startsWith("urn:li:")) return account.externalAccountId;

  const type = (account.accountType || "MEMBER").toUpperCase();
  return type === "ORGANIZATION" || type === "PAGE"
    ? `urn:li:organization:${account.externalAccountId}`
    : `urn:li:person:${account.externalAccountId}`;
}

export class LinkedInProvider implements SocialPlatformProvider {
  readonly platform = "LINKEDIN" as const;

  getCapabilities(): PlatformCapability[] {
    return getPlatformCapabilities("LINKEDIN");
  }

  private realApiEnabled(): boolean {
    return process.env.RUN_REAL_LINKEDIN_TEST === "true";
  }

  private headers(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Linkedin-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    };
  }

  async verifyConnection(account: SocialAccountData): Promise<boolean> {
    if (!this.realApiEnabled()) return account.status === "CONNECTED";

    try {
      const response = await fetch(`${LINKEDIN_API}/v2/userinfo`, {
        headers: { Authorization: `Bearer ${getAccessToken(account)}` },
        cache: "no-store",
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async uploadImage(accessToken: string, ownerUrn: string, mediaUrl: string): Promise<string> {
    const sourceUrl = await assertSafeRemoteUrl(mediaUrl);
    const mediaResponse = await fetch(sourceUrl, { cache: "no-store" });
    if (!mediaResponse.ok) {
      throw new Error(`Unable to fetch LinkedIn media source (${mediaResponse.status})`);
    }

    const contentLength = Number(mediaResponse.headers.get("content-length") || "0");
    if (contentLength > MAX_MEDIA_BYTES) {
      throw new Error("LinkedIn image exceeds the 10 MB upload limit enforced by this integration");
    }

    const contentType = mediaResponse.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      throw new Error("LinkedIn image publishing requires an image media URL");
    }

    const bytes = new Uint8Array(await mediaResponse.arrayBuffer());
    if (bytes.byteLength > MAX_MEDIA_BYTES) {
      throw new Error("LinkedIn image exceeds the 10 MB upload limit enforced by this integration");
    }

    const initializeResponse = await fetch(`${LINKEDIN_API}/rest/images?action=initializeUpload`, {
      method: "POST",
      headers: this.headers(accessToken),
      body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } }),
    });
    if (!initializeResponse.ok) {
      throw new Error(`LinkedIn image initialization failed (${initializeResponse.status})`);
    }

    const initializePayload = (await initializeResponse.json()) as {
      value?: { uploadUrl?: string; image?: string };
    };
    const uploadUrl = initializePayload.value?.uploadUrl;
    const imageUrn = initializePayload.value?.image;
    if (!uploadUrl || !imageUrn) {
      throw new Error("LinkedIn image initialization returned an incomplete response");
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: bytes,
    });
    if (!uploadResponse.ok) {
      throw new Error(`LinkedIn image upload failed (${uploadResponse.status})`);
    }

    return imageUrn;
  }

  async publish(params: PublishParams): Promise<PublishResult> {
    if (params.content.approvalStatus !== "APPROVED") {
      return {
        success: false,
        errorMessage: "LinkedIn publishing requires human approval before publishing",
      };
    }

    if (!this.realApiEnabled()) {
      const mockId = `linkedin-post-${Date.now()}`;
      return {
        success: true,
        externalPostId: mockId,
        permalink: `https://www.linkedin.com/feed/update/${mockId}`,
        publishedAt: new Date(),
      };
    }

    try {
      const accessToken = getAccessToken(params.account);
      const author = getAuthorUrn(params.account);
      const commentary = params.content.caption?.trim() || params.content.description?.trim() || "";
      if (!commentary) {
        return { success: false, errorMessage: "LinkedIn post requires text content" };
      }

      const body: Record<string, unknown> = {
        author,
        commentary,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      };

      if (params.mediaUrl) {
        const imageUrn = await this.uploadImage(accessToken, author, params.mediaUrl);
        body.content = { media: { id: imageUrn } };
      }

      const response = await fetch(`${LINKEDIN_API}/rest/posts`, {
        method: "POST",
        headers: this.headers(accessToken),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        return {
          success: false,
          errorMessage: `LinkedIn publish failed (${response.status})${errorText ? `: ${errorText.slice(0, 500)}` : ""}`,
        };
      }

      const postId = response.headers.get("x-restli-id") || response.headers.get("X-RestLi-Id");
      if (!postId) {
        return { success: false, errorMessage: "LinkedIn published the post but did not return a post ID" };
      }

      return {
        success: true,
        externalPostId: postId,
        permalink: `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "LinkedIn publishing failed",
      };
    }
  }

  async getPublicationStatus(externalId: string): Promise<{ statusCode: string }> {
    if (!this.realApiEnabled()) return { statusCode: "PUBLISHED" };

    const encodedId = encodeURIComponent(externalId);
    const token = process.env.LINKEDIN_TEST_ACCESS_TOKEN;
    if (!token) return { statusCode: "UNKNOWN" };

    try {
      const response = await fetch(`${LINKEDIN_API}/rest/posts/${encodedId}`, {
        headers: this.headers(token),
        cache: "no-store",
      });
      if (!response.ok) return { statusCode: "UNKNOWN" };
      const payload = (await response.json()) as { lifecycleState?: string };
      return { statusCode: payload.lifecycleState || "UNKNOWN" };
    } catch {
      return { statusCode: "UNKNOWN" };
    }
  }
}
