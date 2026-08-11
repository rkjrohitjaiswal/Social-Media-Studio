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
    try {
      const verified = verifyOAuthState(state);
      workspaceId = verified.workspaceId;
    } catch (stateErr: unknown) {
      const msg = stateErr instanceof Error ? stateErr.message : "Invalid state parameter";
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID || "your-youtube-client-id";
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || "your-youtube-client-secret";
    const redirectUri =
      process.env.YOUTUBE_REDIRECT_URI ||
      "http://localhost:3000/api/integrations/youtube/callback";

    let accessToken: string;
    let refreshToken: string | undefined;
    let expiresIn: number | undefined;
    let externalAccountId = "UC_youtube_channel_123";
    let username = "@tech_studio_youtube";
    let displayName = "Tech Studio Channel";
    let profileImageUrl: string | undefined;

    const realApiEnabled = process.env.RUN_REAL_YOUTUBE_TEST === "true";

    if (realApiEnabled && clientId !== "your-youtube-client-id") {
      // 3. Google OAuth token exchange
      const tokenForm = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      });

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
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
            error: `YouTube token exchange failed (${tokenRes.status}): ${errText.slice(0, 300)}`,
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
      expiresIn = tokenData.expires_in || 3600; // 1 hour default

      // 4. Fetch YouTube Channel Details via YouTube Data API v3
      const channelRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }
      );

      if (channelRes.ok) {
        const channelData = (await channelRes.json()) as {
          items?: Array<{
            id: string;
            snippet?: {
              title?: string;
              customUrl?: string;
              thumbnails?: { default?: { url?: string } };
            };
          }>;
        };
        const item = channelData.items?.[0];
        if (item) {
          externalAccountId = item.id;
          if (item.snippet?.title) displayName = item.snippet.title;
          if (item.snippet?.customUrl) {
            username = item.snippet.customUrl.startsWith("@")
              ? item.snippet.customUrl
              : `@${item.snippet.customUrl}`;
          } else if (item.snippet?.title) {
            username = `@${item.snippet.title.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
          }
          if (item.snippet?.thumbnails?.default?.url) {
            profileImageUrl = item.snippet.thumbnails.default.url;
          }
        }
      }
    } else {
      // Mock / fallback token exchange for testing
      accessToken = `mock-yt-access-token-${Date.now()}`;
      refreshToken = `mock-yt-refresh-token-${Date.now()}`;
      expiresIn = 3600;
      externalAccountId = "UC_mock_channel_8899";
      username = "@studio_youtube_creator";
      displayName = "Studio YouTube Channel";
      profileImageUrl = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=100";
    }

    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;

    // 5. Connect/Update account securely (encrypts access & refresh tokens)
    await socialAccountService.connectAccount({
      workspaceId,
      platform: "YOUTUBE",
      externalAccountId,
      username,
      displayName,
      profileImageUrl,
      accountType: "CHANNEL",
      accessToken,
      refreshToken,
      tokenExpiresAt,
      metadataJson: {
        channelId: externalAccountId,
      },
    });

    const successRedirect = new URL("/settings/social-accounts", request.url);
    successRedirect.searchParams.set("connected", "youtube");
    return NextResponse.redirect(successRedirect);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "YouTube OAuth callback processing failed";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
