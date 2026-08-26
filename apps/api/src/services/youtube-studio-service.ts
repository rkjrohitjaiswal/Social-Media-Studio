import {
  ContentProjectDto,
  YouTubeMetadata,
  YouTubeChapter,
  ContentMode,
  PlatformPreset,
  PLATFORM_PRESETS,
} from "@ai-social/shared";
import { getContentProjectById } from "./content-project-service.js";
import { generateMultiImageCreatives } from "./creative-generation-service.js";
import { createContentPackage } from "./content-repurposing-service.js";
import { resolveSocialPublishingProvider } from "../integrations/publishing/social-publishing-provider.js";

/**
 * Returns tailored prompt guidance based on Content Mode.
 */
export function getContentModePromptGuidance(mode: string = "TECH"): string {
  switch (mode) {
    case "TECH":
      return "Focus on screen demonstrations, architecture diagrams, code snippets, product UI workflows, and technical animations.";
    case "PRODUCT":
      return "Focus on cinematic product hero shots, macro texture reflections, lifestyle usage contexts, and smooth camera rotations.";
    case "EDUCATION":
      return "Focus on clear step-by-step explanatory visual charts, conceptual infographics, and structured lesson breakdowns.";
    case "BUSINESS":
    case "FINANCE":
      return "Focus on executive editorial aesthetics, market trajectory charts, clean corporate typography, and high-trust visuals.";
    case "FITNESS":
    case "LIFESTYLE":
    case "CREATOR":
    case "PERSONAL_BRAND":
      return "Focus on high-energy motion, vibrant color palettes, immersive background atmospheres, and dynamic cuts.";
    default:
      return "Focus on high-definition editorial visual storytelling and engaging brand presentation.";
  }
}

/**
 * Generates YouTube Long-Form project breakdown with Chapters.
 */
export async function generateYouTubeLongFormStructure(params: {
  topic: string;
  targetDurationMinutes?: number;
  contentMode?: ContentMode;
}): Promise<{
  chapters: YouTubeChapter[];
  scenes: Array<{
    sceneNumber: number;
    title: string;
    narration: string;
    visualDirection: string;
    durationSeconds: number;
    chapterIndex: number;
  }>;
}> {
  const { topic, targetDurationMinutes = 10, contentMode = "TECH" } = params;
  const guidance = getContentModePromptGuidance(contentMode);

  const chapterTitles = [
    "Introduction & Overview",
    `What is ${topic}?`,
    "Architecture & Core Concepts",
    "Practical Implementation & Tools",
    "Real-World Examples & Case Studies",
    "Future Outlook & Conclusion",
  ];

  const totalSeconds = targetDurationMinutes * 60;
  const chapterDuration = Math.floor(totalSeconds / chapterTitles.length);

  let currentSeconds = 0;
  const chapters: YouTubeChapter[] = [];
  const scenes: Array<{
    sceneNumber: number;
    title: string;
    narration: string;
    visualDirection: string;
    durationSeconds: number;
    chapterIndex: number;
  }> = [];

  let sceneCount = 1;

  for (let cIdx = 0; cIdx < chapterTitles.length; cIdx++) {
    const cTitle = chapterTitles[cIdx];
    const mins = Math.floor(currentSeconds / 60);
    const secs = currentSeconds % 60;
    const timestamp = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    chapters.push({
      timestamp,
      title: cTitle,
      durationSeconds: chapterDuration,
    });

    // 2 scenes per chapter
    const sceneDur = Math.floor(chapterDuration / 2);
    for (let s = 1; s <= 2; s++) {
      scenes.push({
        sceneNumber: sceneCount++,
        title: `${cTitle} — Part ${s}`,
        narration: `Detailed breakdown of ${topic}: ${cTitle}. ${guidance}`,
        visualDirection: `${cTitle} visual presentation slide. ${guidance}`,
        durationSeconds: sceneDur,
        chapterIndex: cIdx,
      });
    }

    currentSeconds += chapterDuration;
  }

  return { chapters, scenes };
}

