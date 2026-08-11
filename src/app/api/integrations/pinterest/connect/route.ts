import { NextResponse } from "next/server";
import { generateSignedOAuthState } from "@/lib/security/encryption";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") || "workspace-1";
    const userId = url.searchParams.get("userId") || "user-director-123";

    const appId = process.env.PINTEREST_APP_ID || process.env.PINTEREST_CLIENT_ID || "your-pinterest-app-id";
    const redirectUri =
      process.env.PINTEREST_REDIRECT_URI ||
      "http://localhost:3000/api/integrations/pinterest/callback";

    const state = generateSignedOAuthState(workspaceId, userId);
    const scope = "user_accounts:read,boards:read,boards:write,pins:read,pins:write";

    const authUrl = `https://www.pinterest.com/oauth/?client_id=${encodeURIComponent(
      appId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(
      scope
    )}&state=${encodeURIComponent(state)}`;

    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to initiate Pinterest OAuth flow";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
