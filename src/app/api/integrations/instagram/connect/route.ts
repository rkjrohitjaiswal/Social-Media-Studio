import { NextResponse } from "next/server";
import { generateSignedOAuthState } from "@/lib/security/encryption";

export async function GET() {
  try {
    const workspaceId = "workspace-1";
    const userId = "user-director-123";

    const state = generateSignedOAuthState(workspaceId, userId);
    const appId = process.env.META_APP_ID || "1234567890";
    const redirectUri = encodeURIComponent(
      process.env.META_REDIRECT_URI || "http://localhost:3000/api/integrations/instagram/callback"
    );

    const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement`;

    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to initiate OAuth flow";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
