import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMediaAnalyticsDetail } from "@/lib/queue/instagram-analytics-worker";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const requestedWorkspaceId = searchParams.get("workspaceId");

    const workspaceId = user?.id ? requestedWorkspaceId || user.id : requestedWorkspaceId || "ws-ig-pub-1";

    const detail = getMediaAnalyticsDetail({
      workspaceId,
      mediaId,
    });

    if (!detail) {
      return NextResponse.json(
        { success: false, error: "Media publication not found or not published" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch media detail analytics";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
