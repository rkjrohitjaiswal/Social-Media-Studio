import { z } from "zod";

export const maxHashtagsConfig = parseInt(process.env.SOCIAL_COPY_MAX_HASHTAGS || "12", 10);

export const socialCopyOutputSchema = z.object({
  caption: z.string().min(5, "Caption must be at least 5 characters long"),
  hashtags: z
    .array(z.string().transform((tag) => tag.replace(/^#/, "").trim()))
    .max(maxHashtagsConfig, `Maximum ${maxHashtagsConfig} hashtags permitted`),
  cta: z.string().min(2, "Call-to-action must be at least 2 characters long"),
  altText: z.string().min(5, "Accessibility alt-text must be at least 5 characters long"),
});

export type GeneratedSocialCopy = z.infer<typeof socialCopyOutputSchema> & {
  providerRequestId?: string;
  model: string;
};

export interface TextGenerationParams {
  brandName: string;
  brandDescription?: string | null;
  toneVoice: string;
  contentStyle?: string | null;
  targetAudience?: string | null;
  defaultCta?: string | null;
  guidelines?: string | null;
  campaignName: string;
  campaignDescription?: string | null;
  inputFileName: string;
  generatedAssetFileName?: string;
}

export interface AITextProvider {
  generateSocialCopy(params: TextGenerationParams): Promise<GeneratedSocialCopy>;
}

export function buildTextSystemPrompt(params: TextGenerationParams): string {
  const ctaInstruction = params.defaultCta
    ? `Use or align closely with default brand CTA: "${params.defaultCta}".`
    : `Create a refined, non-aggressive CTA suitable for ${params.brandName}.`;

  return `
You are the lead social copywriter and accessibility specialist for ${params.brandName}.

Brand Identity & Voice Rules:
- Tone of Voice: ${params.toneVoice}
- Content Style: ${params.contentStyle || "Editorial luxury"}
- Target Audience: ${params.targetAudience || "High-end luxury consumers"}
- Guidelines: ${params.guidelines || "Adhere strictly to premium aesthetic language."}

Campaign Context:
- Campaign: ${params.campaignName}
- Description: ${params.campaignDescription || "N/A"}
- Product Input: ${params.inputFileName}

Strict Copy Requirements:
1. Caption:
   - Natural human-readable writing aligned with the ${params.toneVoice} brand tone.
   - Relevant to the product (${params.inputFileName}).
   - Avoid generic AI clichés ("In a world of...", "Unleash your...").
   - Do NOT include hashtags inside the caption text body.
   - ANTI-HALLUCINATION: Do NOT invent product specifications, materials, prices, discounts, certifications, or awards not stated.

2. Hashtags:
   - Return an array of up to ${maxHashtagsConfig} targeted hashtags.
   - Provide clean strings WITHOUT the '#' prefix (e.g. ["luxuryfashion", "editorialstyle"]).

3. CTA:
   - ${ctaInstruction}

4. Alt Text:
   - Concise, factual visual description of the product subject and editorial setting for screen readers.
   - No hashtag symbols, keyword stuffing, or promotional fluff.

Return a valid JSON object matching:
{
  "caption": "string",
  "hashtags": ["string"],
  "cta": "string",
  "altText": "string"
}
  `.trim();
}

export class OpenAITextProvider implements AITextProvider {
  private apiKey: string | undefined;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
  }

  async generateSocialCopy(params: TextGenerationParams): Promise<GeneratedSocialCopy> {
    if (!this.apiKey || this.apiKey === "your-openai-api-key") {
      // Fallback simulation for test/development environments without real API keys
      const simulatedOutput = {
        caption: `Introducing the new ${params.inputFileName.replace(/\.[^/.]+$/, "")} from ${params.brandName}. Designed with timeless elegance for the ${params.campaignName} series.`,
        hashtags: ["hautecouture", "maisonlumiere", "resortcollection", "luxuryeditorial"].slice(0, maxHashtagsConfig),
        cta: params.defaultCta || "Discover the collection.",
        altText: `Editorial presentation of ${params.inputFileName} styled in a luxury setting.`,
      };

      const validated = socialCopyOutputSchema.parse(simulatedOutput);
      return {
        ...validated,
        providerRequestId: `req-text-sim-${Date.now()}`,
        model: this.model,
      };
    }

    const systemPrompt = buildTextSystemPrompt(params);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate Instagram social copy for product ${params.inputFileName}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI Text API error (${response.status}): ${errText}`);
    }

    const resJson = await response.json();
    const content = resJson.choices?.[0]?.message?.content;
    if (!content) throw new Error("Missing content in OpenAI response");

    const parsedJson = JSON.parse(content);
    const validated = socialCopyOutputSchema.parse(parsedJson);

    return {
      ...validated,
      providerRequestId: resJson.id || `req-${Date.now()}`,
      model: this.model,
    };
  }
}
