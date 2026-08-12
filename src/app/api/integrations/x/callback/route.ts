import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/security/encryption";
import { socialAccountService } from "@/lib/social-engine/account-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");
    if (error) {
      const redirect = new URL("/settings/social-accounts", request.url);
      redirect.searchParams.set("error", error);
      if (errorDescription) redirect.searchParams.set("error_description", errorDescription);
      return NextResponse.redirect(redirect);
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const verifier = request.headers.get("cookie")?.match(/(?:^|;\s*)x_oauth_verifier=([^;]+)/)?.[1];
    if (!code || !state || !verifier) {
      return NextResponse.json({ success: false, error: "Missing OAuth code, state, or PKCE verifier" }, { status: 400 });
    }

    const { workspaceId } = verifyOAuthState(state);
    const clientId = process.env.X_CLIENT_ID || "your-x-client-id";
    const clientSecret = process.env.X_CLIENT_SECRET;
    const redirectUri = process.env.X_REDIRECT_URI || "http://localhost:3000/api/integrations/x/callback";

    let accessToken: string;
    let refreshToken: string | undefined;
    let expiresIn = 7200;
    let externalAccountId = "mock-x-user-123";
    let username = "X User";
    let displayName = "X User";
    let profileImageUrl: string | undefined;

    const realApiEnabled = process.env.RUN_REAL_X_TEST === "true";
    if (realApiEnabled && clientId !== "your-x-client-id") {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: decodeURIComponent(verifier),
      });
      const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(clientSecret ? { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` } : {}),
        },
        body: body.toString(),
        cache: "no-store",
      });
      if (!tokenRes.ok) {
        return NextResponse.json({ success: false, error: `X token exchange failed (${tokenRes.status})` }, { status: 400 });
      }
      const token = (await tokenRes.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
      accessToken = token.access_token;
      refreshToken = token.refresh_token;
      expiresIn = token.expires_in || expiresIn;

      const meRes = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url,name,username", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!meRes.ok) return NextResponse.json({ success: false, error: "X account identity lookup failed" }, { status: 400 });
      const me = (await meRes.json()) as { data?: { id?: string; username?: string; name?: string; profile_image_url?: string } };
      externalAccountId = me.data?.id || externalAccountId;
      username = me.data?.username ? `@${me.data.username}` : username;
      displayName = me.data?.name || username;
      profileImageUrl = me.data?.profile_image_url;
    } else {
      accessToken = `mock-x-access-token-${Date.now()}`;
      refreshToken = `mock-x-refresh-token-${Date.now()}`;
    }

    await socialAccountService.connectAccount({
      workspaceId,
      platform: "X",
      externalAccountId,
      username,
      displayName,
      profileImageUrl,
      accountType: "PERSONAL",
      accessToken,
      refreshToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    });

    const redirect = new URL("/settings/social-accounts", request.url);
    redirect.searchParams.set("connected", "x");
    const response = NextResponse.redirect(redirect);
    response.cookies.set("x_oauth_verifier", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/integrations/x/callback", maxAge: 0 });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "X OAuth callback failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
