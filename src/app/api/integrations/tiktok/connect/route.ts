import { NextResponse } from "next/server";
import { generateSignedOAuthState } from "@/lib/security/encryption";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") || "workspace-1";
    const userId = url.searchParams.get("userId") || "user-director-123";

    const clientKey = process.env.TIKTOK_CLIENT_KEY || process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || "your-tiktok-client-key";
    const redirectUri =
      process.env.TIKTOK_REDIRECT_URI ||
      "http://localhost:3000/api/integrations/tiktok/callback";

    const state = generateSignedOAuthState(workspaceId, userId);
    // TikTok Content Posting API v2 scopes including video performance analytics
    const scope = "user.info.basic,video.publish,video.upload,video.list";

    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(
      clientKey
    )}&scope=${encodeURIComponent(scope)}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${encodeURIComponent(state)}`;

    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to initiate TikTok OAuth flow";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
