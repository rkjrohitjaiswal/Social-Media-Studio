import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncInstagramAnalytics } from "@/lib/queue/instagram-analytics-worker";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let workspaceId = user?.id || "ws-ig-pub-1";
    let accountId: string | undefined;

    try {
      const body = await request.json();
      if (body.workspaceId) workspaceId = body.workspaceId;
      if (body.accountId) accountId = body.accountId;
    } catch {
      // Body optional
    }

    const result = await syncInstagramAnalytics({
      workspaceId,
      instagramAccountId: accountId,
    });

    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to execute analytics sync";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
