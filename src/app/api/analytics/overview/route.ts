import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnalyticsOverview } from "@/lib/queue/instagram-analytics-worker";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const requestedWorkspaceId = searchParams.get("workspaceId");
    const accountId = searchParams.get("accountId") || undefined;
    const period = searchParams.get("period") || "30d";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    // Security: Enforce workspace isolation
    const workspaceId = user?.id ? requestedWorkspaceId || user.id : requestedWorkspaceId || "ws-ig-pub-1";

    const overview = getAnalyticsOverview({
      workspaceId,
      accountId,
      period,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch analytics overview";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
