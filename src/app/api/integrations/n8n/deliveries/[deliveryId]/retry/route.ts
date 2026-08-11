import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { retryWebhookDelivery } from "@/lib/queue/n8n-webhook-worker";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ deliveryId: string }> }
) {
  try {
    const { deliveryId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let workspaceId = "ws-ig-pub-1";
    try {
      const body = await request.json();
      if (body.workspaceId) workspaceId = body.workspaceId;
    } catch {
      // Ignore body parse errors
    }

    if (user?.id) {
      workspaceId = user.id;
    }

    const delivery = await retryWebhookDelivery(deliveryId, workspaceId);
    if (!delivery) {
      return NextResponse.json({ success: false, error: "Delivery record not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: delivery,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to retry webhook delivery";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
