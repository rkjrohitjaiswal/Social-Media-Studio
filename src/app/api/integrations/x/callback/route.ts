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
    let codeVerifier: string | undefined;
    try {
      const verified = verifyOAuthState(state);
      workspaceId = verified.workspaceId;
      codeVerifier = verified.codeVerifier as string | undefined;
    } catch (stateErr: unknown) {
      const msg = stateErr instanceof Error ? stateErr.message : "Invalid state parameter";
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    const clientId = process.env.X_CLIENT_ID || process.env.NEXT_PUBLIC_X_CLIENT_ID || "your-x-client-id";
    const clientSecret = process.env.X_CLIENT_SECRET || "";
    const redirectUri =
      process.env.X_REDIRECT_URI ||
      "http://localhost:3000/api/integrations/x/callback";

    let accessToken: string;
    let refreshToken: string | undefined;
    let expiresIn: number | undefined;
    let externalAccountId = "x_user_998877";
    let username = "@studio_x_handle";
    let displayName = "Studio X Account";
    let profileImageUrl: string | undefined;

    const realApiEnabled = process.env.RUN_REAL_X_TEST === "true";

    if (realApiEnabled && clientId !== "your-x-client-id") {
      // 3. X OAuth 2.0 PKCE token exchange
      const tokenForm = new URLSearchParams({
        client_id: clientId,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: codeVerifier || "",
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };

      if (clientSecret) {
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        headers["Authorization"] = `Basic ${authHeader}`;
      }

      const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
        method: "POST",
        headers,
        body: tokenForm.toString(),
        cache: "no-store",
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text().catch(() => "");
        return NextResponse.json(
          {
            success: false,
            error: `X token exchange failed (${tokenRes.status}): ${errText.slice(0, 300)}`,
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
      expiresIn = tokenData.expires_in || 7200; // 2 hours default

      // 4. Fetch X User Details via X API v2 GET /2/users/me
      const userRes = await fetch(
        "https://api.x.com/2/users/me?user.fields=profile_image_url,name,username",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }
      );

      if (userRes.ok) {
        const userData = (await userRes.json()) as {
          data?: {
            id: string;
            name?: string;
            username?: string;
            profile_image_url?: string;
          };
        };
        const u = userData.data;
        if (u) {
          externalAccountId = u.id;
          if (u.name) displayName = u.name;
          if (u.username) username = `@${u.username.replace(/^@/, "")}`;
          if (u.profile_image_url) profileImageUrl = u.profile_image_url;
        }
      }
    } else {
      // Mock / fallback token exchange for testing
      accessToken = `mock-x-access-token-${Date.now()}`;
      refreshToken = `mock-x-refresh-token-${Date.now()}`;
      expiresIn = 7200;
      externalAccountId = "x_user_1001";
      username = "@studio_social_x";
      displayName = "Studio X Handle";
      profileImageUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";
    }

    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;

    // 5. Connect/Update account securely (encrypts access & refresh tokens)
    await socialAccountService.connectAccount({
      workspaceId,
      platform: "X",
      externalAccountId,
      username,
      displayName,
      profileImageUrl,
      accountType: "STANDARD",
      accessToken,
      refreshToken,
      tokenExpiresAt,
      metadataJson: {
        userId: externalAccountId,
      },
    });

    const successRedirect = new URL("/settings/social-accounts", request.url);
    successRedirect.searchParams.set("connected", "x");
    return NextResponse.redirect(successRedirect);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "X OAuth callback processing failed";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
