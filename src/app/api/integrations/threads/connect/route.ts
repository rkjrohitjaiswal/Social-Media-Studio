import { NextResponse } from "next/server";
import { generateSignedOAuthState } from "@/lib/security/encryption";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") || "workspace-1";
    const userId = url.searchParams.get("userId") || "user-director-123";

    const appId = process.env.THREADS_APP_ID || process.env.META_APP_ID || "your-threads-app-id";
    const redirectUri =
      process.env.THREADS_REDIRECT_URI ||
      "http://localhost:3000/api/integrations/threads/callback";

    const state = generateSignedOAuthState(workspaceId, userId);
    const scope = "threads_basic,threads_content_publish,threads_read_replies,threads_manage_insights";

    const authUrl = `https://threads.net/oauth/authorize?client_id=${encodeURIComponent(
      appId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(
      state
    )}&scope=${encodeURIComponent(scope)}&response_type=code`;

    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to initiate Threads OAuth flow";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
