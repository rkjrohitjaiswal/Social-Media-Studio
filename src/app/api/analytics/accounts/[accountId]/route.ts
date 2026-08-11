import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnalyticsOverview } from "@/lib/queue/instagram-analytics-worker";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const requestedWorkspaceId = searchParams.get("workspaceId");

    const workspaceId = user?.id ? requestedWorkspaceId || user.id : requestedWorkspaceId || "ws-ig-pub-1";

    const overview = getAnalyticsOverview({
      workspaceId,
      accountId,
    });

    return NextResponse.json({
      success: true,
      data: {
        accountId,
        overview,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch account analytics";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
