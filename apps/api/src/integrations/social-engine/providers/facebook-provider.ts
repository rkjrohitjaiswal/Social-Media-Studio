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

const FACEBOOK_API_HOST = "https://graph.facebook.com";

export interface FacebookPageItem {
  id: string;
  name: string;
  category?: string;
  access_token?: string;
}

export class FacebookProvider implements SocialPlatformProvider {
  readonly platform = "FACEBOOK" as const;

  getCapabilities(): PlatformCapability[] {
    return getPlatformCapabilities("FACEBOOK");
  }

  private getApiVersion(): string {
    return process.env.FACEBOOK_API_VERSION || "v25.0";
  }

  private realApiEnabled(): boolean {
    return process.env.RUN_REAL_FACEBOOK_TEST === "true";
  }

  /**
   * Retrieves valid Page access token, checking expiration and renewing via user token if needed.
   * Marks account as REAUTH_REQUIRED if token is revoked or user authorization is invalid.
   */
  async getValidAccessToken(account: SocialAccountData): Promise<string> {
    if (!account.encryptedAccessToken) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      throw new Error("Facebook account has no encrypted access token. Re-authentication required.");
    }

    const currentToken = decryptSecret(account.encryptedAccessToken);
    const now = Date.now();
    const isExpired = account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now < 5 * 60 * 1000; // 5 min buffer

    if (!isExpired) {
      return currentToken;
    }

