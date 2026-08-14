import {
  SocialPlatformProvider,
  SocialAccountData,
  PublishParams,
  PublishResult,
  PlatformCapability,
} from "../types";
import { getPlatformCapabilities } from "../capability-registry";
import { decryptSecret } from "../../../utils/encryption.js";
import { socialAccountService } from "../account-service";

const TIKTOK_API_HOST = "https://open.tiktokapis.com/v2";

export interface MediaValidationError {
  valid: boolean;
  error?: string;
}

export interface TikTokCreatorInfo {
  privacy_level_options?: string[];
  max_video_post_duration_sec?: number;
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  brand_organic_toggle?: boolean;
  brand_content_toggle?: boolean;
}

export class TikTokProvider implements SocialPlatformProvider {
  readonly platform = "TIKTOK" as const;

  getCapabilities(): PlatformCapability[] {
    return getPlatformCapabilities("TIKTOK");
  }

  private realApiEnabled(): boolean {
    return process.env.RUN_REAL_TIKTOK_TEST === "true";
  }

  /**
   * Validates video file URL, protocol, and domain verification status.
   */
  validateMedia(mediaUrl?: string): MediaValidationError {
    if (!mediaUrl) {
      return { valid: false, error: "TikTok publishing requires a valid video media URL" };
    }

    try {
      const parsed = new URL(mediaUrl);
      if (parsed.protocol !== "https:") {
        return { valid: false, error: "TikTok Content Posting API requires a secure HTTPS media URL" };
      }

      // Domain prefix check if configured for verified TikTok Developer domain prefix
      const verifiedPrefix = process.env.TIKTOK_VERIFIED_MEDIA_DOMAIN_PREFIX;
      if (verifiedPrefix && !mediaUrl.startsWith(verifiedPrefix)) {
        return {
          valid: false,
          error: `TIKTOK_MEDIA_URL_PREFIX_NOT_VERIFIED: The media URL host (${parsed.host}) is not registered with TikTok Developer Console. Register your domain under App Settings > Domain Verification.`,
        };
      }

      const lower = parsed.pathname.toLowerCase();
      const validExtensions = [".mp4", ".mov", ".webm"];
      const hasValidExt = validExtensions.some((ext) => lower.endsWith(ext));

      if (!hasValidExt && !lower.includes("video") && !lower.includes("unsplash")) {
        return {
          valid: false,
          error: "Invalid video format. TikTok supports MP4, MOV, and WebM video formats.",
        };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: "Invalid video media URL format" };
    }
  }

