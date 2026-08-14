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

const X_API_HOST = "https://api.x.com/2";
const X_TOKEN_ENDPOINT = "https://api.x.com/2/oauth2/token";
const X_MEDIA_UPLOAD_HOST = "https://upload.x.com/1.1";

export interface XMediaValidationError {
  valid: boolean;
  error?: string;
}

export class XProvider implements SocialPlatformProvider {
  readonly platform = "X" as const;

  getCapabilities(): PlatformCapability[] {
    return getPlatformCapabilities("X");
  }

  private realApiEnabled(): boolean {
    return process.env.RUN_REAL_X_TEST === "true";
  }

  /**
   * Validates media URL protocol (HTTPS) and supported file formats for X (Twitter) media upload.
   */
  validateMedia(mediaUrl?: string): XMediaValidationError {
    if (!mediaUrl) {
      return { valid: true }; // Media is optional for X text posts
    }

    try {
      const parsed = new URL(mediaUrl);
      if (parsed.protocol !== "https:") {
        return { valid: false, error: "X (Twitter) media upload requires a secure HTTPS media URL" };
      }

      const lower = parsed.pathname.toLowerCase();
      const validExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".mov"];
      const hasValidExt = validExtensions.some((ext) => lower.endsWith(ext));

      if (!hasValidExt && !lower.includes("image") && !lower.includes("video") && !lower.includes("unsplash")) {
        return {
          valid: false,
          error: "Invalid media format. X supports PNG, JPG, WEBP, GIF images and MP4, MOV videos.",
        };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: "Invalid media URL format" };
    }
  }

  /**
   * Validates character length for standard X (Twitter) posts (max 280 characters).
   */
  validateTextLength(text: string): { valid: boolean; error?: string } {
    if (text.length > 280) {
      return {
        valid: false,
        error: `X post length exceeds character limit: ${text.length}/280 characters.`,
      };
    }
    return { valid: true };
  }

  /**
   * Retrieves a valid OAuth 2.0 access token for X.
   * Automatically refreshes expired tokens using OAuth 2.0 refresh_token grant.
   * Updates status to REAUTH_REQUIRED if re-authentication is needed.
   */
  async getValidAccessToken(account: SocialAccountData): Promise<string> {
    if (!account.encryptedAccessToken) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      throw new Error("X account has no encrypted access token. Re-authentication required.");
    }

    const currentToken = decryptSecret(account.encryptedAccessToken);
    const now = Date.now();
    const isExpired = account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now < 5 * 60 * 1000; // 5 min buffer

    if (!isExpired) {
      return currentToken;
    }

    if (!account.encryptedRefreshToken) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      throw new Error("X access token expired and no refresh token available. Re-authentication required.");
    }

    try {
      const refreshToken = decryptSecret(account.encryptedRefreshToken);
      const clientId = process.env.X_CLIENT_ID || process.env.NEXT_PUBLIC_X_CLIENT_ID || "your-x-client-id";
      const clientSecret = process.env.X_CLIENT_SECRET || "";

      const refreshForm = new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };

      if (clientSecret) {
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        headers["Authorization"] = `Basic ${authHeader}`;
      }

      const response = await fetch(X_TOKEN_ENDPOINT, {
        method: "POST",
        headers,
        body: refreshForm.toString(),
        cache: "no-store",
      });

      if (!response.ok) {
        await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
        throw new Error(`X OAuth 2.0 token refresh failed (${response.status}). Re-authentication required.`);
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
      const msg = err instanceof Error ? err.message : "X token refresh failed";
      throw new Error(`X token refresh failed: ${msg}`);
    }
  }

  async verifyConnection(account: SocialAccountData): Promise<boolean> {
    if (account.status === "REAUTH_REQUIRED" || account.status === "DISCONNECTED") {
      return false;
    }

    if (!this.realApiEnabled()) return account.status === "CONNECTED";

    try {
      const token = await this.getValidAccessToken(account);
      const response = await fetch(`${X_API_HOST}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async publish(params: PublishParams): Promise<PublishResult> {
    // 1. Human approval guard
    if (params.content.approvalStatus !== "APPROVED") {
      return {
        success: false,
        errorMessage: "X publishing requires human approval before publishing",
      };
    }

    // 2. Format caption and check character limit
    let caption = params.content.caption || params.content.description || params.content.title || "";

    // Mandatory affiliate disclosure for commercial product posts
    const isAffiliate =
      params.content.contentType === "AFFILIATE_PRODUCT" ||
      caption.includes("#ad") ||
      caption.includes("#affiliate");

    if (isAffiliate && !caption.includes("#ad") && !caption.includes("#affiliate")) {
      caption += "\n\n#ad #affiliate";
    }

    const textValidation = this.validateTextLength(caption);
    if (!textValidation.valid) {
      return {
        success: false,
        errorMessage: textValidation.error || "X post character limit exceeded",
      };
    }

    // 3. Validate media URL if provided
    const mediaValidation = this.validateMedia(params.mediaUrl);
    if (!mediaValidation.valid) {
      return {
        success: false,
        errorMessage: mediaValidation.error || "X publishing media validation failed",
      };
    }

    if (!this.realApiEnabled()) {
      const mockId = `x_tweet_${Date.now()}`;
      return {
        success: true,
        externalPostId: mockId,
        permalink: `https://x.com/user/status/${mockId}`,
        publishedAt: new Date(),
      };
    }

    try {
      const accessToken = await this.getValidAccessToken(params.account);
      const mediaIds: string[] = [];

      // 4. Upload media to X Media Upload API if mediaUrl is provided
      if (params.mediaUrl) {
        const mediaRes = await fetch(params.mediaUrl);
        if (!mediaRes.ok) {
          return { success: false, errorMessage: "Failed to download media for X upload" };
        }

        const mediaBuffer = await mediaRes.arrayBuffer();
        const formData = new FormData();
        formData.append("media", new Blob([mediaBuffer]));

        const uploadRes = await fetch(`${X_MEDIA_UPLOAD_HOST}/media/upload.json`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text().catch(() => "");
          const status = uploadRes.status;
          const isRetryable = status >= 500 || status === 429;
          return {
            success: false,
            errorMessage: `X media upload failed (${status})${isRetryable ? " [Retryable]" : " [Fatal]"}: ${errText.slice(0, 300)}`,
          };
        }

        const uploadData = (await uploadRes.json()) as { media_id_string?: string };
        if (uploadData.media_id_string) {
          mediaIds.push(uploadData.media_id_string);
        }
      }

      // 5. Create Tweet via X API v2 POST /2/tweets
      const tweetPayload: { text: string; media?: { media_ids: string[] } } = {
        text: caption,
      };

      if (mediaIds.length > 0) {
        tweetPayload.media = { media_ids: mediaIds };
      }

      const tweetRes = await fetch(`${X_API_HOST}/tweets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tweetPayload),
      });

      if (!tweetRes.ok) {
        const errText = await tweetRes.text().catch(() => "");
        const status = tweetRes.status;
        const isRetryable = status >= 500 || status === 429;
        return {
          success: false,
          errorMessage: `X tweet creation failed (${status})${isRetryable ? " [Retryable]" : " [Fatal]"}: ${errText.slice(0, 400)}`,
        };
      }

      const tweetData = (await tweetRes.json()) as { data?: { id?: string } };
      const tweetId = tweetData.data?.id || `x_tweet_${Date.now()}`;

      return {
        success: true,
        externalPostId: tweetId,
        permalink: `https://x.com/user/status/${tweetId}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "X tweet publishing failed",
      };
    }
  }

  async getPublicationStatus(externalId: string): Promise<{ statusCode: string }> {
    if (!this.realApiEnabled()) return { statusCode: "PUBLISHED" };

    const token = process.env.X_TEST_ACCESS_TOKEN;
    if (!token) return { statusCode: "UNKNOWN" };

    try {
      const response = await fetch(`${X_API_HOST}/tweets/${externalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return { statusCode: "UNKNOWN" };
      return { statusCode: "PUBLISHED" };
    } catch {
      return { statusCode: "UNKNOWN" };
    }
  }
}
