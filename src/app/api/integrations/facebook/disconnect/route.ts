import { NextResponse } from "next/server";
import { socialAccountService } from "@/lib/social-engine/account-service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const accountId = body.accountId;
    const workspaceId = body.workspaceId || "workspace-1";

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: "Missing required 'accountId' parameter" },
        { status: 400 }
      );
    }

    const success = await socialAccountService.disconnectAccount(accountId, workspaceId);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Account not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Facebook account disconnected successfully",
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to disconnect Facebook account";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  return POST(request);
}
