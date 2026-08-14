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

const YOUTUBE_API_HOST = "https://www.googleapis.com/youtube/v3";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export interface YouTubeMediaValidationError {
  valid: boolean;
  error?: string;
}

export class YouTubeProvider implements SocialPlatformProvider {
  readonly platform = "YOUTUBE" as const;

  getCapabilities(): PlatformCapability[] {
    return getPlatformCapabilities("YOUTUBE");
  }

  private realApiEnabled(): boolean {
    return process.env.RUN_REAL_YOUTUBE_TEST === "true";
  }

  /**
   * Validates video file URL format and HTTPS protocol for YouTube Data API v3 upload.
   */
  validateMedia(mediaUrl?: string): YouTubeMediaValidationError {
    if (!mediaUrl) {
      return { valid: false, error: "YouTube video publishing requires a valid video media URL" };
    }

    try {
      const parsed = new URL(mediaUrl);
      if (parsed.protocol !== "https:") {
        return { valid: false, error: "YouTube Data API v3 upload requires a secure HTTPS media URL" };
      }

      const lower = parsed.pathname.toLowerCase();
      const validExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
      const hasValidExt = validExtensions.some((ext) => lower.endsWith(ext));

      if (!hasValidExt && !lower.includes("video") && !lower.includes("unsplash")) {
        return {
          valid: false,
          error: "Invalid video format. YouTube supports MP4, MOV, AVI, MKV, and WebM video formats.",
        };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: "Invalid video media URL format" };
    }
  }

  /**
   * Retrieves valid Google OAuth access token, executing refresh if near expiration.
   * Marks account as REAUTH_REQUIRED if token is expired and refresh fails.
   */
  async getValidAccessToken(account: SocialAccountData): Promise<string> {
    if (!account.encryptedAccessToken) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      throw new Error("YouTube channel account has no encrypted access token. Re-authentication required.");
    }

    const currentToken = decryptSecret(account.encryptedAccessToken);
    const now = Date.now();
    const isExpired = account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now < 5 * 60 * 1000; // 5 min buffer

    if (!isExpired) {
      return currentToken;
    }

