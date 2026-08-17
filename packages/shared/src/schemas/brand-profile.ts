import { z } from "zod";

export const brandProfileSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  description: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().optional(),
  targetAudience: z.string().optional(),
  location: z.string().optional(),
  language: z.string().default("English"),
  timezone: z.string().default("UTC"),
  tone: z.string().optional(),
  personality: z.string().optional(),
  writingStyle: z.string().optional(),
  preferredVocabulary: z.string().optional(),
  wordsToAvoid: z.string().optional(),
  preferredCallToActionStyle: z.string().optional(),
  emojiPreference: z.string().optional(),
  hashtagStyle: z.string().optional(),
  logo: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  fontPreference: z.string().optional(),
  preferredContentTypes: z.string().optional(),
  preferredPlatforms: z.string().optional(),
  postingGoals: z.string().optional(),
  contentTopics: z.string().optional(),
  contentTopicsToAvoid: z.string().optional(),
});

export type BrandProfileInput = z.infer<typeof brandProfileSchema>;

export interface BrandProfileResponse extends BrandProfileInput {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
