import {
  GenerateVideoScriptInput,
  VideoScriptOutput,
  videoScriptOutputSchema,
} from "@ai-social/shared";
import { getUserOpenAIApiKey } from "./credential-resolver.js";

/**
 * AI Short Video Script & Scene Breakdown Service.
 * Generates structured JSON video scripts with duration-aligned scene breakdowns.
 */
export async function generateVideoScript(params: {
  userId: string;
  workspaceId?: string;
  input: GenerateVideoScriptInput;
}): Promise<VideoScriptOutput> {
  const { userId, input } = params;
  let apiKey: string | null = null;
  try {
    apiKey = await getUserOpenAIApiKey(userId);
  } catch {
    apiKey = null;
  }

  const duration = input.durationSeconds || 30;
  const numScenes = duration === 15 ? 3 : duration === 30 ? 5 : 6;
  const perSceneDuration = duration / numScenes;

  // Try real OpenAI completion if apiKey is present and valid
  if (apiKey && !apiKey.startsWith("mock") && process.env.NODE_ENV !== "test") {
    try {
      const promptText = `
You are a senior social media director creating a ${duration}-second video script for ${input.platform}.
Topic: ${input.topic || input.prompt}
Creative Prompt: ${input.prompt}
Target Audience: ${input.audience || "General Social Audience"}
Tone: ${input.tone || "Engaging & Luxury"}

Generate a JSON object strictly matching this schema:
{
  "title": "Catchy Short Video Title",
  "hook": "Opening 2-second visual/verbal hook",
  "scenes": [
    {
      "sceneNumber": 1,
      "narration": "Voiceover narration text...",
      "visualDirection": "Visual camera angle/image description...",
      "caption": "Short on-screen caption...",
      "durationSeconds": ${perSceneDuration}
    }
  ],
  "callToAction": "Clear CTA for ${input.platform}"
}

Requirement: Provide exactly ${numScenes} scenes, each approximately ${perSceneDuration} seconds long.
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
          const parsedRaw = JSON.parse(contentStr);
          const validated = videoScriptOutputSchema.safeParse(parsedRaw);
          if (validated.success) {
            return validated.data;
          }
        }
      }
    } catch {
      // Fallback structured generator below
    }
  }

  // Fallback / Standalone Structured Script Generator
  const cleanPrompt = input.prompt.replace(/[^\w\s]/gi, "").trim();
  const title = input.topic
    ? `${input.topic} — ${duration}s Masterclass`
    : `Mastering ${cleanPrompt.slice(0, 30)} (${duration}s)`;

  const hook = `Discover how ${cleanPrompt.slice(0, 25)} transforms your social strategy in seconds.`;
  const scenes = Array.from({ length: numScenes }, (_, i) => {
    const sceneNum = i + 1;
    return {
      sceneNumber: sceneNum,
      narration:
        sceneNum === 1
          ? `Welcome to the breakdown of ${cleanPrompt}. Let's dive straight in.`
          : sceneNum === numScenes
          ? `Follow us for more insights on ${cleanPrompt}.`
          : `Step ${sceneNum}: Key aspect of ${cleanPrompt} explained in detail.`,
      visualDirection: `Dynamic high-definition product visual showcase #${sceneNum}`,
      caption: sceneNum === 1 ? `Focus: ${cleanPrompt.slice(0, 20)}` : `Key Insight #${sceneNum}`,
      durationSeconds: perSceneDuration,
    };
  });

  const callToAction = `Follow @aisocial for daily ${input.platform} content tips!`;

  const fallbackOutput: VideoScriptOutput = {
    title,
    hook,
    scenes,
    callToAction,
  };

  const validation = videoScriptOutputSchema.safeParse(fallbackOutput);
  if (!validation.success) {
    throw new Error(`Invalid script output format generated: ${validation.error.message}`);
  }

  return validation.data;
}