    // Attempt user long-lived token exchange via Meta Graph API if expired
    if (!account.encryptedRefreshToken) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      throw new Error("Facebook access token expired and no user refresh token available. Re-authentication required.");
    }

    try {
      const userLongLivedToken = decryptSecret(account.encryptedRefreshToken);
      const appId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "your-facebook-app-id";
      const appSecret = process.env.FACEBOOK_APP_SECRET || "your-facebook-app-secret";
      const version = this.getApiVersion();

      const refreshUrl = `${FACEBOOK_API_HOST}/${version}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(
        appId
      )}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(
        userLongLivedToken
      )}`;

      const response = await fetch(refreshUrl, { cache: "no-store" });
      if (!response.ok) {
        await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
        throw new Error(`Facebook token refresh failed (${response.status}). Re-authentication required.`);
      }

      const data = (await response.json()) as { access_token: string; expires_in?: number };
      const newAccessToken = data.access_token;
      const newExpiry = new Date(now + (data.expires_in || 60 * 86400) * 1000);

      await socialAccountService.updateAccountTokens(account.id, account.workspaceId, {
        accessToken: newAccessToken,
        refreshToken: userLongLivedToken,
        tokenExpiresAt: newExpiry,
      });

      return newAccessToken;
    } catch (err: unknown) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      const msg = err instanceof Error ? err.message : "Facebook token refresh failed";
      throw new Error(`Facebook token refresh failed: ${msg}`);
    }
  }

  async verifyConnection(account: SocialAccountData): Promise<boolean> {
    if (account.status === "REAUTH_REQUIRED" || account.status === "DISCONNECTED") {
      return false;
    }

    if (!this.realApiEnabled()) return account.status === "CONNECTED";

    try {
      const token = await this.getValidAccessToken(account);
      const version = this.getApiVersion();
      const pageId = account.externalAccountId;
      const response = await fetch(`${FACEBOOK_API_HOST}/${version}/${pageId}?fields=id,name&access_token=${token}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const errJson = (await response.json().catch(() => ({}))) as { error?: { code?: number } };
        // OAuth code 190 = Access Token Invalid / Revoked
        if (response.status === 401 || errJson.error?.code === 190 || errJson.error?.code === 102) {
          await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
        }
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetches available Facebook Pages for a connected user/account.
   */
  async getPages(account: SocialAccountData): Promise<FacebookPageItem[]> {
    if (!this.realApiEnabled()) {
      return [
        { id: "fb-page-9988", name: "Innovators Facebook Page", category: "Technology Company" },
        { id: "fb-page-7766", name: "Brand Official Community", category: "Community" },
      ];
    }

    try {
      const token = await this.getValidAccessToken(account);
      const version = this.getApiVersion();
      const res = await fetch(`${FACEBOOK_API_HOST}/${version}/me/accounts?access_token=${token}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Facebook Pages fetch failed (${res.status})`);
      }

      const data = (await res.json()) as { items?: FacebookPageItem[]; data?: FacebookPageItem[] };
      return data.data || data.items || [];
    } catch {
      return [{ id: account.externalAccountId, name: account.displayName || account.username || "Facebook Page", category: "Business Page" }];
    }
  }

  async publish(params: PublishParams): Promise<PublishResult> {
    // 1. Check human approval guard
    if (params.content.approvalStatus !== "APPROVED") {
      return {
        success: false,
        errorMessage: "Facebook Page publishing requires human approval before publishing",
      };
    }

    if (!this.realApiEnabled()) {
      const mockId = `fb-post-${Date.now()}`;
      return {
        success: true,
        externalPostId: mockId,
        permalink: `https://www.facebook.com/${mockId}`,
        publishedAt: new Date(),
      };
    }

    try {
      const pageAccessToken = await this.getValidAccessToken(params.account);
      const pageId = params.account.externalAccountId;
      const version = this.getApiVersion();

      const caption =
        params.content.caption ||
        params.content.description ||
        params.content.title ||
        "";
      const mediaUrl = params.mediaUrl;
      const link = params.content.destinationUrl || undefined;

      let publishRes: Response;

      if (mediaUrl) {
        // Image Post to /{version}/{page_id}/photos
        const photoParams = new URLSearchParams({
          url: mediaUrl,
          caption,
          access_token: pageAccessToken,
        });

        publishRes = await fetch(`${FACEBOOK_API_HOST}/${version}/${pageId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: photoParams.toString(),
        });
      } else {
        // Text or Link Post to /{version}/{page_id}/feed
        const feedParams = new URLSearchParams({
          message: caption,
          access_token: pageAccessToken,
          ...(link ? { link } : {}),
        });

        publishRes = await fetch(`${FACEBOOK_API_HOST}/${version}/${pageId}/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: feedParams.toString(),
        });
      }

      if (!publishRes.ok) {
        const errText = await publishRes.text().catch(() => "");
        const status = publishRes.status;

        // Parse Meta error code if available
        let metaErrorCode: number | undefined;
        try {
          const parsed = JSON.parse(errText);
          metaErrorCode = parsed.error?.code;
        } catch {
          // ignored
        }

        if (status === 401 || metaErrorCode === 190 || metaErrorCode === 102) {
          await socialAccountService.updateAccountStatus(params.account.id, params.account.workspaceId, "REAUTH_REQUIRED");
          return {
            success: false,
            errorMessage: `Facebook authorization expired or revoked (Code ${metaErrorCode || 190}) [Fatal]: Re-authentication required`,
          };
        }

        const isRetryable = status >= 500 || status === 429 || metaErrorCode === 4 || metaErrorCode === 17;
        return {
          success: false,
          errorMessage: `Facebook post creation failed (${status})${isRetryable ? " [Retryable]" : " [Fatal]"}: ${errText.slice(0, 400)}`,
        };
      }

      const resData = (await publishRes.json()) as { id?: string; post_id?: string };
      const externalPostId = resData.post_id || resData.id;

      if (!externalPostId) {
        return { success: false, errorMessage: "Facebook API did not return a post ID" };
      }

      return {
        success: true,
        externalPostId,
        permalink: `https://www.facebook.com/${externalPostId}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Facebook post publishing failed",
      };
    }
  }

  async getPublicationStatus(externalId: string): Promise<{ statusCode: string }> {
    if (!this.realApiEnabled()) return { statusCode: "PUBLISHED" };

    const token = process.env.FACEBOOK_TEST_ACCESS_TOKEN;
    if (!token) return { statusCode: "UNKNOWN" };

    try {
      const version = this.getApiVersion();
      const response = await fetch(`${FACEBOOK_API_HOST}/${version}/${externalId}?access_token=${token}`, {
        cache: "no-store",
      });
      if (!response.ok) return { statusCode: "UNKNOWN" };
      return { statusCode: "PUBLISHED" };
    } catch {
      return { statusCode: "UNKNOWN" };
    }
  }
}
