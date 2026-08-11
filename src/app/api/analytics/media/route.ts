import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMediaAnalyticsList } from "@/lib/queue/instagram-analytics-worker";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const requestedWorkspaceId = searchParams.get("workspaceId");
    const accountId = searchParams.get("accountId") || undefined;
    const campaignId = searchParams.get("campaignId") || undefined;
    const sortParam = searchParams.get("sort");
    const sort = (
      ["engagementRate", "reach", "saves", "shares", "publishedAt"].includes(sortParam || "")
        ? sortParam
        : "engagementRate"
    ) as "engagementRate" | "reach" | "saves" | "shares" | "publishedAt";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const workspaceId = user?.id ? requestedWorkspaceId || user.id : requestedWorkspaceId || "ws-ig-pub-1";

    const mediaData = getMediaAnalyticsList({
      workspaceId,
      accountId,
      campaignId,
      sort,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: mediaData,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch media analytics";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
