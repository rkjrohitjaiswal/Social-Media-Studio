import { NextResponse } from "next/server";
import { generateSignedOAuthState, generatePKCEChallenge } from "@/lib/security/encryption";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") || "workspace-1";
    const userId = url.searchParams.get("userId") || "user-director-123";

    const clientId = process.env.X_CLIENT_ID || process.env.NEXT_PUBLIC_X_CLIENT_ID || "your-x-client-id";
    const redirectUri =
      process.env.X_REDIRECT_URI ||
      "http://localhost:3000/api/integrations/x/callback";

    const { codeVerifier, codeChallenge } = generatePKCEChallenge();

    const state = generateSignedOAuthState(workspaceId, userId, { codeVerifier });

    const scopes = [
      "tweet.read",
      "tweet.write",
      "users.read",
      "offline.access",
      "media.write",
    ].join(" ");

    const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
      scopes
    )}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(
      codeChallenge
    )}&code_challenge_method=S256`;

    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to initiate X OAuth flow";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
