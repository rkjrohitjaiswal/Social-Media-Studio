import { NextResponse } from "next/server";
import { socialAccountService } from "@/lib/social-engine/account-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") || "workspace-1";

    const accounts = await socialAccountService.listWorkspaceAccounts(workspaceId);
    const youtubeAccounts = accounts.filter((acc) => acc.platform === "YOUTUBE");

    return NextResponse.json({ success: true, channels: youtubeAccounts });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to fetch connected YouTube channels";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
