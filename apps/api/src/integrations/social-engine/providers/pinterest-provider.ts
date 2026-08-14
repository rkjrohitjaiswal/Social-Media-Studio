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

const PINTEREST_API_HOST = "https://api.pinterest.com/v5";

export interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  privacy?: string;
}

export class PinterestProvider implements SocialPlatformProvider {
  readonly platform = "PINTEREST" as const;

  getCapabilities(): PlatformCapability[] {
    return getPlatformCapabilities("PINTEREST");
  }

  private realApiEnabled(): boolean {
    return process.env.RUN_REAL_PINTEREST_TEST === "true";
  }

  /**
   * Retrieves access token, checking expiration and refreshing if possible.
   * Marks account as REAUTH_REQUIRED if token is expired and cannot be refreshed.
   */
  async getValidAccessToken(account: SocialAccountData): Promise<string> {
    if (!account.encryptedAccessToken) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      throw new Error("Pinterest account has no encrypted access token. Re-authentication required.");
    }

    const currentToken = decryptSecret(account.encryptedAccessToken);
    const now = Date.now();
    const isExpired = account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now < 5 * 60 * 1000; // 5 min buffer

    if (!isExpired) {
      return currentToken;
    }

    // Attempt token refresh via Pinterest API v5
    if (!account.encryptedRefreshToken) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      throw new Error("Pinterest access token expired and no refresh token available. Re-authentication required.");
    }

    try {
      const refreshToken = decryptSecret(account.encryptedRefreshToken);
      const appId = process.env.PINTEREST_APP_ID || process.env.PINTEREST_CLIENT_ID || "your-pinterest-app-id";
      const appSecret = process.env.PINTEREST_APP_SECRET || process.env.PINTEREST_CLIENT_SECRET || "your-pinterest-app-secret";
      const authHeader = `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`;

      const refreshForm = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });

      const response = await fetch(`${PINTEREST_API_HOST}/oauth/token`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: refreshForm.toString(),
        cache: "no-store",
      });

      if (!response.ok) {
        await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
        throw new Error(`Pinterest token refresh failed (${response.status}). Re-authentication required.`);
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
      const msg = err instanceof Error ? err.message : "Pinterest token refresh failed";
      throw new Error(`Pinterest token refresh failed: ${msg}`);
    }
  }

  async verifyConnection(account: SocialAccountData): Promise<boolean> {
    if (account.status === "REAUTH_REQUIRED" || account.status === "DISCONNECTED") {
      return false;
    }

    if (!this.realApiEnabled()) return account.status === "CONNECTED";

    try {
      const token = await this.getValidAccessToken(account);
      const response = await fetch(`${PINTEREST_API_HOST}/user_account`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetches available Pinterest Boards for a connected account.
   */
  async getBoards(account: SocialAccountData): Promise<PinterestBoard[]> {
    if (!this.realApiEnabled()) {
      return [
        { id: "board-101", name: "Affiliate & Product Finds", description: "Curated products" },
        { id: "board-102", name: "Certifications & Achievements", description: "Career milestones" },
        { id: "board-103", name: "Educational Guides & Tech", description: "Tutorials and masterclasses" },
      ];
    }

    try {
      const token = await this.getValidAccessToken(account);
      const res = await fetch(`${PINTEREST_API_HOST}/boards`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Pinterest boards fetch failed (${res.status})`);
      }

      const data = (await res.json()) as { items?: PinterestBoard[] };
      return data.items || [];
    } catch {
      return [
        { id: "board-default", name: "Main Brand Board", description: "Official pins" },
      ];
    }
  }

  async publish(params: PublishParams): Promise<PublishResult> {
    // 1. Check human approval guard
    if (params.content.approvalStatus !== "APPROVED") {
      return {
        success: false,
        errorMessage: "Pinterest Pin publishing requires human approval before publishing",
      };
    }

    if (!this.realApiEnabled()) {
      const mockId = `pin-post-${Date.now()}`;
      return {
        success: true,
        externalPostId: mockId,
        permalink: `https://www.pinterest.com/pin/${mockId}`,
        publishedAt: new Date(),
      };
    }

    try {
      const accessToken = await this.getValidAccessToken(params.account);
      const mediaUrl = params.mediaUrl;
      if (!mediaUrl) {
        return { success: false, errorMessage: "Pinterest Pin creation requires an image media URL" };
      }

      // Board selection logic: extract boardId from content metadata or default to first available board
      let boardId =
        (params.content.platformMetadataJson?.boardId as string) ||
        (params.account.metadataJson?.defaultBoardId as string);

      if (!boardId) {
        const boards = await this.getBoards(params.account);
        boardId = boards[0]?.id || "board-default";
      }

      const title = (params.content.title || params.content.caption || "Pin").slice(0, 100);
      const description = (params.content.description || params.content.caption || "").slice(0, 800);
      const link = params.content.destinationUrl || undefined;
      const altText = params.content.altText || title;

      const pinPayload = {
        board_id: boardId,
        title,
        description,
        ...(link ? { link } : {}),
        alt_text: altText,
        media_source: {
          source_type: "image_url",
          url: mediaUrl,
        },
      };

      const pinRes = await fetch(`${PINTEREST_API_HOST}/pins`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pinPayload),
      });

      if (!pinRes.ok) {
        const errText = await pinRes.text().catch(() => "");
        const status = pinRes.status;
        const isRetryable = status >= 500 || status === 429;
        return {
          success: false,
          errorMessage: `Pinterest Pin creation failed (${status})${isRetryable ? " [Retryable]" : " [Fatal]"}: ${errText.slice(0, 400)}`,
        };
      }

      const pinData = (await pinRes.json()) as { id?: string };
      const pinId = pinData.id;
      if (!pinId) {
        return { success: false, errorMessage: "Pinterest API did not return a Pin ID" };
      }

      return {
        success: true,
        externalPostId: pinId,
        permalink: `https://www.pinterest.com/pin/${pinId}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Pinterest Pin publishing failed",
      };
    }
  }

  async getPublicationStatus(externalId: string): Promise<{ statusCode: string }> {
    if (!this.realApiEnabled()) return { statusCode: "PUBLISHED" };

    const token = process.env.PINTEREST_TEST_ACCESS_TOKEN;
    if (!token) return { statusCode: "UNKNOWN" };

    try {
      const response = await fetch(`${PINTEREST_API_HOST}/pins/${externalId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) return { statusCode: "UNKNOWN" };
      return { statusCode: "PUBLISHED" };
    } catch {
      return { statusCode: "UNKNOWN" };
    }
  }
}
