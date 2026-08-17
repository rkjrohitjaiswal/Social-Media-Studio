import {
  RepurposeContentInput,
  AdaptContentInput,
  RepurposeResponse,
  PlatformAdaptedOutput,
} from "@ai-social/shared";
import { buildBrandPromptContext } from "./brand-service.js";
import { getUserProviderApiKey } from "./credential-resolver.js";
import { consumeUsage } from "./usage-service.js";

export async function repurposeContent(userId: string, data: RepurposeContentInput): Promise<RepurposeResponse> {
  // 1. Consume 1 platform usage credit
  await consumeUsage(userId, "CONTENT_GENERATION");

  // 2. Fetch Brand Kit context
  const brandContext = await buildBrandPromptContext(userId);

  // 3. Resolve user's BYOK provider key
  const apiKey = await getUserProviderApiKey(userId, data.provider as any);
  if (!apiKey) {
    throw new Error(`${data.provider} API key is missing. Configure an AI provider API key in Settings.`);
  }

  const outputs: Record<string, PlatformAdaptedOutput> = {};

  // 4. Generate platform-specific outputs
  data.targetPlatforms.forEach((platform) => {
    const pUpper = platform.toUpperCase();
    outputs[platform] = generateAdaptedPlatformContent(pUpper, data.sourceText, brandContext);
  });

  return {
    success: true,
    outputs,
    workflowsConsumed: 1,
  };
}

export async function adaptContent(userId: string, data: AdaptContentInput): Promise<RepurposeResponse> {
  // 1. Consume 1 platform usage credit
  await consumeUsage(userId, "CONTENT_GENERATION");

  // 2. Fetch Brand Kit context
  const brandContext = await buildBrandPromptContext(userId);

  // 3. Resolve user's BYOK provider key
  const apiKey = await getUserProviderApiKey(userId, data.provider as any);
  if (!apiKey) {
    throw new Error(`${data.provider} API key is missing. Configure an AI provider API key in Settings.`);
  }

  const outputs: Record<string, PlatformAdaptedOutput> = {};

  // 4. Adapt for each requested platform
  data.targetPlatforms.forEach((platform) => {
    const pUpper = platform.toUpperCase();
    outputs[platform] = generateAdaptedPlatformContent(pUpper, data.baseContent, brandContext);
  });

  return {
    success: true,
    outputs,
    workflowsConsumed: 1,
  };
}

function generateAdaptedPlatformContent(
  platform: string,
  sourceText: string,
  brandContext: string
): PlatformAdaptedOutput {
  const snippet = sourceText.slice(0, 150).replace(/\s+/g, " ").trim();

  switch (platform) {
    case "INSTAGRAM":
      return {
        platform: "INSTAGRAM",
        caption: `✨ ${snippet}...\n\nDouble tap if you agree! Drop your thoughts below. 👇`,
        hashtags: ["#InstagramTips", "#ContentCreator", "#StudioGrowth", "#BrandStrategy"],
        callToAction: "Save & Share this post",
        suggestedMediaPrompt: "High-contrast editorial luxury image with soft studio lighting.",
      };

    case "LINKEDIN":
      return {
        platform: "LINKEDIN",
        title: "Key Industry Takeaways",
        caption: `🚀 ${snippet}...\n\nHere are 3 critical lessons for modern brand leaders:\n1. Focus on authentic storytelling.\n2. Leverage AI-driven workflows.\n3. Measure performance continuously.\n\nWhat is your perspective on this trend?`,
        hashtags: ["#Leadership", "#Innovation", "#BrandStrategy", "#FutureOfWork"],
        callToAction: "Comment your thoughts below or connect with me.",
      };

    case "X":
    case "TWITTER":
      return {
        platform: "X",
        caption: `💡 ${snippet.slice(0, 200)}...\n\n🧵 1/3 Read full thread below ⤵️`,
        hashtags: ["#Tech", "#AI"],
        callToAction: "Retweet to share with your network!",
      };

    case "THREADS":
      return {
        platform: "THREADS",
        caption: `Quick thought for today:\n${snippet}...\n\nWhat do you think about this approach? Let's discuss in the replies.`,
        hashtags: ["#ThreadsDaily", "#CreatorEconomy"],
        callToAction: "Reply with your take!",
      };

    case "FACEBOOK":
      return {
        platform: "FACEBOOK",
        caption: `Hey everyone! 👋 We wanted to share some insights on this:\n\n${snippet}...\n\nJoin our community conversation below!`,
        hashtags: ["#Community", "#BrandUpdate"],
        callToAction: "Click the link in bio to read more.",
      };

    case "PINTEREST":
      return {
        platform: "PINTEREST",
        title: "Visual Content Blueprint",
        caption: `${snippet}... Discover actionable creative strategies for your brand.`,
        hashtags: ["#Inspiration", "#BrandDesign", "#CreativeStudio"],
        callToAction: "Pin this to your board for later!",
        suggestedMediaPrompt: "Vertical 9:16 aesthetic Pinterest graphic pin with clean typography.",
      };

    case "YOUTUBE":
      return {
        platform: "YOUTUBE",
        title: snippet.slice(0, 70),
        caption: `In this video, we explore:\n${snippet}...\n\n🔔 Subscribe to the channel for weekly brand strategy drops!`,
        hashtags: ["#YouTubeShorts", "#ContentStrategy"],
        callToAction: "Subscribe and hit the bell notification icon!",
      };

    default:
      return {
        platform,
        caption: `${snippet}...`,
        hashtags: ["#Content"],
        callToAction: "Learn more",
      };
  }
}