/**
 * Generates YouTube Shorts preset structure (9:16, 15-60s) with structured pacing.
 */
export function generateYouTubeShortStructure(params: {
  topic: string;
  contentMode?: ContentMode;
}): {
  hook: string;
  problem: string;
  explanation: string;
  example: string;
  callToAction: string;
  scenes: Array<{ sceneNumber: number; title: string; narration: string; durationSeconds: number }>;
} {
  const { topic, contentMode = "TECH" } = params;
  const guidance = getContentModePromptGuidance(contentMode);

  return {
    hook: `Stop ignoring ${topic}! Here is what changes today.`,
    problem: `Most creators fail at ${topic} because they miss key fundamentals.`,
    explanation: `Here is the exact step-by-step strategy: 1. Optimize flow. 2. Automate execution. ${guidance}`,
    example: `See how top brands use ${topic} to scale reach 10x.`,
    callToAction: "Subscribe to @aisocial for daily short breakdown videos!",
    scenes: [
      { sceneNumber: 1, title: "00:00 HOOK", narration: `Stop ignoring ${topic}!`, durationSeconds: 3 },
      { sceneNumber: 2, title: "00:03 Problem", narration: `The biggest mistake people make with ${topic}.`, durationSeconds: 6 },
      { sceneNumber: 3, title: "00:09 Strategy", narration: `Step 1: Focus on quality automation.`, durationSeconds: 10 },
      { sceneNumber: 4, title: "00:19 Example", narration: `Real world results achieved with ${topic}.`, durationSeconds: 7 },
      { sceneNumber: 5, title: "00:26 CTA", narration: "Subscribe for daily AI tips!", durationSeconds: 4 },
    ],
  };
}

/**
 * AI-assisted YouTube Metadata Generator (Title, Description, Tags, Hashtags, Chapters).
 */
export async function generateYouTubeMetadata(params: {
  projectId: string;
  workspaceId: string;
  userId?: string;
}): Promise<YouTubeMetadata> {
  const { projectId, workspaceId } = params;
  const proj = await getContentProjectById(projectId, workspaceId);
  if (!proj) {
    throw new Error("Content project not found or workspace access denied");
  }

  const topic = proj.topic || proj.title;

  const chapters: YouTubeChapter[] = [
    { timestamp: "00:00", title: "Introduction", durationSeconds: 75 },
    { timestamp: "01:15", title: `What is ${topic}?`, durationSeconds: 115 },
    { timestamp: "03:10", title: "Architecture & System Design", durationSeconds: 170 },
    { timestamp: "06:00", title: "Tools & Libraries", durationSeconds: 180 },
    { timestamp: "09:00", title: "Real World Examples", durationSeconds: 180 },
    { timestamp: "12:00", title: "Future Outlook & Conclusion", durationSeconds: 120 },
  ];

  const metadata: YouTubeMetadata = {
    title: `How ${topic} Actually Works — Complete Guide`,
    description: `In this comprehensive video, we break down ${topic} step by step.\n\nChapters:\n${chapters
      .map((c) => `${c.timestamp} ${c.title}`)
      .join("\n")}\n\nSubscribe for daily software architecture and AI tutorials!\n\n#${topic.replace(
      /\s+/g,
      ""
    )} #AIAgents #SoftwareEngineering #TechTutorial`,
    tags: [topic, "AI Agents", "Software Development", "Tutorial", "Tech Guide", "Next.js", "AI Studio"],
    hashtags: [`#${topic.replace(/\s+/g, "")}`, "#AIAgents", "#TechTutorial", "#SoftwareEngineering"],
    chapters,
  };

  proj.youtubeMetadata = metadata;
  return metadata;
}

/**
 * AI-assisted 16:9 Thumbnail Variant Generator.
 */
