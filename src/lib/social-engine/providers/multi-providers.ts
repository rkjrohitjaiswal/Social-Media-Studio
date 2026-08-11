import {
  SocialPlatform,
  SocialPlatformProvider,
  SocialAccountData,
  PublishParams,
  PublishResult,
  PlatformCapability,
} from "../types";
import { getPlatformCapabilities } from "../capability-registry";

export class GenericMockPlatformProvider implements SocialPlatformProvider {
  readonly platform: SocialPlatform;

  constructor(platform: SocialPlatform) {
    this.platform = platform;
  }

  getCapabilities(): PlatformCapability[] {
    return getPlatformCapabilities(this.platform);
  }

  async verifyConnection(account: SocialAccountData): Promise<boolean> {
    return account.status === "CONNECTED";
  }

  async publish(params: PublishParams): Promise<PublishResult> {
    // Check if opt-in environment variable for real API test is enabled
    const envVarName = `RUN_REAL_${this.platform}_TEST`;
    if (process.env[envVarName] === "true") {
      // In real integration mode, real API calls would be executed here
    }

    const mockId = `${this.platform.toLowerCase()}-post-${Date.now()}`;
    return {
      success: true,
      externalPostId: mockId,
      permalink: `https://${this.platform.toLowerCase()}.com/post/${mockId}`,
      publishedAt: new Date(),
    };
  }

  async getPublicationStatus(externalId: string): Promise<{ statusCode: string }> {
    return { statusCode: "PUBLISHED" };
  }
}

export class LinkedInProvider extends GenericMockPlatformProvider {
  constructor() {
    super("LINKEDIN");
  }
}

export class PinterestProvider extends GenericMockPlatformProvider {
  constructor() {
    super("PINTEREST");
  }
}

export class FacebookProvider extends GenericMockPlatformProvider {
  constructor() {
    super("FACEBOOK");
  }
}

export class TikTokProvider extends GenericMockPlatformProvider {
  constructor() {
    super("TIKTOK");
  }
}

export class YouTubeProvider extends GenericMockPlatformProvider {
  constructor() {
    super("YOUTUBE");
  }
}

export class XProvider extends GenericMockPlatformProvider {
  constructor() {
    super("X");
  }
}

export class RedditProvider extends GenericMockPlatformProvider {
  constructor() {
    super("REDDIT");
  }

  override async publish(params: PublishParams): Promise<PublishResult> {
    // Reddit requires explicit user selection and human approval before posting
    if (params.content.approvalStatus !== "APPROVED") {
      return {
        success: false,
        errorMessage: "Reddit requires human approval before publishing",
      };
    }
    return super.publish(params);
  }
}

export class TelegramProvider extends GenericMockPlatformProvider {
  constructor() {
    super("TELEGRAM");
  }
}

export class BlueskyProvider extends GenericMockPlatformProvider {
  constructor() {
    super("BLUESKY");
  }
}

export class GoogleBusinessProvider extends GenericMockPlatformProvider {
  constructor() {
    super("GOOGLE_BUSINESS");
  }
}

export class MastodonProvider extends GenericMockPlatformProvider {
  constructor() {
    super("MASTODON");
  }
}

export class DiscordProvider extends GenericMockPlatformProvider {
  constructor() {
    super("DISCORD");
  }
}