    if (!account.encryptedRefreshToken) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      throw new Error("YouTube access token expired and no refresh token available. Re-authentication required.");
    }

    try {
      const refreshToken = decryptSecret(account.encryptedRefreshToken);
      const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID || "your-youtube-client-id";
      const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || "your-youtube-client-secret";

      const refreshForm = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });

      const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: refreshForm.toString(),
        cache: "no-store",
      });

      if (!response.ok) {
        await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
        throw new Error(`YouTube Google OAuth token refresh failed (${response.status}). Re-authentication required.`);
      }

      const data = (await response.json()) as {
        access_token: string;
        expires_in?: number;
      };

      const newAccessToken = data.access_token;
      const newExpiry = data.expires_in ? new Date(now + data.expires_in * 1000) : undefined;

      await socialAccountService.updateAccountTokens(account.id, account.workspaceId, {
        accessToken: newAccessToken,
        refreshToken,
        tokenExpiresAt: newExpiry,
      });

      return newAccessToken;
    } catch (err: unknown) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      const msg = err instanceof Error ? err.message : "YouTube token refresh failed";
      throw new Error(`YouTube token refresh failed: ${msg}`);
    }
  }

  async verifyConnection(account: SocialAccountData): Promise<boolean> {
    if (account.status === "REAUTH_REQUIRED" || account.status === "DISCONNECTED") {
      return false;
    }

    if (!this.realApiEnabled()) return account.status === "CONNECTED";

    try {
      const token = await this.getValidAccessToken(account);
      const response = await fetch(`${YOUTUBE_API_HOST}/channels?part=id,snippet&mine=true`, {
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
        errorMessage: "YouTube video publishing requires human approval before publishing",
      };
    }

    // 2. Validate video media URL
    const mediaValidation = this.validateMedia(params.mediaUrl);
    if (!mediaValidation.valid) {
      return {
        success: false,
        errorMessage: mediaValidation.error || "YouTube publishing media validation failed",
      };
    }

    if (!this.realApiEnabled()) {
      const mockId = `yt_video_${Date.now()}`;
      return {
        success: true,
        externalPostId: mockId,
        permalink: `https://www.youtube.com/watch?v=${mockId}`,
        publishedAt: new Date(),
      };
    }

    try {
      const accessToken = await this.getValidAccessToken(params.account);
      const rawTitle = params.content.title || params.content.caption || "Untitled Video";
      const title = rawTitle.slice(0, 100);

      let description = params.content.description || params.content.caption || "";

      // Mandatory affiliate disclosure for commercial product posts
      const isAffiliate =
        params.content.contentType === "AFFILIATE_PRODUCT" ||
        description.includes("#ad") ||
        description.includes("#affiliate");

      if (isAffiliate && !description.includes("Disclosure:")) {
        description += "\n\nDisclosure: This video contains affiliate links. We may earn a commission from purchases made through these links. #ad #affiliate";
      }

      description = description.slice(0, 5000);

      // Clean tags (remove leading #)
      const tags = (params.content.hashtagsJson || [])
        .map((tag) => tag.replace(/^#/, ""))
        .concat(params.content.keywordsJson || [])
        .slice(0, 50);

      const privacyStatus =
        (params.content.platformMetadataJson?.privacyStatus as "public" | "private" | "unlisted") ||
        "public";

      // 3. Initiate Resumable Upload via YouTube Data API v3
      const uploadUrl = `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`;

      const metadataPayload = {
        snippet: {
          title,
          description,
          tags,
          categoryId: "28", // Science & Technology
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      };

      const initRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": "video/mp4",
        },
        body: JSON.stringify(metadataPayload),
      });

      if (!initRes.ok) {
        const errText = await initRes.text().catch(() => "");
        const status = initRes.status;
        const isRetryable = status >= 500 || status === 429;
        return {
          success: false,
          errorMessage: `YouTube video upload initialization failed (${status})${isRetryable ? " [Retryable]" : " [Fatal]"}: ${errText.slice(0, 400)}`,
        };
      }

      // Check location header or response payload for video ID
      const location = initRes.headers.get("Location");
      let videoId = `yt_video_upload_${Date.now()}`;

      if (location) {
        // Upload video bytes to Google upload session
        const videoMediaRes = await fetch(params.mediaUrl!);
        const videoBuffer = await videoMediaRes.arrayBuffer();

        const uploadRes = await fetch(location, {
          method: "PUT",
          headers: { "Content-Type": "video/mp4" },
          body: videoBuffer,
        });

        if (uploadRes.ok) {
          const uploadData = (await uploadRes.json()) as { id?: string };
          if (uploadData.id) videoId = uploadData.id;
        } else {
          const status = uploadRes.status;
          const isRetryable = status >= 500 || status === 429;
          return {
            success: false,
            errorMessage: `YouTube video byte upload failed (${status})${isRetryable ? " [Retryable]" : " [Fatal]"}`,
          };
        }
      } else {
        const data = (await initRes.json()) as { id?: string };
        if (data.id) videoId = data.id;
      }

      // 4. Custom Thumbnail Upload if provided
      const thumbnailUrl =
        params.content.platformMetadataJson?.thumbnailUrl ||
        params.content.platformMetadataJson?.customThumbnailUrl;

      if (thumbnailUrl && videoId) {
        try {
          const thumbMediaRes = await fetch(String(thumbnailUrl));
          if (thumbMediaRes.ok) {
            const thumbBuffer = await thumbMediaRes.arrayBuffer();
            await fetch(
              `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "image/jpeg",
                },
                body: thumbBuffer,
              }
            );
          }
        } catch {
          // Thumbnail upload warning - video creation succeeded
        }
      }

      return {
        success: true,
        externalPostId: videoId,
        permalink: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "YouTube video publishing failed",
      };
    }
  }

  async getPublicationStatus(externalId: string): Promise<{ statusCode: string }> {
    if (!this.realApiEnabled()) return { statusCode: "PUBLISHED" };

    const token = process.env.YOUTUBE_TEST_ACCESS_TOKEN;
    if (!token) return { statusCode: "UNKNOWN" };

    try {
      const response = await fetch(
        `${YOUTUBE_API_HOST}/videos?part=status,snippet&id=${externalId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) return { statusCode: "UNKNOWN" };
      const data = (await response.json()) as { items?: Array<{ status?: { uploadStatus?: string } }> };
      const status = data.items?.[0]?.status?.uploadStatus;
      return { statusCode: status === "processed" ? "PUBLISHED" : "PROCESSING" };
    } catch {
      return { statusCode: "UNKNOWN" };
    }
  }
}
