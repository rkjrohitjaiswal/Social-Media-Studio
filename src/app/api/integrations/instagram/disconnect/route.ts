import { NextResponse } from "next/server";
import { disconnectInstagramAccount } from "@/lib/queue/instagram-worker";

export async function POST() {
  try {
    const workspaceId = "workspace-1";
    const success = disconnectInstagramAccount(workspaceId);

    return NextResponse.json({
      success,
      message: "Instagram account disconnected successfully",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to disconnect Instagram account";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
