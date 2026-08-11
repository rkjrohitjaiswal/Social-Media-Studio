import { NextResponse } from "next/server";
import { socialAccountService } from "@/lib/social-engine/account-service";
import { PinterestProvider } from "@/lib/social-engine/providers/pinterest-provider";

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
    if (!account || account.platform !== "PINTEREST") {
      return NextResponse.json(
        { success: false, error: "Pinterest account not found or access denied" },
        { status: 404 }
      );
    }

    const provider = new PinterestProvider();
    const boards = await provider.getBoards(account);

    return NextResponse.json({ success: true, boards });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to fetch Pinterest boards";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
