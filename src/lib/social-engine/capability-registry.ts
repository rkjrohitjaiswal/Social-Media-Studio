import { SocialPlatform, PlatformCapability } from "./types";

export const PLATFORM_CAPABILITIES: Record<SocialPlatform, PlatformCapability[]> = {
  INSTAGRAM: [
    "IMAGE_POST",
    "VIDEO",
    "CAROUSEL",
    "CAPTION",
    "HASHTAGS",
    "ALT_TEXT",
    "SCHEDULING",
  ],
  LINKEDIN: [
    "TEXT",
    "IMAGE_POST",
    "VIDEO",
    "DOCUMENT",
    "ARTICLE",
    "HASHTAGS",
    "SCHEDULING",
  ],
  PINTEREST: [
    "PIN",
    "TITLE",
    "DESCRIPTION",
    "DESTINATION_URL",
    "BOARD",
    "IMAGE_POST",
    "SCHEDULING",
  ],
  YOUTUBE: [
    "VIDEO",
    "SHORT",
    "TITLE",
    "DESCRIPTION",
    "TAGS",
    "THUMBNAIL",
    "SCHEDULING",
  ],
  THREADS: ["TEXT", "IMAGE_POST", "VIDEO", "HASHTAGS", "SCHEDULING"],
  TIKTOK: ["VIDEO", "PHOTO", "CAPTION", "HASHTAGS", "SCHEDULING"],
  FACEBOOK: [
    "TEXT",
    "IMAGE_POST",
    "VIDEO",
    "CAPTION",
    "HASHTAGS",
    "SCHEDULING",
  ],
  X: ["TEXT", "IMAGE_POST", "VIDEO", "HASHTAGS", "THREAD", "SCHEDULING"],
  REDDIT: ["TEXT", "IMAGE_POST", "LINK", "TITLE", "SUBREDDIT"],
  TELEGRAM: ["TEXT", "IMAGE_POST", "VIDEO", "LINK"],
  BLUESKY: ["TEXT", "IMAGE_POST", "HASHTAGS"],
  GOOGLE_BUSINESS: ["TEXT", "IMAGE_POST", "TITLE", "SCHEDULING"],
  MASTODON: ["TEXT", "IMAGE_POST", "HASHTAGS", "SCHEDULING"],
  DISCORD: ["TEXT", "IMAGE_POST", "VIDEO", "LINK"],
};

export function getPlatformCapabilities(platform: SocialPlatform): PlatformCapability[] {
  return PLATFORM_CAPABILITIES[platform] || [];
}

export function hasCapability(
  platform: SocialPlatform,
  capability: PlatformCapability
): boolean {
  return getPlatformCapabilities(platform).includes(capability);
}
