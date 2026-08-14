import {
  SocialPlatformProvider,
  SocialAccountData,
  PublishParams,
  PublishResult,
  PlatformCapability,
} from "../types";
import { getPlatformCapabilities } from "../capability-registry";
import { MetaInstagramProvider } from "../../instagram/provider.js";
import { decryptSecret } from "../../../utils/encryption.js";

export class InstagramAdapter implements SocialPlatformProvider {
  readonly platform = "INSTAGRAM" as const;
  private metaProvider: MetaInstagramProvider;

  constructor() {
    this.metaProvider = new MetaInstagramProvider();
  }

  getCapabilities(): PlatformCapability[] {
    return getPlatformCapabilities("INSTAGRAM");
  }

  async verifyConnection(account: SocialAccountData): Promise<boolean> {
    const rawToken = account.encryptedAccessToken
      ? decryptSecret(account.encryptedAccessToken)
      : "mock-token";
    return this.metaProvider.verifyConnection(rawToken, account.externalAccountId);
  }

  async publish(params: PublishParams): Promise<PublishResult> {
    const rawToken = params.account.encryptedAccessToken
      ? decryptSecret(params.account.encryptedAccessToken)
      : "simulated-token";

    const mediaUrl = params.mediaUrl || "https://images.unsplash.com/photo-1548036328-c9fa89d128fa";
    const caption = params.content.caption || "";

    const containerId = await this.metaProvider.createMediaContainer({
      accessToken: rawToken,
      instagramUserId: params.account.externalAccountId,
      imageUrl: mediaUrl,
      caption,
    });

    const mediaId = await this.metaProvider.publishMediaContainer(
      rawToken,
      params.account.externalAccountId,
      containerId
    );

    return {
      success: true,
      externalPostId: mediaId,
      permalink: `https://instagram.com/p/${mediaId}`,
      publishedAt: new Date(),
    };
  }

  async getPublicationStatus(externalId: string): Promise<{ statusCode: string }> {
    return { statusCode: "FINISHED" };
  }
}
