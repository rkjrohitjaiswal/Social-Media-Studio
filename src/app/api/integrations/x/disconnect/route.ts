import { NextResponse } from "next/server";
import { socialAccountService } from "@/lib/social-engine/account-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { accountId?: string; workspaceId?: string };
    const workspaceId = body.workspaceId || "workspace-1";
    if (!body.accountId) return NextResponse.json({ success: false, error: "accountId is required" }, { status: 400 });
    const disconnected = await socialAccountService.disconnectAccount(body.accountId, workspaceId);
    return NextResponse.json({ success: disconnected });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to disconnect X account" }, { status: 400 });
  }
}
