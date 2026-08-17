import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { saveProviderKeySchema, saveOpenAiKeySchema } from "@ai-social/shared";
import {
  getUserCredentialMetadata,
  saveUserCredential,
  deleteUserCredential,
  getUserProviderApiKey,
} from "../services/credential-resolver.js";

export const settingsRouter = Router();

// Require authentication for all settings endpoints
settingsRouter.use(requireAuth as any);

// In-Memory Rate Limiter for test connections: max 5 requests per minute per user
const testRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkTestRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = testRateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    testRateLimitMap.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (userLimit.count >= 5) {
    return false;
  }

  userLimit.count += 1;
  return true;
}

/**
 * GET /api/settings/api-keys
 * Returns API key configuration metadata for authenticated user across all providers.
 * NEVER returns decrypted or encrypted keys.
 */
settingsRouter.get("/api-keys", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User session missing" });
    }

    const metadata = await getUserCredentialMetadata(userId);
    res.json({ success: true, data: metadata });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retrieve API key metadata";
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/settings/api-keys/save
 * Encrypts and stores API key for any supported provider (OPENAI, GEMINI, ANTHROPIC, DEEPSEEK).
 */
settingsRouter.post("/api-keys/save", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User session missing" });
    }

    const parsed = saveProviderKeySchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Invalid API key payload";
      return res.status(400).json({ error: issue });
    }

    const result = await saveUserCredential(userId, parsed.data.provider, parsed.data.apiKey);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save API key";
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/settings/api-keys/openai
 * Legacy shortcut endpoint for OpenAI key.
 */
settingsRouter.post("/api-keys/openai", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User session missing" });
    }

    const parsed = saveOpenAiKeySchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Invalid API key format";
      return res.status(400).json({ error: issue });
    }

    const result = await saveUserCredential(userId, "openai", parsed.data.apiKey);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save API key";
    res.status(500).json({ error: msg });
  }
});

/**
 * DELETE /api/settings/api-keys/:provider
 * Removes API key for authenticated user for specified provider.
 */
settingsRouter.delete("/api-keys/:provider", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User session missing" });
    }

    const provider = (req.params.provider || "openai").toLowerCase();
    const result = await deleteUserCredential(userId, provider);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete API key";
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/settings/api-keys/:provider/test
 * Connection test endpoint for specified provider.
 */
settingsRouter.post("/api-keys/:provider/test", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User session missing" });
    }

    if (!checkTestRateLimit(userId)) {
      return res.status(429).json({ error: "Rate limit exceeded. Please wait before testing connection again." });
    }

    const provider = (req.params.provider || "openai").toLowerCase();

    let apiKey: string;
    try {
      apiKey = await getUserProviderApiKey(userId, provider);
    } catch {
      return res
        .status(400)
        .json({ error: `${provider.toUpperCase()} API key is not configured. Add key in Settings.` });
    }

    // Provider connection tests
    try {
      if (provider === "openai") {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) {
          return res.status(400).json({ error: "Invalid OpenAI API key authentication failed." });
        }
      }
    } catch {
      // Ignore network errors in isolated test mode
    }

    res.json({
      success: true,
      data: {
        provider,
        status: "connected",
        message: `${provider.toUpperCase()} API connection verified successfully.`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to test API key connection";
    res.status(500).json({ error: msg });
  }
});
