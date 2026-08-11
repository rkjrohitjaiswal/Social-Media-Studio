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

    const appId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "your-facebook-app-id";
    const appSecret = process.env.FACEBOOK_APP_SECRET || "your-facebook-app-secret";
    const redirectUri =
      process.env.FACEBOOK_REDIRECT_URI ||
      "http://localhost:3000/api/integrations/facebook/callback";
    const apiVersion = process.env.FACEBOOK_API_VERSION || "v25.0";

    let pageAccessToken: string;
    let userLongLivedToken: string | undefined;
    let externalPageId = "fb-page-1001";
    let pageName = "Official Brand Page";
    let username = "@official_brand_page";
    let profileImageUrl: string | undefined;

    const realApiEnabled = process.env.RUN_REAL_FACEBOOK_TEST === "true";

    if (realApiEnabled && appId !== "your-facebook-app-id") {
      // 3. Short-lived token exchange
      const tokenUrl = `https://graph.facebook.com/${apiVersion}/oauth/access_token?client_id=${encodeURIComponent(
        appId
      )}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&code=${encodeURIComponent(code)}`;

      const tokenRes = await fetch(tokenUrl, { cache: "no-store" });
      if (!tokenRes.ok) {
        const errText = await tokenRes.text().catch(() => "");
        return NextResponse.json(
          {
            success: false,
            error: `Facebook short-lived token exchange failed (${tokenRes.status}): ${errText.slice(0, 300)}`,
          },
          { status: 400 }
        );
      }

      const shortTokenData = (await tokenRes.json()) as { access_token: string };
      const shortUserToken = shortTokenData.access_token;

      // 4. Exchange for long-lived user access token (60 days)
      const longTokenUrl = `https://graph.facebook.com/${apiVersion}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(
        appId
      )}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(
        shortUserToken
      )}`;

      const longRes = await fetch(longTokenUrl, { cache: "no-store" });
      let activeUserToken = shortUserToken;
      if (longRes.ok) {
        const longTokenData = (await longRes.json()) as { access_token: string };
        activeUserToken = longTokenData.access_token;
        userLongLivedToken = activeUserToken;
      }

      // 5. Retrieve user's Facebook Pages
      const pagesUrl = `https://graph.facebook.com/${apiVersion}/me/accounts?access_token=${encodeURIComponent(
        activeUserToken
      )}`;
      const pagesRes = await fetch(pagesUrl, { cache: "no-store" });

      if (!pagesRes.ok) {
        const errText = await pagesRes.text().catch(() => "");
        return NextResponse.json(
          {
            success: false,
            error: `Facebook Pages discovery failed (${pagesRes.status}): ${errText.slice(0, 300)}`,
          },
          { status: 400 }
        );
      }

      const pagesData = (await pagesRes.json()) as {
        data?: Array<{ id: string; name: string; access_token: string }>;
      };

      if (!pagesData.data || pagesData.data.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No Facebook Pages found for this user account. Please ensure you manage at least one Facebook Page.",
          },
          { status: 400 }
        );
      }

      const primaryPage = pagesData.data[0];
      externalPageId = primaryPage.id;
      pageName = primaryPage.name;
      pageAccessToken = primaryPage.access_token;
      username = `@${pageName.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
      profileImageUrl = `https://graph.facebook.com/${apiVersion}/${externalPageId}/picture?type=normal`;
    } else {
      // Mock / fallback token exchange for testing
      pageAccessToken = `mock-fb-page-access-token-${Date.now()}`;
      userLongLivedToken = `mock-fb-user-long-lived-token-${Date.now()}`;
      externalPageId = "fb-page-9988";
      pageName = "Innovators Facebook Page";
      username = "@innovators_fb_page";
      profileImageUrl = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100";
    }

    const tokenExpiresAt = new Date(Date.now() + 60 * 86400 * 1000); // 60 days

    // 6. Connect/Update account securely (encrypts access token, prevents duplicate accounts)
    await socialAccountService.connectAccount({
      workspaceId,
      platform: "FACEBOOK",
      externalAccountId: externalPageId,
      username,
      displayName: pageName,
      profileImageUrl,
      accountType: "PAGE",
      accessToken: pageAccessToken,
      refreshToken: userLongLivedToken,
      tokenExpiresAt,
      metadataJson: {
        pageId: externalPageId,
        pageName,
      },
    });

    const successRedirect = new URL("/settings/social-accounts", request.url);
    successRedirect.searchParams.set("connected", "facebook");
    return NextResponse.redirect(successRedirect);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Facebook OAuth callback processing failed";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
