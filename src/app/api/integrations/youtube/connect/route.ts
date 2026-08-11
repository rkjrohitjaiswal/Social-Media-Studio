import { NextResponse } from "next/server";
import { generateSignedOAuthState } from "@/lib/security/encryption";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") || "workspace-1";
    const userId = url.searchParams.get("userId") || "user-director-123";

    const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID || "your-youtube-client-id";
    const redirectUri =
      process.env.YOUTUBE_REDIRECT_URI ||
      "http://localhost:3000/api/integrations/youtube/callback";

    const state = generateSignedOAuthState(workspaceId, userId);
    // YouTube Data API v3 and Analytics scopes
    const scopes = [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ].join(" ");

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(
      scopes
    )}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;

    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to initiate YouTube OAuth flow";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
