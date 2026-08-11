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

    const clientId = process.env.LINKEDIN_CLIENT_ID || "your-linkedin-client-id";
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || "your-linkedin-client-secret";
    const redirectUri =
      process.env.LINKEDIN_REDIRECT_URI ||
      "http://localhost:3000/api/integrations/linkedin/callback";

    let accessToken: string;
    let refreshToken: string | undefined;
    let expiresIn: number | undefined;
    let externalAccountId = "urn:li:person:mock-linkedin-sub-123";
    let username = "LinkedIn Member";
    let displayName = "LinkedIn Member";
    let profileImageUrl: string | undefined;

    const realApiEnabled = process.env.RUN_REAL_LINKEDIN_TEST === "true";

    if (realApiEnabled && clientId !== "your-linkedin-client-id") {
      // 3. Server-side token exchange
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      });

      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        cache: "no-store",
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text().catch(() => "");
        return NextResponse.json(
          {
            success: false,
            error: `LinkedIn token exchange failed (${tokenRes.status}): ${errText.slice(0, 300)}`,
          },
          { status: 400 }
        );
      }

      const tokenData = (await tokenRes.json()) as {
        access_token: string;
        expires_in?: number;
        refresh_token?: string;
      };

      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token;
      expiresIn = tokenData.expires_in;

      // 4. Fetch LinkedIn UserInfo profile
      const userinfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (userinfoRes.ok) {
        const userInfo = (await userinfoRes.json()) as {
          sub?: string;
          name?: string;
          given_name?: string;
          family_name?: string;
          picture?: string;
          email?: string;
        };
        if (userInfo.sub) {
          externalAccountId = userInfo.sub.startsWith("urn:li:")
            ? userInfo.sub
            : `urn:li:person:${userInfo.sub}`;
        }
        if (userInfo.name) {
          username = userInfo.name;
          displayName = userInfo.name;
        } else if (userInfo.email) {
          username = userInfo.email;
          displayName = userInfo.email;
        }
        if (userInfo.picture) {
          profileImageUrl = userInfo.picture;
        }
      }
    } else {
      // Mock / fallback token exchange for testing
      accessToken = `mock-linkedin-access-token-${Date.now()}`;
      refreshToken = `mock-linkedin-refresh-token-${Date.now()}`;
      expiresIn = 5184000; // 60 days
      externalAccountId = "urn:li:person:alex-rivera-123";
      username = "Alex Rivera";
      displayName = "Alex Rivera";
      profileImageUrl = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100";
    }

    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;

    // 5. Connect/Update account securely (encrypts access token, prevents duplicate accounts)
    await socialAccountService.connectAccount({
      workspaceId,
      platform: "LINKEDIN",
      externalAccountId,
      username,
      displayName,
      profileImageUrl,
      accountType: "PERSONAL",
      accessToken,
      refreshToken,
      tokenExpiresAt,
    });

    const successRedirect = new URL("/settings/social-accounts", request.url);
    successRedirect.searchParams.set("connected", "linkedin");
    return NextResponse.redirect(successRedirect);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "LinkedIn OAuth callback processing failed";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
