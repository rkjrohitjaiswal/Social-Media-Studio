import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { generateSignedOAuthState, verifyOAuthState } from "../utils/encryption.js";
import {
  listWorkspaceSocialAccounts,
  getWorkspaceSocialAccountById,
  connectSocialAccount,
  disconnectSocialAccount,
  disconnectPlatformAccounts,
} from "../services/social-account-service.js";
import { getAllProvidersConfigStatus } from "../config/provider-config.js";

export const integrationsRouter = Router();

// GET /api/integrations/providers/status -> Provider readiness status (no secrets exposed)
integrationsRouter.get("/providers/status", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const statuses = getAllProvidersConfigStatus();
    return res.json({ success: true, data: statuses });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to retrieve provider configuration status" });
  }
});

// Helper to construct OAuth callback URL dynamically or from env
function getCallbackUrl(platform: string): string {
  const apiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return `${apiBase}/api/integrations/${platform}/callback`;
}

// GET /api/integrations/accounts -> List all DB-backed connected accounts for active workspace
integrationsRouter.get("/accounts", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.workspaceId || "demo-workspace-1";
    const accounts = await listWorkspaceSocialAccounts(workspaceId);
    return res.json({ success: true, data: accounts });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to list social accounts" });
  }
});

// GET /api/integrations/accounts/:id -> Get specific account by ID for active workspace
integrationsRouter.get("/accounts/:id", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.workspaceId || "demo-workspace-1";
    const account = await getWorkspaceSocialAccountById(req.params.id, workspaceId);
    if (!account) {
      return res.status(404).json({ error: "Social account not found or access denied" });
    }
    return res.json({ success: true, data: account });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to retrieve social account" });
  }
});

// POST /api/integrations/connect -> Connect / Store social account metadata in DB
integrationsRouter.post("/connect", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.workspaceId || "demo-workspace-1";
    const userId = req.user!.id;
    const { platform, externalAccountId, username, displayName, profileImageUrl, accountType, accessToken, refreshToken } = req.body;

    if (!platform || !externalAccountId) {
      return res.status(400).json({ error: "platform and externalAccountId are required" });
    }

    const connected = await connectSocialAccount({
      workspaceId,
      userId,
      platform,
      externalAccountId,
      username,
      displayName,
      profileImageUrl,
      accountType,
      accessToken,
      refreshToken,
    });

    return res.status(201).json({ success: true, data: connected });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to connect social account" });
  }
});

// POST /api/integrations/disconnect/:id -> Disconnect specific social account
integrationsRouter.post("/disconnect/:id", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.workspaceId || "demo-workspace-1";
    const result = await disconnectSocialAccount(req.params.id, workspaceId);
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    return res.json({ success: true, message: result.message });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to disconnect social account" });
  }
});

// Instagram
integrationsRouter.get("/instagram", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.workspaceId || "demo-workspace-1";
  const accounts = await listWorkspaceSocialAccounts(workspaceId);
  const ig = accounts.find((a) => a.platform === "INSTAGRAM");

  if (ig) {
    return res.json({
      connected: true,
      account: ig,
    });
  }

  return res.json({
    connected: false,
    account: null,
  });
});

integrationsRouter.get("/instagram/connect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  const state = generateSignedOAuthState(req.workspaceId || "demo-workspace-1", req.user?.id || "demo-user-id");
  const callbackUrl = getCallbackUrl("instagram");
  const metaClientId = process.env.META_CLIENT_ID || "demo_meta_client_id";
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${metaClientId}&redirect_uri=${encodeURIComponent(
    callbackUrl
  )}&state=${state}&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement`;
  res.redirect(authUrl);
});

integrationsRouter.get("/instagram/callback", (req: AuthenticatedRequest, res: Response) => {
  const { code, state } = req.query;
  const webBaseUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

  if (!code || !state) {
    return res.redirect(`${webBaseUrl}/settings/integrations?error=missing_oauth_params`);
  }

  try {
    verifyOAuthState(state as string);
    res.redirect(`${webBaseUrl}/settings/integrations?connected=instagram`);
  } catch (err: any) {
    res.redirect(`${webBaseUrl}/settings/integrations?error=${encodeURIComponent(err.message)}`);
  }
});

integrationsRouter.post("/instagram/disconnect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: "Instagram disconnected" });
});

// Facebook
integrationsRouter.get("/facebook/pages", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: "fb-page-1", name: "Maison Lumiere Official", category: "Home Decor Brand" },
    ],
  });
});

integrationsRouter.get("/facebook/connect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  const state = generateSignedOAuthState(req.workspaceId || "demo-workspace-1", req.user?.id || "demo-user-id");
  const callbackUrl = getCallbackUrl("facebook");
  res.redirect(`https://www.facebook.com/v18.0/dialog/oauth?client_id=demo_fb&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`);
});

