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

    const appId = process.env.THREADS_APP_ID || process.env.META_APP_ID || "your-threads-app-id";
    const appSecret =
      process.env.THREADS_APP_SECRET || process.env.META_APP_SECRET || "your-threads-app-secret";
    const redirectUri =
      process.env.THREADS_REDIRECT_URI ||
      "http://localhost:3000/api/integrations/threads/callback";

    let accessToken: string;
    let expiresIn: number | undefined;
    let externalAccountId = "threads-user-1001";
    let username = "@tech_creator";
    let displayName = "Tech Creator";
    let profileImageUrl: string | undefined;

    const realApiEnabled = process.env.RUN_REAL_THREADS_TEST === "true";

    if (realApiEnabled && appId !== "your-threads-app-id") {
      // 3. Short-lived token exchange
      const tokenForm = new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      });

      const tokenRes = await fetch("https://graph.threads.net/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenForm.toString(),
        cache: "no-store",
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text().catch(() => "");
        return NextResponse.json(
          {
            success: false,
            error: `Threads short-lived token exchange failed (${tokenRes.status}): ${errText.slice(
              0,
              300
            )}`,
          },
          { status: 400 }
        );
      }

      const shortTokenData = (await tokenRes.json()) as {
        access_token: string;
        user_id: string;
      };

      const shortToken = shortTokenData.access_token;
      externalAccountId = shortTokenData.user_id;

      // 4. Exchange for long-lived access token (60 days)
      const longTokenUrl = `https://graph.threads.net/access_token?grant_type=fb_exchange_token&client_secret=${encodeURIComponent(
        appSecret
      )}&access_token=${encodeURIComponent(shortToken)}`;

      const longTokenRes = await fetch(longTokenUrl, { cache: "no-store" });
      if (longTokenRes.ok) {
        const longTokenData = (await longTokenRes.json()) as {
          access_token: string;
          expires_in?: number;
        };
        accessToken = longTokenData.access_token;
        expiresIn = longTokenData.expires_in || 5184000;
      } else {
        accessToken = shortToken;
        expiresIn = 3600;
      }

      // 5. Fetch Threads user profile
      const profileUrl = `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${encodeURIComponent(
        accessToken
      )}`;
      const profileRes = await fetch(profileUrl, { cache: "no-store" });
      if (profileRes.ok) {
        const profileData = (await profileRes.json()) as {
          id?: string;
          username?: string;
          threads_profile_picture_url?: string;
        };
        if (profileData.id) externalAccountId = profileData.id;
        if (profileData.username) {
          username = `@${profileData.username.replace(/^@/, "")}`;
          displayName = profileData.username;
        }
        if (profileData.threads_profile_picture_url) {
          profileImageUrl = profileData.threads_profile_picture_url;
        }
      }
    } else {
      // Mock / fallback token exchange for testing
      accessToken = `mock-threads-access-token-${Date.now()}`;
      expiresIn = 5184000; // 60 days
      externalAccountId = "threads-user-8877";
      username = "@haute_couture";
      displayName = "Haute Couture Studio";
      profileImageUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";
    }

    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;

    // 6. Connect/Update account securely (encrypts access token, prevents duplicate accounts)
    await socialAccountService.connectAccount({
      workspaceId,
      platform: "THREADS",
      externalAccountId,
      username,
      displayName,
      profileImageUrl,
      accountType: "STANDARD",
      accessToken,
      tokenExpiresAt,
    });

    const successRedirect = new URL("/settings/social-accounts", request.url);
    successRedirect.searchParams.set("connected", "threads");
    return NextResponse.redirect(successRedirect);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Threads OAuth callback processing failed";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
