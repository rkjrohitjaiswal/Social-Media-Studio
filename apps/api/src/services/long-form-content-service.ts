import {
  CreateContentPackageInput,
  LongFormScriptOutput,
  LongFormChapter,
} from "@ai-social/shared";
import { getUserOpenAIApiKey } from "./credential-resolver.js";

/**
 * Long-Form YouTube Script & Chapter Breakdown Service.
 * Generates structured 5, 10, 15, or 20-minute video scripts and chapter outlines.
 */
export async function generateLongFormScript(params: {
  userId: string;
  workspaceId?: string;
  input: CreateContentPackageInput;
}): Promise<LongFormScriptOutput> {
  const { userId, input } = params;
  const durationMin = input.targetDurationMinutes || 5;
  const totalSeconds = durationMin * 60;
  const numChapters = durationMin === 5 ? 4 : durationMin === 10 ? 5 : durationMin === 15 ? 6 : 8;
  const chapterSecs = totalSeconds / numChapters;

  let apiKey: string | null = null;
  try {
    apiKey = await getUserOpenAIApiKey(userId);
  } catch {
    apiKey = null;
  }

  // Try real OpenAI chat completion if apiKey is present and valid
  if (apiKey && !apiKey.startsWith("mock") && process.env.NODE_ENV !== "test") {
    try {
      const promptText = `
You are a lead YouTube scriptwriter creating a ${durationMin}-minute (${totalSeconds}s) video script.
Topic: ${input.topic}
Source Notes: ${input.sourceText || "N/A"}
Audience: ${input.audience || "Tech & Educational Audience"}
Tone: ${input.tone || "Engaging & Informative"}

Return JSON strictly matching this schema:
{
  "title": "Compelling YouTube Video Title",
  "description": "Comprehensive video description with chapters & tags...",
  "hook": "High-impact opening 10-second hook",
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "Chapter Title",
      "narration": "Detailed script narration...",
      "visualDirection": "Camera visual & graphic direction...",
      "estimatedDurationSeconds": ${chapterSecs}
    }
  ],
  "callToAction": "Subscribe CTA",
  "keywords": ["tag1", "tag2"],
  "thumbnailConcepts": ["Concept 1", "Concept 2"]
}

Requirement: Provide exactly ${numChapters} chapters, each approximately ${chapterSecs} seconds long.
`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You output valid JSON only." },
            { role: "user", content: promptText },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const contentStr = json.choices?.[0]?.message?.content;
        if (contentStr) {
          const parsed = JSON.parse(contentStr);
          if (parsed.title && Array.isArray(parsed.chapters)) {
            return parsed as LongFormScriptOutput;
          }
        }
      }
    } catch {
      // Fall through to fallback generator
    }
  }

  // Standalone / Fallback Script Generator
  const cleanTopic = input.topic.replace(/[^\w\s]/gi, "").trim();
  const sourceContext = input.sourceText ? ` (Based on provided notes: ${input.sourceText.slice(0, 80)})` : "";

  const title = `The Ultimate Guide to ${cleanTopic}: Everything You Need to Know (${durationMin} Min Breakdown)`;
  const hook = `What if everything you thought you knew about ${cleanTopic} was missing the core secret? In this ${durationMin}-minute deep dive, we break down every single layer step-by-step.`;

  const chapters: LongFormChapter[] = Array.from({ length: numChapters }, (_, i) => {
    const chNum = i + 1;
    return {
      chapterNumber: chNum,
      title: chNum === 1 ? `Introduction to ${cleanTopic}` : chNum === numChapters ? `Conclusion & Next Steps` : `Core Concept #${chNum}: ${cleanTopic} Deep Dive`,
      narration:
        chNum === 1
          ? `Welcome to our comprehensive guide on ${cleanTopic}.${sourceContext} Let's outline the core architecture.`
          : chNum === numChapters
          ? `To summarize, ${cleanTopic} revolutionizes how we approach performance and scalability. Make sure to apply these principles today.`
          : `In Chapter ${chNum}, we examine the technical mechanics of ${cleanTopic} and how it handles real-world workloads.`,
      visualDirection: `On-screen chapter title card overlay with high-resolution visual animations #${chNum}`,
      estimatedDurationSeconds: chapterSecs,
    };
  });

  const description = `${title}\n\nIn this video, we explore ${cleanTopic} across ${numChapters} detailed chapters:\n${chapters.map((c) => `00:${String(Math.floor((c.chapterNumber - 1) * (chapterSecs / 60))).padStart(2, "0")} - ${c.title}`).join("\n")}\n\nSubscribe for more technical breakdowns!`;
  const keywords = [cleanTopic.toLowerCase(), "tutorial", "tech breakdown", "deep dive", "guide"];
  const thumbnailConcepts = [
    `Bold typography: "${cleanTopic.toUpperCase()}" with split contrast background`,
    `Close-up reaction portrait with glowing architectural diagram of ${cleanTopic}`,
    `3D isometric infographic showing ${cleanTopic} workflow before & after`,
  ];

  return {
    title,
    description,
    hook,
    chapters,
    callToAction: "Subscribe and turn on notifications for weekly technical masterclasses!",
    keywords,
    thumbnailConcepts,
  };
}
