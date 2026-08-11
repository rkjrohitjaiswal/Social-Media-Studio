import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/security/encryption";
import { socialAccountService } from "@/lib/social-engine/account-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const errorParam = url.searchParams.get("error");
    const errorDesc = url.searchParams.get("error_description");

    // 1. Handle user cancellation or OAuth denial gracefully
    if (errorParam) {
      const redirectUrl = new URL("/settings/social-accounts", request.url);
      redirectUrl.searchParams.set("error", errorParam);
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

    const appId = process.env.PINTEREST_APP_ID || process.env.PINTEREST_CLIENT_ID || "your-pinterest-app-id";
    const appSecret = process.env.PINTEREST_APP_SECRET || process.env.PINTEREST_CLIENT_SECRET || "your-pinterest-app-secret";
    const redirectUri =
      process.env.PINTEREST_REDIRECT_URI ||
      "http://localhost:3000/api/integrations/pinterest/callback";

    let accessToken: string;
    let refreshToken: string | undefined;
    let expiresIn: number | undefined;
    let externalAccountId = "pin-user-5001";
    let username = "@style_inspiration";
    let displayName = "Style Inspiration";
    let profileImageUrl: string | undefined;

    const realApiEnabled = process.env.RUN_REAL_PINTEREST_TEST === "true";

    if (realApiEnabled && appId !== "your-pinterest-app-id") {
      // 3. Basic Auth token exchange for Pinterest API v5
      const authHeader = `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`;
      const tokenForm = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      });

      const tokenRes = await fetch("https://api.pinterest.com/v5/oauth/token", {
        method: "POST",
        headers: {
          Authorization: authHeader,
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
            error: `Pinterest token exchange failed (${tokenRes.status}): ${errText.slice(0, 300)}`,
          },
          { status: 400 }
        );
      }

      const tokenData = (await tokenRes.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token;
      expiresIn = tokenData.expires_in || 30 * 86400; // 30 days default

      // 4. Fetch Pinterest user account profile
      const userRes = await fetch("https://api.pinterest.com/v5/user_account", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (userRes.ok) {
        const userData = (await userRes.json()) as {
          id?: string;
          username?: string;
          profile_image?: string;
        };
        if (userData.id) externalAccountId = userData.id;
        if (userData.username) {
          username = `@${userData.username.replace(/^@/, "")}`;
          displayName = userData.username;
        }
        if (userData.profile_image) {
          profileImageUrl = userData.profile_image;
        }
      }
    } else {
      // Mock / fallback token exchange for testing
      accessToken = `mock-pinterest-access-token-${Date.now()}`;
      refreshToken = `mock-pinterest-refresh-token-${Date.now()}`;
      expiresIn = 30 * 86400;
      externalAccountId = "pin-user-9911";
      username = "@tech_inspiration";
      displayName = "Tech Inspiration Board";
      profileImageUrl = "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=100";
    }

    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;

    // 5. Connect/Update account securely (encrypts access token, prevents duplicate accounts)
    await socialAccountService.connectAccount({
      workspaceId,
      platform: "PINTEREST",
      externalAccountId,
      username,
      displayName,
      profileImageUrl,
      accountType: "BUSINESS",
      accessToken,
      refreshToken,
      tokenExpiresAt,
    });

    const successRedirect = new URL("/settings/social-accounts", request.url);
    successRedirect.searchParams.set("connected", "pinterest");
    return NextResponse.redirect(successRedirect);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Pinterest OAuth callback processing failed";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
