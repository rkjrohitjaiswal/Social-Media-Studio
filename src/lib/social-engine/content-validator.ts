import { z } from "zod";
import { SocialPlatform, PlatformContentData } from "./types";
import { getPlatformCapabilities } from "./capability-registry";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  suggestedStatus: "DRAFT" | "NEEDS_REVIEW" | "READY";
  truncatedContent?: Partial<PlatformContentData>;
}

export function validatePlatformContent(
  platform: SocialPlatform,
  content: Partial<PlatformContentData>
): ValidationResult {
  const errors: string[] = [];
  const capabilities = getPlatformCapabilities(platform);
  let status: "DRAFT" | "NEEDS_REVIEW" | "READY" = "READY";
  const truncated: Partial<PlatformContentData> = { ...content };

  const caption = content.caption || "";
  const title = content.title || "";
  const description = content.description || "";
  const hashtags = content.hashtagsJson || [];

  switch (platform) {
    case "X": {
      if (caption.length > 280 && !content.platformMetadataJson?.isThread) {
        errors.push(`Caption length (${caption.length}) exceeds X limit of 280 characters.`);
        status = "NEEDS_REVIEW";
        truncated.caption = caption.slice(0, 277) + "...";
      }
      break;
    }
    case "THREADS":
    case "BLUESKY": {
      const limit = platform === "THREADS" ? 500 : 300;
      if (caption.length > limit) {
        errors.push(`Caption length (${caption.length}) exceeds ${platform} limit of ${limit} characters.`);
        status = "NEEDS_REVIEW";
        truncated.caption = caption.slice(0, limit - 3) + "...";
      }
      break;
    }
    case "INSTAGRAM": {
      if (caption.length > 2200) {
        errors.push(`Caption length (${caption.length}) exceeds Instagram limit of 2200 characters.`);
        status = "NEEDS_REVIEW";
        truncated.caption = caption.slice(0, 2197) + "...";
      }
      if (hashtags.length > 30) {
        errors.push(`Hashtags count (${hashtags.length}) exceeds Instagram limit of 30 hashtags.`);
        status = "NEEDS_REVIEW";
        truncated.hashtagsJson = hashtags.slice(0, 30);
      }
      break;
    }
    case "PINTEREST": {
      if (title.length > 100) {
        errors.push(`Title length (${title.length}) exceeds Pinterest limit of 100 characters.`);
        status = "NEEDS_REVIEW";
        truncated.title = title.slice(0, 97) + "...";
      }
      if (description.length > 500) {
        errors.push(`Description length (${description.length}) exceeds Pinterest limit of 500 characters.`);
        status = "NEEDS_REVIEW";
        truncated.description = description.slice(0, 497) + "...";
      }
      break;
    }
    case "YOUTUBE": {
      if (title.length > 100) {
        errors.push(`Title length (${title.length}) exceeds YouTube title limit of 100 characters.`);
        status = "NEEDS_REVIEW";
        truncated.title = title.slice(0, 97) + "...";
      }
      if (description.length > 5000) {
        errors.push(`Description length (${description.length}) exceeds YouTube limit of 5000 characters.`);
        status = "NEEDS_REVIEW";
        truncated.description = description.slice(0, 4997) + "...";
      }
      break;
    }
    case "REDDIT": {
      if (title.length > 300) {
        errors.push(`Title length (${title.length}) exceeds Reddit title limit of 300 characters.`);
        status = "NEEDS_REVIEW";
        truncated.title = title.slice(0, 297) + "...";
      }
      if (content.contentType === "AFFILIATE_PRODUCT") {
        errors.push("Affiliate promotional posts on Reddit require explicit human approval and non-promotional tone.");
        status = "NEEDS_REVIEW";
      }
      break;
    }
    case "LINKEDIN": {
      if (caption.length > 3000) {
        errors.push(`Caption length (${caption.length}) exceeds LinkedIn limit of 3000 characters.`);
        status = "NEEDS_REVIEW";
        truncated.caption = caption.slice(0, 2997) + "...";
      }
      break;
    }
    default:
      break;
  }

  // Validate URL format if provided
  if (content.destinationUrl) {
    try {
      new URL(content.destinationUrl);
    } catch {
      errors.push(`Invalid destination URL format: ${content.destinationUrl}`);
      status = "NEEDS_REVIEW";
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestedStatus: status,
    truncatedContent: truncated,
  };
}
