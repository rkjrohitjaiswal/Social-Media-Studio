import {
  SocialPlatformProvider,
  SocialAccountData,
  PublishParams,
  PublishResult,
  PlatformCapability,
} from "../types";
import { getPlatformCapabilities } from "../capability-registry";
import { decryptSecret } from "../../security/encryption";
import { socialAccountService } from "../account-service";

const THREADS_API_HOST = "https://graph.threads.net";
const THREADS_VERSION = process.env.THREADS_API_VERSION || "v1.0";

export class ThreadsProvider implements SocialPlatformProvider {
  readonly platform = "THREADS" as const;

  getCapabilities(): PlatformCapability[] {
    return getPlatformCapabilities("THREADS");
  }

  private realApiEnabled(): boolean {
    return process.env.RUN_REAL_THREADS_TEST === "true";
  }

  /**
   * Retrieves access token, checking expiration and refreshing if possible.
   * Marks account as REAUTH_REQUIRED if token is expired and cannot be refreshed.
   */
  async getValidAccessToken(account: SocialAccountData): Promise<string> {
    if (!account.encryptedAccessToken) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      throw new Error("Threads account has no encrypted access token. Re-authentication required.");
    }

    const currentToken = decryptSecret(account.encryptedAccessToken);
    const now = Date.now();
    const isExpired = account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now < 5 * 60 * 1000; // 5 min buffer

    if (!isExpired) {
      return currentToken;
    }

    // Attempt token refresh via Threads API
    try {
      const refreshUrl = `${THREADS_API_HOST}/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(
        currentToken
      )}`;
      const response = await fetch(refreshUrl, { cache: "no-store" });

      if (!response.ok) {
        await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
        throw new Error(`Threads token refresh failed (${response.status}). Re-authentication required.`);
      }

      const data = (await response.json()) as {
        access_token: string;
        expires_in?: number;
      };

      const newAccessToken = data.access_token;
      const newExpiry = data.expires_in ? new Date(now + data.expires_in * 1000) : undefined;

      await socialAccountService.updateAccountTokens(account.id, account.workspaceId, {
        accessToken: newAccessToken,
        tokenExpiresAt: newExpiry,
      });

      return newAccessToken;
    } catch (err: unknown) {
      await socialAccountService.updateAccountStatus(account.id, account.workspaceId, "REAUTH_REQUIRED");
      const msg = err instanceof Error ? err.message : "Threads token refresh failed";
      throw new Error(`Threads token refresh failed: ${msg}`);
    }
  }

  async verifyConnection(account: SocialAccountData): Promise<boolean> {
    if (account.status === "REAUTH_REQUIRED" || account.status === "DISCONNECTED") {
      return false;
    }

    if (!this.realApiEnabled()) return account.status === "CONNECTED";

    try {
      const token = await this.getValidAccessToken(account);
      const response = await fetch(`${THREADS_API_HOST}/${THREADS_VERSION}/me?access_token=${token}`, {
        cache: "no-store",
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Helper to wait for Threads media container status to become FINISHED.
   */
  private async pollContainerStatus(
    accessToken: string,
    containerId: string,
    maxRetries = 10,
    delayMs = 2000
  ): Promise<void> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const res = await fetch(
        `${THREADS_API_HOST}/${THREADS_VERSION}/${containerId}?fields=status,error_message&access_token=${accessToken}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        throw new Error(`Threads container status check failed (${res.status})`);
      }

      const data = (await res.json()) as { status?: string; error_message?: string };
      if (data.status === "FINISHED") {
        return;
      }
      if (data.status === "ERROR") {
        throw new Error(`Threads container processing failed: ${data.error_message || "Unknown error"}`);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error("Threads media container processing timed out");
  }

  async publish(params: PublishParams): Promise<PublishResult> {
    // 1. Check human approval guard
    if (params.content.approvalStatus !== "APPROVED") {
      return {
        success: false,
        errorMessage: "Threads publishing requires human approval before publishing",
      };
    }

    if (!this.realApiEnabled()) {
      const mockId = `threads-post-${Date.now()}`;
      return {
        success: true,
        externalPostId: mockId,
        permalink: `https://www.threads.net/post/${mockId}`,
        publishedAt: new Date(),
      };
    }

    try {
      const accessToken = await this.getValidAccessToken(params.account);
      const threadsUserId = params.account.externalAccountId || "me";
      const caption = params.content.caption?.trim() || params.content.description?.trim() || "";

      if (!caption && !params.mediaUrl) {
        return { success: false, errorMessage: "Threads post requires text or image content" };
      }

      // Step 1: Create Threads media container
      const containerUrl = `${THREADS_API_HOST}/${THREADS_VERSION}/${threadsUserId}/threads`;
      const containerBody: Record<string, string> = {
        access_token: accessToken,
      };

      if (params.mediaUrl) {
        containerBody.media_type = "IMAGE";
        containerBody.image_url = params.mediaUrl;
        if (caption) containerBody.text = caption;
      } else {
        containerBody.media_type = "TEXT";
        containerBody.text = caption;
        if (params.content.destinationUrl) {
          containerBody.link_attachment = params.content.destinationUrl;
        }
      }

      const containerRes = await fetch(containerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(containerBody).toString(),
      });

      if (!containerRes.ok) {
        const errText = await containerRes.text().catch(() => "");
        const status = containerRes.status;
        const isRetryable = status >= 500 || status === 429;
        return {
          success: false,
          errorMessage: `Threads container creation failed (${status})${isRetryable ? " [Retryable]" : " [Fatal]"}: ${errText.slice(0, 400)}`,
        };
      }

      const containerData = (await containerRes.json()) as { id?: string };
      const containerId = containerData.id;
      if (!containerId) {
        return { success: false, errorMessage: "Threads API did not return a container ID" };
      }

      // Step 2: Poll container status if media attached
      if (params.mediaUrl) {
        await this.pollContainerStatus(accessToken, containerId);
      }

      // Step 3: Publish Threads container
      const publishUrl = `${THREADS_API_HOST}/${THREADS_VERSION}/${threadsUserId}/threads_publish`;
      const publishRes = await fetch(publishUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          creation_id: containerId,
          access_token: accessToken,
        }).toString(),
      });

      if (!publishRes.ok) {
        const errText = await publishRes.text().catch(() => "");
        const status = publishRes.status;
        const isRetryable = status >= 500 || status === 429;
        return {
          success: false,
          errorMessage: `Threads container publish failed (${status})${isRetryable ? " [Retryable]" : " [Fatal]"}: ${errText.slice(0, 400)}`,
        };
      }

      const publishData = (await publishRes.json()) as { id?: string };
      const publishedId = publishData.id || containerId;

      return {
        success: true,
        externalPostId: publishedId,
        permalink: `https://www.threads.net/post/${publishedId}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Threads publishing failed",
      };
    }
  }

  async getPublicationStatus(externalId: string): Promise<{ statusCode: string }> {
    if (!this.realApiEnabled()) return { statusCode: "PUBLISHED" };

    const token = process.env.THREADS_TEST_ACCESS_TOKEN;
    if (!token) return { statusCode: "UNKNOWN" };

    try {
      const response = await fetch(`${THREADS_API_HOST}/${THREADS_VERSION}/${externalId}?fields=id&access_token=${token}`, {
        cache: "no-store",
      });
      if (!response.ok) return { statusCode: "UNKNOWN" };
      return { statusCode: "PUBLISHED" };
    } catch {
      return { statusCode: "UNKNOWN" };
    }
  }
}
