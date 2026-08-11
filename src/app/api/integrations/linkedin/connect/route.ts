import { NextResponse } from "next/server";
import { generateSignedOAuthState } from "@/lib/security/encryption";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") || "workspace-1";
    const userId = url.searchParams.get("userId") || "user-director-123";

    const clientId = process.env.LINKEDIN_CLIENT_ID || "your-linkedin-client-id";
    const redirectUri =
      process.env.LINKEDIN_REDIRECT_URI ||
      "http://localhost:3000/api/integrations/linkedin/callback";

    const state = generateSignedOAuthState(workspaceId, userId);
    const scope = "openid profile email w_member_social w_organization_social";

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(
      state
    )}&scope=${encodeURIComponent(scope)}`;

    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to initiate LinkedIn OAuth flow";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