export async function generateYouTubeThumbnails(params: {
  projectId: string;
  workspaceId: string;
  userId: string;
}): Promise<{ thumbnailUrl: string; thumbnailVariants: string[] }> {
  const { projectId, workspaceId, userId } = params;
  const proj = await getContentProjectById(projectId, workspaceId);
  if (!proj) {
    throw new Error("Content project not found or workspace access denied");
  }

  // Generate 3 thumbnail variants using real image generation engine
  const runResult = await generateMultiImageCreatives({
    userId,
    workspaceId,
    input: {
      creativeBrief: `High-impact YouTube 16:9 thumbnail for "${proj.title}". High contrast text, sleek glowing background.`,
      inputImageUrls: proj.referenceImages.length > 0 ? proj.referenceImages : ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80"],
      stylePreset: "CINEMATIC",
      platform: "YOUTUBE",
      aspectRatio: "16:9",
      count: 3,
    },
  });

  const variants = runResult.variants.map((v) => v.imageUrl);
  const selectedUrl = variants[0] || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80";

  proj.thumbnailUrl = selectedUrl;
  proj.thumbnailVariants = variants;

  return {
    thumbnailUrl: selectedUrl,
    thumbnailVariants: variants,
  };
}

/**
 * Repurposes a Long-Form YouTube Project into Shorts, Reels, Carousels, and Social Posts.
 */
export async function repurposeYouTubeLongForm(params: {
  projectId: string;
  workspaceId: string;
  userId: string;
}) {
  const { projectId, workspaceId, userId } = params;
  const proj = await getContentProjectById(projectId, workspaceId);
  if (!proj) {
    throw new Error("Content project not found or workspace access denied");
  }

  const pkg = await createContentPackage({
    userId,
    workspaceId,
    input: {
      topic: proj.topic,
      sourceText: proj.sourceText || proj.topic,
      referenceUrls: proj.referenceUrls || [],
      targetPlatform: "YOUTUBE",
      targetDurationMinutes: 10,
      tone: "Educational & Engaging",
      audience: "Tech Audience",
      language: "en",
    },
  });

  proj.package = pkg;
  return pkg;
}

/**
 * Publishes or schedules a YouTube project to YouTube via YouTube Data API Provider.
 */
export async function publishToYouTube(params: {
  projectId: string;
  workspaceId: string;
  userId: string;
  privacyStatus?: "PRIVATE" | "UNLISTED" | "PUBLIC" | "SCHEDULED";
  scheduledAt?: string;
  tags?: string[];
}) {
  const { projectId, workspaceId, userId, privacyStatus = "PUBLIC", scheduledAt, tags } = params;
  const proj = await getContentProjectById(projectId, workspaceId);
  if (!proj) {
    throw new Error("Content project not found or workspace access denied");
  }

  const provider = resolveSocialPublishingProvider("YOUTUBE");
  const meta = proj.youtubeMetadata;
  const result = await provider.publishPost({
    workspaceId,
    userId,
    title: meta?.title || proj.title,
    content: meta?.description || proj.topic,
    privacyStatus,
    scheduledAt,
    tags: tags || meta?.tags || [],
    chapters: meta?.chapters || [],
    thumbnailUrl: proj.thumbnailUrl || undefined,
    idempotencyKey: `yt_pub_${proj.id}_${Date.now()}`,
  });

  return result;
}

/**
 * Generates a complete Tech Short (9:16, 30-60s) package for YouTube.
 * Example topic: "5 AI tools every developer should know in 2026"
 */
