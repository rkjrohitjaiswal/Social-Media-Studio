import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/security/encryption";
import { connectInstagramAccount } from "@/lib/queue/instagram-worker";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.json({ success: false, error: "Missing OAuth code or state parameter" }, { status: 400 });
    }

    const { workspaceId } = verifyOAuthState(state);

    // Simulated token exchange for OAuth flow callback
    connectInstagramAccount({
      workspaceId,
      instagramUserId: "ig-user-123456",
      username: "maisonlumiere_official",
      rawAccessToken: `token-exchanged-${Date.now()}`,
    });

    return NextResponse.redirect(new URL("/settings/integrations?connected=true", request.url));
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "OAuth callback validation failed";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
