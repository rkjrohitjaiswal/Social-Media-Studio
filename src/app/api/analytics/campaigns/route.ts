import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCampaignAnalyticsList } from "@/lib/queue/instagram-analytics-worker";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const requestedWorkspaceId = searchParams.get("workspaceId");
    const accountId = searchParams.get("accountId") || undefined;

    const workspaceId = user?.id ? requestedWorkspaceId || user.id : requestedWorkspaceId || "ws-ig-pub-1";

    const campaigns = getCampaignAnalyticsList({
      workspaceId,
      accountId,
    });

    return NextResponse.json({
      success: true,
      data: campaigns,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch campaign analytics";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
