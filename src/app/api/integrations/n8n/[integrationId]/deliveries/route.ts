import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationDeliveries } from "@/lib/queue/n8n-webhook-worker";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const requestedWorkspaceId = searchParams.get("workspaceId");
    const workspaceId = user?.id ? requestedWorkspaceId || user.id : requestedWorkspaceId || "ws-ig-pub-1";

    const deliveries = getIntegrationDeliveries(integrationId, workspaceId);

    return NextResponse.json({
      success: true,
      data: deliveries,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch deliveries";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
