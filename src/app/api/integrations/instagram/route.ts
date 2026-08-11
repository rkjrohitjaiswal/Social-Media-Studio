import { NextResponse } from "next/server";
import { getConnectedInstagramAccount, connectInstagramAccount } from "@/lib/queue/instagram-worker";

export async function GET() {
  try {
    const workspaceId = "workspace-1";
    let account = getConnectedInstagramAccount(workspaceId);

    // Auto-seed connected account for demonstration/development
    if (!account) {
      account = connectInstagramAccount({
        workspaceId,
        instagramUserId: "ig-user-123456",
        username: "maisonlumiere_official",
        rawAccessToken: "simulated-token-987654",
      });
    }

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        workspaceId: account.workspaceId,
        instagramUserId: account.instagramUserId,
        username: account.username,
        accountType: account.accountType,
        status: account.status,
        connectedAt: account.connectedAt,
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch Instagram account";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
