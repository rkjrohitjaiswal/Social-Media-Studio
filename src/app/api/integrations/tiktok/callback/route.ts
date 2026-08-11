import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/security/encryption";
import { socialAccountService } from "@/lib/social-engine/account-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const errorParam = url.searchParams.get("error") || url.searchParams.get("err_code");
    const errorDesc = url.searchParams.get("error_description");

    // 1. Handle user cancellation or OAuth denial gracefully
    if (errorParam) {
      const redirectUrl = new URL("/settings/social-accounts", request.url);
      redirectUrl.searchParams.set("error", String(errorParam));
      if (errorDesc) redirectUrl.searchParams.set("error_description", errorDesc);
      return NextResponse.redirect(redirectUrl);
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.json(
        { success: false, error: "Missing required OAuth code or state parameter" },
        { status: 400 }
      );
    }

    // 2. Validate signed OAuth state & CSRF protection
    let workspaceId: string;
    try {
      const verified = verifyOAuthState(state);
      workspaceId = verified.workspaceId;
    } catch (stateErr: unknown) {
      const msg = stateErr instanceof Error ? stateErr.message : "Invalid state parameter";
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    const clientKey = process.env.TIKTOK_CLIENT_KEY || process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || "your-tiktok-client-key";
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET || "your-tiktok-client-secret";
    const redirectUri =
      process.env.TIKTOK_REDIRECT_URI ||
      "http://localhost:3000/api/integrations/tiktok/callback";

    let accessToken: string;
    let refreshToken: string | undefined;
    let expiresIn: number | undefined;
    let externalAccountId = "tiktok-user-7711";
    let username = "@tiktok_creator";
    let displayName = "TikTok Creator Studio";
    let profileImageUrl: string | undefined;

    const realApiEnabled = process.env.RUN_REAL_TIKTOK_TEST === "true";

    if (realApiEnabled && clientKey !== "your-tiktok-client-key") {
      // 3. TikTok v2 OAuth token exchange
      const tokenForm = new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      });

      const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenForm.toString(),
        cache: "no-store",
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text().catch(() => "");
        return NextResponse.json(
          {
            success: false,
            error: `TikTok token exchange failed (${tokenRes.status}): ${errText.slice(0, 300)}`,
          },
          { status: 400 }
        );
      }

      const tokenData = (await tokenRes.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        open_id?: string;
      };

      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token;
      expiresIn = tokenData.expires_in || 86400; // 24h default
      if (tokenData.open_id) externalAccountId = tokenData.open_id;

      // 4. Fetch TikTok User Profile
      const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (userRes.ok) {
        const userData = (await userRes.json()) as {
          data?: { user?: { open_id?: string; display_name?: string; avatar_url?: string } };
        };
        const u = userData.data?.user;
        if (u?.open_id) externalAccountId = u.open_id;
        if (u?.display_name) {
          displayName = u.display_name;
          username = `@${u.display_name.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
        }
        if (u?.avatar_url) profileImageUrl = u.avatar_url;
      }
    } else {
      // Mock / fallback token exchange for testing
      accessToken = `mock-tiktok-access-token-${Date.now()}`;
      refreshToken = `mock-tiktok-refresh-token-${Date.now()}`;
      expiresIn = 86400;
      externalAccountId = "tiktok-user-8899";
      username = "@tech_tiktok_creator";
      displayName = "Tech TikTok Creator";
      profileImageUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";
    }

    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;

    // 5. Connect/Update account securely (encrypts access token, prevents duplicate accounts)
    await socialAccountService.connectAccount({
      workspaceId,
      platform: "TIKTOK",
      externalAccountId,
      username,
      displayName,
      profileImageUrl,
      accountType: "CREATOR",
      accessToken,
      refreshToken,
      tokenExpiresAt,
      metadataJson: {
        openId: externalAccountId,
      },
    });

    const successRedirect = new URL("/settings/social-accounts", request.url);
    successRedirect.searchParams.set("connected", "tiktok");
    return NextResponse.redirect(successRedirect);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "TikTok OAuth callback processing failed";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
