import { ProviderError } from "../integrations/ai/provider.js";

export type ProviderType =
  | "AI_IMAGE"
  | "AI_TEXT"
  | "AI_VOICE"
  | "AI_VIDEO"
  | "YOUTUBE"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "LINKEDIN"
  | "TIKTOK"
  | "X"
  | "PINTEREST";

export type ProviderStatusMode = "CONFIGURED" | "UNAVAILABLE" | "MOCK";

export interface ProviderStatusInfo {
  provider: ProviderType;
  mode: ProviderStatusMode;
  configuredProviderName?: string;
  missingEnvVars: string[];
  isProductionReady: boolean;
}

const PROVIDER_ENV_MAP: Record<ProviderType, { name: string; envGroups: string[][] }> = {
  AI_IMAGE: {
    name: "AI Image Generation Provider",
    envGroups: [["OPENAI_API_KEY"], ["STABILITY_API_KEY"], ["REPLICATE_API_KEY"]],
  },
  AI_TEXT: {
    name: "AI Text Generation Provider",
    envGroups: [["OPENAI_API_KEY"], ["ANTHROPIC_API_KEY"]],
  },
  AI_VOICE: {
    name: "AI Voiceover Provider",
    envGroups: [["ELEVENLABS_API_KEY"]],
  },
  AI_VIDEO: {
    name: "AI Video Generation Provider",
    envGroups: [["RUNWAY_API_KEY"], ["LUMA_API_KEY"], ["KLING_API_KEY"]],
  },
  YOUTUBE: {
    name: "YouTube Publishing Provider",
    envGroups: [["YOUTUBE_API_KEY"], ["YOUTUBE_REFRESH_TOKEN"]],
  },
  INSTAGRAM: {
    name: "Instagram Publishing Provider",
    envGroups: [["INSTAGRAM_ACCESS_TOKEN"]],
  },
  FACEBOOK: {
    name: "Facebook Publishing Provider",
    envGroups: [["FACEBOOK_ACCESS_TOKEN"]],
  },
  LINKEDIN: {
    name: "LinkedIn Publishing Provider",
    envGroups: [["LINKEDIN_ACCESS_TOKEN"]],
  },
  TIKTOK: {
    name: "TikTok Publishing Provider",
    envGroups: [["TIKTOK_ACCESS_TOKEN"]],
  },
  X: {
    name: "X (Twitter) Publishing Provider",
    envGroups: [["X_API_KEY"], ["X_ACCESS_TOKEN"]],
  },
  PINTEREST: {
    name: "Pinterest Publishing Provider",
    envGroups: [["PINTEREST_ACCESS_TOKEN"]],
  },
};

function isKeyConfigured(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed === "" || trimmed.startsWith("your-") || trimmed.includes("dummy") || trimmed.includes("placeholder")) {
    return false;
  }
  return true;
}

export function getProviderConfigStatus(provider: ProviderType): ProviderStatusInfo {
  const meta = PROVIDER_ENV_MAP[provider];
  if (!meta) {
    return {
      provider,
      mode: "UNAVAILABLE",
      missingEnvVars: [],
      isProductionReady: false,
    };
  }

  // Check if any of the envGroups is fully satisfied
  let satisfiedGroup: string[] | null = null;
  const missingEnvVars: string[] = [];

  for (const group of meta.envGroups) {
    const isGroupValid = group.every((envVar) => isKeyConfigured(process.env[envVar]));
    if (isGroupValid) {
      satisfiedGroup = group;
      break;
    } else {
      group.forEach((envVar) => {
        if (!missingEnvVars.includes(envVar)) {
          missingEnvVars.push(envVar);
        }
      });
    }
  }

  if (satisfiedGroup) {
    return {
      provider,
      mode: "CONFIGURED",
      configuredProviderName: meta.name,
      missingEnvVars: [],
      isProductionReady: true,
    };
  }

  // In development / test environment, we allow mock fallback unless STRICT_PRODUCTION_PROVIDERS=true
  const isDevOrTest = process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development" || process.env.ALLOW_MOCK_PROVIDERS !== "false";
  const isStrictProd = process.env.STRICT_PRODUCTION_PROVIDERS === "true";

  const mode: ProviderStatusMode = isDevOrTest && !isStrictProd ? "MOCK" : "UNAVAILABLE";

  return {
    provider,
    mode,
    configuredProviderName: mode === "MOCK" ? `${meta.name} (Development Mock)` : undefined,
    missingEnvVars,
    isProductionReady: false,
  };
}

export function getAllProvidersConfigStatus(): Record<ProviderType, ProviderStatusInfo> {
  const result = {} as Record<ProviderType, ProviderStatusInfo>;
  const keys: ProviderType[] = [
    "AI_IMAGE",
    "AI_TEXT",
    "AI_VOICE",
    "AI_VIDEO",
    "YOUTUBE",
    "INSTAGRAM",
    "FACEBOOK",
    "LINKEDIN",
    "TIKTOK",
    "X",
    "PINTEREST",
  ];

  for (const key of keys) {
    result[key] = getProviderConfigStatus(key);
  }

  return result;
}

export function assertProviderConfigured(provider: ProviderType, requireProduction: boolean = false): void {
  const status = getProviderConfigStatus(provider);

  if (status.mode === "UNAVAILABLE" || (requireProduction && status.mode !== "CONFIGURED")) {
    throw new ProviderError(
      "AUTHENTICATION",
      `Provider ${provider} is not configured for production. Missing required environment variables: [${status.missingEnvVars.join(", ")}]. Please configure server environment variables.`
    );
  }
}
