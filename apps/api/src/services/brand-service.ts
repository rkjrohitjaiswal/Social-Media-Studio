import prisma from "@ai-social/database";
import { BrandProfileInput, BrandProfileResponse } from "@ai-social/shared";

const brandMemoryStore = new Map<string, any>();

export async function getBrandProfile(userId: string): Promise<BrandProfileResponse | null> {
  if (!userId) throw new Error("User ID is required to fetch brand profile");

  let profile = brandMemoryStore.get(userId);
  if (!profile) {
    try {
      const dbProfile = await prisma.brandProfile.findUnique({
        where: { userId },
      });
      if (dbProfile) {
        profile = {
          ...dbProfile,
          description: dbProfile.description || undefined,
          industry: dbProfile.industry || undefined,
          website: dbProfile.website || undefined,
          targetAudience: dbProfile.targetAudience || undefined,
          location: dbProfile.location || undefined,
          tone: dbProfile.tone || undefined,
          personality: dbProfile.personality || undefined,
          writingStyle: dbProfile.writingStyle || undefined,
          preferredVocabulary: dbProfile.preferredVocabulary || undefined,
          wordsToAvoid: dbProfile.wordsToAvoid || undefined,
          preferredCallToActionStyle: dbProfile.preferredCallToActionStyle || undefined,
          emojiPreference: dbProfile.emojiPreference || undefined,
          hashtagStyle: dbProfile.hashtagStyle || undefined,
          logo: dbProfile.logo || undefined,
          primaryColor: dbProfile.primaryColor || undefined,
          secondaryColor: dbProfile.secondaryColor || undefined,
          accentColor: dbProfile.accentColor || undefined,
          fontPreference: dbProfile.fontPreference || undefined,
          preferredContentTypes: dbProfile.preferredContentTypes || undefined,
          preferredPlatforms: dbProfile.preferredPlatforms || undefined,
          postingGoals: dbProfile.postingGoals || undefined,
          contentTopics: dbProfile.contentTopics || undefined,
          contentTopicsToAvoid: dbProfile.contentTopicsToAvoid || undefined,
          createdAt: dbProfile.createdAt.toISOString(),
          updatedAt: dbProfile.updatedAt.toISOString(),
        };
        brandMemoryStore.set(userId, profile);
      }
    } catch {
      // Memory store fallback
    }
  }

  return profile || null;
}

export async function saveBrandProfile(userId: string, data: BrandProfileInput): Promise<BrandProfileResponse> {
  if (!userId) throw new Error("User ID is required to save brand profile");

  const now = new Date();
  const profile: BrandProfileResponse = {
    id: `brand_${userId}`,
    userId,
    ...data,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  brandMemoryStore.set(userId, profile);

  try {
    await prisma.brandProfile.upsert({
      where: { userId },
      update: {
        brandName: data.brandName,
        description: data.description,
        industry: data.industry,
        website: data.website,
        targetAudience: data.targetAudience,
        location: data.location,
        language: data.language || "English",
        timezone: data.timezone || "UTC",
        tone: data.tone,
        personality: data.personality,
        writingStyle: data.writingStyle,
        preferredVocabulary: data.preferredVocabulary,
        wordsToAvoid: data.wordsToAvoid,
        preferredCallToActionStyle: data.preferredCallToActionStyle,
        emojiPreference: data.emojiPreference,
        hashtagStyle: data.hashtagStyle,
        logo: data.logo,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor,
        fontPreference: data.fontPreference,
        preferredContentTypes: data.preferredContentTypes,
        preferredPlatforms: data.preferredPlatforms,
        postingGoals: data.postingGoals,
        contentTopics: data.contentTopics,
        contentTopicsToAvoid: data.contentTopicsToAvoid,
        updatedAt: now,
      },
      create: {
        userId,
        brandName: data.brandName,
        description: data.description,
        industry: data.industry,
        website: data.website,
        targetAudience: data.targetAudience,
        location: data.location,
        language: data.language || "English",
        timezone: data.timezone || "UTC",
        tone: data.tone,
        personality: data.personality,
        writingStyle: data.writingStyle,
        preferredVocabulary: data.preferredVocabulary,
        wordsToAvoid: data.wordsToAvoid,
        preferredCallToActionStyle: data.preferredCallToActionStyle,
        emojiPreference: data.emojiPreference,
        hashtagStyle: data.hashtagStyle,
        logo: data.logo,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor,
        fontPreference: data.fontPreference,
        preferredContentTypes: data.preferredContentTypes,
        preferredPlatforms: data.preferredPlatforms,
        postingGoals: data.postingGoals,
        contentTopics: data.contentTopics,
        contentTopicsToAvoid: data.contentTopicsToAvoid,
      },
    });
  } catch {
    // Memory store fallback
  }

  return profile;
}

export async function buildBrandPromptContext(userId: string): Promise<string> {
  const brand = await getBrandProfile(userId);
  if (!brand) return "";

  const lines: string[] = ["\n[BRAND KIT CONTEXT]"];
  if (brand.brandName) lines.push(`- Brand Name: ${brand.brandName}`);
  if (brand.industry) lines.push(`- Industry: ${brand.industry}`);
  if (brand.targetAudience) lines.push(`- Target Audience: ${brand.targetAudience}`);
  if (brand.tone) lines.push(`- Tone of Voice: ${brand.tone}`);
  if (brand.personality) lines.push(`- Brand Personality: ${brand.personality}`);
  if (brand.writingStyle) lines.push(`- Writing Style: ${brand.writingStyle}`);
  if (brand.preferredVocabulary) lines.push(`- Preferred Vocabulary: ${brand.preferredVocabulary}`);
  if (brand.wordsToAvoid) lines.push(`- Words to Avoid STRICTLY: ${brand.wordsToAvoid}`);
  if (brand.preferredCallToActionStyle) lines.push(`- CTA Style: ${brand.preferredCallToActionStyle}`);
  if (brand.emojiPreference) lines.push(`- Emoji Preference: ${brand.emojiPreference}`);
  if (brand.hashtagStyle) lines.push(`- Hashtag Style: ${brand.hashtagStyle}`);

  return lines.join("\n");
}

export function clearInMemoryBrandProfiles(): void {
  brandMemoryStore.clear();
}
