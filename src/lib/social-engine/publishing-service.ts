import {
  SocialPlatform,
  SocialAccountData,
  PlatformContentData,
  PublishResult,
} from "./types";
import { providerRegistry } from "./providers/provider-registry";
import { hasCapability } from "./capability-registry";
import { deliverN8nWebhook } from "../integrations/n8n";

export class SocialPublishingService {
  async publishContent(params: {
    workspaceId: string;
    account: SocialAccountData;
    content: PlatformContentData;
    mediaUrl?: string;
  }): Promise<PublishResult> {
    const { workspaceId, account, content, mediaUrl } = params;

    // 1. Verify approval status
    if (content.approvalStatus !== "APPROVED") {
      throw new Error(`Cannot publish content in '${content.approvalStatus}' status. Content must be APPROVED.`);
    }

    // 2. Verify account status
    if (account.status !== "CONNECTED") {
      throw new Error(`Cannot publish to account '${account.username || account.id}' in '${account.status}' status.`);
    }

    // 3. Verify platform matching
    if (account.platform !== content.platform) {
      throw new Error(`Account platform (${account.platform}) does not match content platform (${content.platform}).`);
    }

    // 4. Get provider and verify capabilities
    const provider = providerRegistry.getProvider(content.platform);

    const publishResult = await provider.publish({
      workspaceId,
      platform: content.platform,
      account,
      content,
      mediaUrl,
    });

    if (publishResult.success) {
      // Emit n8n event
      await deliverN8nWebhook(workspaceId, "social.content.published", {
        platform: content.platform,
        socialAccountId: account.id,
        platformContentId: content.id,
        externalPostId: publishResult.externalPostId,
        permalink: publishResult.permalink,
        publishedAt: publishResult.publishedAt?.toISOString(),
      });
    } else {
      await deliverN8nWebhook(workspaceId, "social.content.failed", {
        platform: content.platform,
        socialAccountId: account.id,
        platformContentId: content.id,
        errorMessage: publishResult.errorMessage,
      });
    }

    return publishResult;
  }
}

export const socialPublishingService = new SocialPublishingService();
