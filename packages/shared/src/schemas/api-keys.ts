import { z } from "zod";

export const saveOpenAiKeySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(1, "API key cannot be empty")
    .refine((val) => val.startsWith("sk-"), {
      message: "OpenAI API key must start with 'sk-'",
    }),
});

export type SaveOpenAiKeyInput = z.infer<typeof saveOpenAiKeySchema>;

export interface ApiCredentialMetadata {
  provider: "openai" | string;
  configured: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiCredentialResponse {
  provider: "openai" | string;
  configured: boolean;
  message?: string;
}