integrationsRouter.get("/facebook/callback", (req: AuthenticatedRequest, res: Response) => {
  const webBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  res.redirect(`${webBaseUrl}/settings/integrations?connected=facebook`);
});

integrationsRouter.post("/facebook/disconnect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: "Facebook disconnected" });
});

// LinkedIn
integrationsRouter.get("/linkedin/connect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  const state = generateSignedOAuthState(req.workspaceId || "demo-workspace-1", req.user?.id || "demo-user-id");
  const callbackUrl = getCallbackUrl("linkedin");
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=demo_linkedin&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`);
});

integrationsRouter.get("/linkedin/callback", (req: AuthenticatedRequest, res: Response) => {
  const webBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  res.redirect(`${webBaseUrl}/settings/integrations?connected=linkedin`);
});

integrationsRouter.post("/linkedin/disconnect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: "LinkedIn disconnected" });
});

// Pinterest
integrationsRouter.get("/pinterest/boards", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: [{ id: "pin-board-1", name: "Luxury Living Spaces" }],
  });
});

integrationsRouter.get("/pinterest/connect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  const state = generateSignedOAuthState(req.workspaceId || "demo-workspace-1", req.user?.id || "demo-user-id");
  const callbackUrl = getCallbackUrl("pinterest");
  res.redirect(`https://www.pinterest.com/oauth/?response_type=code&client_id=demo_pinterest&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`);
});

integrationsRouter.get("/pinterest/callback", (req: AuthenticatedRequest, res: Response) => {
  const webBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  res.redirect(`${webBaseUrl}/settings/integrations?connected=pinterest`);
});

integrationsRouter.post("/pinterest/disconnect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: "Pinterest disconnected" });
});

// Threads
integrationsRouter.get("/threads/connect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  const state = generateSignedOAuthState(req.workspaceId || "demo-workspace-1", req.user?.id || "demo-user-id");
  const callbackUrl = getCallbackUrl("threads");
  res.redirect(`https://threads.net/oauth/authorize?client_id=demo_threads&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`);
});

integrationsRouter.get("/threads/callback", (req: AuthenticatedRequest, res: Response) => {
  const webBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  res.redirect(`${webBaseUrl}/settings/integrations?connected=threads`);
});

integrationsRouter.post("/threads/disconnect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: "Threads disconnected" });
});

// TikTok
integrationsRouter.get("/tiktok/account", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: { username: "maisonlumiere_official" } });
});

integrationsRouter.get("/tiktok/connect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  const state = generateSignedOAuthState(req.workspaceId || "demo-workspace-1", req.user?.id || "demo-user-id");
  const callbackUrl = getCallbackUrl("tiktok");
  res.redirect(`https://www.tiktok.com/v2/auth/authorize/?client_key=demo_tiktok&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`);
});

integrationsRouter.get("/tiktok/callback", (req: AuthenticatedRequest, res: Response) => {
  const webBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  res.redirect(`${webBaseUrl}/settings/integrations?connected=tiktok`);
});

integrationsRouter.post("/tiktok/disconnect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: "TikTok disconnected" });
});

// YouTube
integrationsRouter.get("/youtube/channels", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: [{ id: "yt-ch-1", title: "Maison Lumiere Design Studio" }] });
});

integrationsRouter.get("/youtube/connect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  const state = generateSignedOAuthState(req.workspaceId || "demo-workspace-1", req.user?.id || "demo-user-id");
  const callbackUrl = getCallbackUrl("youtube");
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=demo_youtube&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`);
});

integrationsRouter.get("/youtube/callback", (req: AuthenticatedRequest, res: Response) => {
  const webBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  res.redirect(`${webBaseUrl}/settings/integrations?connected=youtube`);
});

integrationsRouter.post("/youtube/disconnect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: "YouTube disconnected" });
});

// X (Twitter)
integrationsRouter.get("/x/connect", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  const state = generateSignedOAuthState(req.workspaceId || "demo-workspace-1", req.user?.id || "demo-user-id");
  const callbackUrl = getCallbackUrl("x");
  res.redirect(`https://twitter.com/i/oauth2/authorize?response_type=code&client_id=demo_x&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`);
});

integrationsRouter.get("/x/callback", (req: AuthenticatedRequest, res: Response) => {
  const webBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  res.redirect(`${webBaseUrl}/settings/integrations?connected=x`);
});
