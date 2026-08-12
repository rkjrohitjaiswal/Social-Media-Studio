import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { generateSignedOAuthState } from "@/lib/security/encryption";

function base64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") || "workspace-1";
    const userId = url.searchParams.get("userId") || "user-director-123";
    const clientId = process.env.X_CLIENT_ID || "your-x-client-id";
    const redirectUri = process.env.X_REDIRECT_URI || "http://localhost:3000/api/integrations/x/callback";

    const state = generateSignedOAuthState(workspaceId, userId);
    const verifier = base64Url(randomBytes(48));
    const challenge = base64Url(createHash("sha256").update(verifier).digest());
    const scope = "tweet.read tweet.write users.read offline.access media.write";

    const authUrl = new URL("https://x.com/i/oauth2/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set("x_oauth_verifier", verifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/integrations/x/callback",
      maxAge: 600,
    });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to initiate X OAuth flow";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
