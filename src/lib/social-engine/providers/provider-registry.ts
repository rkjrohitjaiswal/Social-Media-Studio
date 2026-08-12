import { SocialPlatform, SocialPlatformProvider } from "../types";
import { InstagramAdapter } from "./instagram-provider";
import { LinkedInProvider } from "./linkedin-provider";
import { ThreadsProvider } from "./threads-provider";
import { PinterestProvider } from "./pinterest-provider";
import { FacebookProvider } from "./facebook-provider";
import { TikTokProvider } from "./tiktok-provider";
import { YouTubeProvider } from "./youtube-provider";
import { XProvider } from "./x-provider";
import {
  RedditProvider,
  TelegramProvider,
  BlueskyProvider,
  GoogleBusinessProvider,
  MastodonProvider,
  DiscordProvider,
  GenericMockPlatformProvider,
} from "./multi-providers";

class PlatformProviderRegistry {
  private providers: Map<SocialPlatform, SocialPlatformProvider> = new Map();

  constructor() {
    this.registerProvider(new InstagramAdapter());
    this.registerProvider(new LinkedInProvider());
    this.registerProvider(new ThreadsProvider());
    this.registerProvider(new PinterestProvider());
    this.registerProvider(new FacebookProvider());
    this.registerProvider(new TikTokProvider());
    this.registerProvider(new YouTubeProvider());
    this.registerProvider(new XProvider());
    this.registerProvider(new RedditProvider());
    this.registerProvider(new TelegramProvider());
    this.registerProvider(new BlueskyProvider());
    this.registerProvider(new GoogleBusinessProvider());
    this.registerProvider(new MastodonProvider());
    this.registerProvider(new DiscordProvider());
  }

  registerProvider(provider: SocialPlatformProvider) {
    this.providers.set(provider.platform, provider);
  }

  getProvider(platform: SocialPlatform): SocialPlatformProvider {
    const provider = this.providers.get(platform);
    if (!provider) {
      return new GenericMockPlatformProvider(platform);
    }
    return provider;
  }

  getAllProviders(): SocialPlatformProvider[] {
    return Array.from(this.providers.values());
  }
}

export const providerRegistry = new PlatformProviderRegistry();
