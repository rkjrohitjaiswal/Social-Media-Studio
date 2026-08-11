import { NextResponse } from "next/server";
import { generateSignedOAuthState } from "@/lib/security/encryption";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") || "workspace-1";
    const userId = url.searchParams.get("userId") || "user-director-123";

    const appId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "your-facebook-app-id";
    const redirectUri =
      process.env.FACEBOOK_REDIRECT_URI ||
      "http://localhost:3000/api/integrations/facebook/callback";
    const apiVersion = process.env.FACEBOOK_API_VERSION || "v25.0";

    const state = generateSignedOAuthState(workspaceId, userId);
    // Request only permissions required for Page listing, publishing, and engagement metrics
    const scope = "pages_show_list,pages_read_engagement,pages_manage_posts";

    const authUrl = `https://www.facebook.com/${apiVersion}/dialog/oauth?client_id=${encodeURIComponent(
      appId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
      scope
    )}&response_type=code&state=${encodeURIComponent(state)}`;

    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to initiate Facebook OAuth flow";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
