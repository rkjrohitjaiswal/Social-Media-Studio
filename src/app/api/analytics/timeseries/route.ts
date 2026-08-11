import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTimeSeriesAnalytics } from "@/lib/queue/instagram-analytics-worker";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const requestedWorkspaceId = searchParams.get("workspaceId");
    const metric = searchParams.get("metric") || "reach";
    const period = searchParams.get("period") || "30d";

    const workspaceId = user?.id ? requestedWorkspaceId || user.id : requestedWorkspaceId || "ws-ig-pub-1";

    const timeseries = getTimeSeriesAnalytics({
      workspaceId,
      metric,
      period,
    });

    return NextResponse.json({
      success: true,
      data: timeseries,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch timeseries analytics";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
