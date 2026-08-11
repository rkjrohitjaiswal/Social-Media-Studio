import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { testIntegrationWebhook } from "@/lib/queue/n8n-webhook-worker";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let workspaceId = "ws-ig-pub-1";
    try {
      const body = await request.json();
      if (body.workspaceId) workspaceId = body.workspaceId;
    } catch {
      // Ignore JSON body parse errors for GET/empty POST
    }

    if (user?.id) {
      workspaceId = user.id;
    }

    const delivery = await testIntegrationWebhook(integrationId, workspaceId);

    return NextResponse.json({
      success: true,
      message: "Test webhook event queued and dispatched",
      delivery: {
        id: delivery.id,
        eventId: delivery.eventId,
        eventType: delivery.eventType,
        status: delivery.status,
        responseStatus: delivery.responseStatus,
        responseBodyPreview: delivery.responseBodyPreview,
        errorMessage: delivery.errorMessage,
        createdAt: delivery.createdAt,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to trigger test webhook";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
