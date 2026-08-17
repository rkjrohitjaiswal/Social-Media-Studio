import { z } from "zod";

export const supportedProvidersSchema = z.enum(["OPENAI", "GEMINI", "ANTHROPIC", "DEEPSEEK"]);
export type SupportedProvider = z.infer<typeof supportedProvidersSchema>;

export const providerModelsRegistry: Record<SupportedProvider, { id: string; name: string; default?: boolean }[]> = {
  OPENAI: [
    { id: "gpt-4o-mini", name: "GPT-4o Mini (Default Text)", default: true },
    { id: "gpt-4o", name: "GPT-4o (High Quality)" },
    { id: "gpt-image-2", name: "GPT Image 2 (Image Generation)" },
  ],
  GEMINI: [
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Fast)", default: true },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (High Reasoning)" },
  ],
  ANTHROPIC: [
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet (Default)", default: true },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku (Fast)" },
  ],
  DEEPSEEK: [
    { id: "deepseek-chat", name: "DeepSeek V3 Chat", default: true },
    { id: "deepseek-coder", name: "DeepSeek Coder" },
  ],
};

export const saveProviderKeySchema = z.object({
  provider: supportedProvidersSchema,
  apiKey: z
    .string()
    .trim()
    .min(1, "API key cannot be empty"),
});

export type SaveProviderKeyInput = z.infer<typeof saveProviderKeySchema>;

export interface ProviderCredentialStatus {
  provider: Lowercase<SupportedProvider> | string;
  configured: boolean;
  displayName: string;
  createdAt?: string;
  updatedAt?: string;
}
