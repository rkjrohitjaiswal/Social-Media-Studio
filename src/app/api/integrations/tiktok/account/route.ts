import { NextResponse } from "next/server";
import { socialAccountService, sanitizeAccount } from "@/lib/social-engine/account-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const accountId = url.searchParams.get("accountId");
    const workspaceId = url.searchParams.get("workspaceId") || "workspace-1";

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: "Missing required 'accountId' parameter" },
        { status: 400 }
      );
    }

    const account = await socialAccountService.getAccountById(accountId, workspaceId);
    if (!account || account.platform !== "TIKTOK") {
      return NextResponse.json(
        { success: false, error: "TikTok account not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, account: sanitizeAccount(account) });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to fetch TikTok account details";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