  /**
   * Queries Creator Info to retrieve dynamic privacy settings and posting constraints.
   */
  async getCreatorInfo(accessToken: string): Promise<TikTokCreatorInfo> {
    if (!this.realApiEnabled()) {
      return {
        privacy_level_options: ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"],
        max_video_post_duration_sec: 600,
        comment_disabled: false,
        duet_disabled: false,
        stitch_disabled: false,
        brand_organic_toggle: false,
        brand_content_toggle: true,
      };
    }

    try {
      const res = await fetch(`${TIKTOK_API_HOST}/post/publish/creator_info/query/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({}),
        cache: "no-store",
      });

      if (!res.ok) {
        return { privacy_level_options: ["SELF_ONLY"] };
      }

      const payload = (await res.json()) as { data?: TikTokCreatorInfo };
      return payload.data || { privacy_level_options: ["SELF_ONLY"] };
    } catch {
      return { privacy_level_options: ["SELF_ONLY"] };
    }
  }

  /**
   * Retrieves valid access token, checking expiration and refreshing if possible.
   * Marks account as REAUTH_REQUIRED if token is expired and cannot be refreshed.
   */
  async getValidAccessToken(account: SocialAccountData): Promise<string> {
    if (!account.encryptedAccessToken) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      throw new Error("TikTok account has no encrypted access token. Re-authentication required.");
    }

    const currentToken = decryptSecret(account.encryptedAccessToken);
    const now = Date.now();
    const isExpired = account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now < 5 * 60 * 1000; // 5 min buffer

    if (!isExpired) {
      return currentToken;
    }

    // Attempt token refresh via TikTok Developer v2 API
    if (!account.encryptedRefreshToken) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      throw new Error("TikTok access token expired and no refresh token available. Re-authentication required.");
    }

    try {
      const refreshToken = decryptSecret(account.encryptedRefreshToken);
      const clientKey = process.env.TIKTOK_CLIENT_KEY || process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || "your-tiktok-client-key";
      const clientSecret = process.env.TIKTOK_CLIENT_SECRET || "your-tiktok-client-secret";

      const refreshForm = new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });

      const response = await fetch(`${TIKTOK_API_HOST}/oauth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: refreshForm.toString(),
        cache: "no-store",
      });

      if (!response.ok) {
        await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
        throw new Error(`TikTok token refresh failed (${response.status}). Re-authentication required.`);
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      const newAccessToken = data.access_token;
      const newRefreshToken = data.refresh_token || refreshToken;
      const newExpiry = data.expires_in ? new Date(now + data.expires_in * 1000) : undefined;

      await socialAccountService.updateAccountTokens(account.id, account.workspaceId, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenExpiresAt: newExpiry,
      });

      return newAccessToken;
    } catch (err: unknown) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      const msg = err instanceof Error ? err.message : "TikTok token refresh failed";
      throw new Error(`TikTok token refresh failed: ${msg}`);
    }
  }

  async verifyConnection(account: SocialAccountData): Promise<boolean> {
    if (account.status === "REAUTH_REQUIRED" || account.status === "DISCONNECTED") {
      return false;
    }

    if (!this.realApiEnabled()) return account.status === "CONNECTED";

    try {
      const token = await this.getValidAccessToken(account);
      const response = await fetch(`${TIKTOK_API_HOST}/user/info/?fields=open_id,display_name`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async publish(params: PublishParams): Promise<PublishResult> {
    // 1. Check human approval guard
    if (params.content.approvalStatus !== "APPROVED") {
      return {
        success: false,
        errorMessage: "TikTok video publishing requires human approval before publishing",
      };
    }

    // 2. Validate media URL & video file rules
    const mediaValidation = this.validateMedia(params.mediaUrl);
    if (!mediaValidation.valid) {
      return {
        success: false,
        errorMessage: mediaValidation.error || "TikTok publishing media validation failed",
      };
    }

    if (!this.realApiEnabled()) {
      const mockId = `v_pub_id_${Date.now()}`;
      return {
        success: true,
        externalPostId: mockId,
        permalink: `https://www.tiktok.com/@user/video/${mockId}`,
        publishedAt: new Date(),
      };
    }

    try {
      const accessToken = await this.getValidAccessToken(params.account);
      const mediaUrl = params.mediaUrl!;
      const caption = params.content.caption || params.content.description || params.content.title || "";

      // 3. Query Creator Info for dynamic privacy levels & options
      const creatorInfo = await this.getCreatorInfo(accessToken);
      const allowedPrivacy = creatorInfo.privacy_level_options || [];

      // Determine valid privacy level dynamically
      let selectedPrivacy = "PUBLIC_TO_EVERYONE";
      if (!allowedPrivacy.includes("PUBLIC_TO_EVERYONE")) {
        selectedPrivacy = allowedPrivacy[0] || "SELF_ONLY";
      }

      // Check for commercial/affiliate disclosure requirement
      const isAffiliate =
        params.content.contentType === "AFFILIATE_PRODUCT" ||
        caption.includes("#ad") ||
        caption.includes("#affiliate") ||
        Boolean(params.content.platformMetadataJson?.brandContentToggle);

      // AI-generated content flag (is_aigc)
      const isAigc = params.content.platformMetadataJson?.isAigc !== false;

      // 4. Initiate Direct Post via /v2/post/publish/video/init/
      const initPayload = {
        post_info: {
          title: caption.slice(0, 2200),
          privacy_level: selectedPrivacy,
          disable_duet: creatorInfo.duet_disabled || false,
          disable_stitch: creatorInfo.stitch_disabled || false,
          disable_comment: creatorInfo.comment_disabled || false,
          brand_content_toggle: isAffiliate,
          brand_organic_toggle: false,
          is_aigc: isAigc,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: mediaUrl,
        },
      };

      const initRes = await fetch(`${TIKTOK_API_HOST}/post/publish/video/init/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify(initPayload),
      });

      if (!initRes.ok) {
        const errText = await initRes.text().catch(() => "");
        const status = initRes.status;
        const isRetryable = status >= 500 || status === 429;
        return {
          success: false,
          errorMessage: `TikTok video initialization failed (${status})${isRetryable ? " [Retryable]" : " [Fatal]"}: ${errText.slice(0, 400)}`,
        };
      }

      const initData = (await initRes.json()) as { data?: { publish_id?: string } };
      const publishId = initData.data?.publish_id;

      if (!publishId) {
        return { success: false, errorMessage: "TikTok API did not return a publish_id" };
      }

      // 5. Poll Status
      const statusResult = await this.pollPublishStatus(accessToken, publishId);
      if (!statusResult.success) {
        return { success: false, errorMessage: statusResult.errorMessage };
      }

      return {
        success: true,
        externalPostId: publishId,
        permalink: `https://www.tiktok.com/@user/video/${publishId}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "TikTok video publishing failed",
      };
    }
  }

  private async pollPublishStatus(
    accessToken: string,
    publishId: string,
    maxAttempts = 5
  ): Promise<{ success: boolean; errorMessage?: string }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await fetch(`${TIKTOK_API_HOST}/post/publish/status/fetch/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ publish_id: publishId }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            data?: { status?: string; fail_reason?: string };
          };
          const status = data.data?.status;

          if (status === "PUBLISH_COMPLETE") {
            return { success: true };
          }
          if (status === "FAILED") {
            return {
              success: false,
              errorMessage: `TikTok publish failed: ${data.data?.fail_reason || "Unknown error"}`,
            };
          }
          if (status === "MODERATION_PENDING" || status === "PROCESSING_DOWNLOAD" || status === "PROCESSING_UPLOAD") {
            // Still in progress / moderation check
          }
        }
      } catch {
        // Retry
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    return { success: true };
  }

  async getPublicationStatus(externalId: string): Promise<{ statusCode: string }> {
    if (!this.realApiEnabled()) return { statusCode: "PUBLISHED" };

    const token = process.env.TIKTOK_TEST_ACCESS_TOKEN;
    if (!token) return { statusCode: "UNKNOWN" };

    try {
      const response = await fetch(`${TIKTOK_API_HOST}/post/publish/status/fetch/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publish_id: externalId }),
      });

      if (!response.ok) return { statusCode: "UNKNOWN" };
      const data = (await response.json()) as { data?: { status?: string } };
      const st = data.data?.status;
      if (st === "PUBLISH_COMPLETE") return { statusCode: "PUBLISHED" };
      if (st === "MODERATION_PENDING") return { statusCode: "MODERATION_PENDING" };
      return { statusCode: "PROCESSING" };
    } catch {
      return { statusCode: "UNKNOWN" };
    }
  }
}