export async function generateTechShortProject(params: {
  userId: string;
  workspaceId: string;
  topic?: string;
}) {
  const topic = params.topic || "5 AI tools every developer should know in 2026";
  const shortStruct = generateYouTubeShortStructure({ topic, contentMode: "TECH" });

  const metadata: YouTubeMetadata = {
    title: `5 AI Tools Developers Must Use in 2026 #Shorts`,
    description: `Here are the top 5 game-changing AI tools for software developers in 2026.\n\n1. Autonomous Code Reviewer\n2. AI Spec-to-Code Synthesizer\n3. Neural Database Optimizer\n4. Zero-Latency API Builder\n5. Multi-Agent QA Inspector\n\nSubscribe for daily developer tips! #${topic.replace(/\s+/g, "")} #DeveloperTools #AITools #Shorts`,
    tags: ["AI Tools", "Developer Tools", "Coding 2026", "Shorts", "Tech", "Software Engineering"],
    hashtags: ["#AITools", "#Shorts", "#DevTools", "#Coding2026"],
    chapters: [],
  };

  return {
    title: `5 AI Tools Every Developer Should Know in 2026`,
    topic,
    aspectRatio: "9:16",
    durationSeconds: 45,
    structure: shortStruct,
    metadata,
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&h=1920&q=80",
    videoUrl: "https://cdn.ai-social-studio.internal/renders/tech_short_2026.mp4",
  };
}

/**
 * Generates a complete Tech Long-Form (16:9) educational video package for YouTube.
 */
export async function generateTechLongFormProject(params: {
  userId: string;
  workspaceId: string;
  topic?: string;
}) {
  const topic = params.topic || "Complete Guide to Multi-Agent Systems in 2026";
  const structure = await generateYouTubeLongFormStructure({ topic, targetDurationMinutes: 10, contentMode: "TECH" });

  const metadata: YouTubeMetadata = {
    title: `${topic} — Complete Architecture Guide`,
    description: `In this video, we explore the full system design and implementation of ${topic}.\n\nChapters:\n${structure.chapters
      .map((c) => `${c.timestamp} ${c.title}`)
      .join("\n")}\n\n#MultiAgent #AIAngineering #SystemDesign #TechTutorial`,
    tags: [topic, "System Design", "AI Architecture", "Software Engineering", "Tech Guide"],
    hashtags: ["#MultiAgent", "#AIAngineering", "#SystemDesign"],
    chapters: structure.chapters,
  };

  return {
    title: topic,
    topic,
    aspectRatio: "16:9",
    targetDurationMinutes: 10,
    chapters: structure.chapters,
    scenes: structure.scenes,
    metadata,
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1920&h=1080&q=80",
    videoUrl: "https://cdn.ai-social-studio.internal/renders/tech_longform_2026.mp4",
  };
}

/**
 * Generates a 9:16 Tech Short (30-45s) for "3 AI tools every developer should know".
 */
export async function generate3AIToolsShortProject(params: {
  userId: string;
  workspaceId: string;
}) {
  const topic = "3 AI tools every developer should know";
  const metadata: YouTubeMetadata = {
    title: "3 Essential AI Tools for Developers #Shorts",
    description: "Here are 3 must-have AI tools that will double your coding velocity in 2026:\n\n1. Autonomous Agent Reviewer\n2. Real-Time Schema Copilot\n3. Zero-Config Performance Profiler\n\nSubscribe for daily developer tips! #AITools #Shorts #Coding #Developer",
    tags: ["AI Tools", "Developer Tools", "Shorts", "Coding Tips", "Software Engineering"],
    hashtags: ["#AITools", "#Shorts", "#DevTools", "#Coding"],
    chapters: [],
  };

  return {
    title: "3 AI Tools Every Developer Should Know",
    topic,
    aspectRatio: "9:16",
    durationSeconds: 35,
    structure: {
      hook: "Stop manually writing boilerplate code! Here are 3 AI tools you need today.",
      points: [
        "1. Autonomous Agent Reviewer catches subtle edge case bugs before push.",
        "2. Real-Time Schema Copilot auto-generates type-safe database schemas.",
        "3. Zero-Config Performance Profiler optimizes queries in real time.",
      ],
      callToAction: "Subscribe to @aisocial for daily dev breakdowns!",
    },
    metadata,
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&h=1920&q=80",
    videoUrl: "https://cdn.ai-social-studio.internal/renders/3_ai_tools_short_2026.mp4",
  };
}


