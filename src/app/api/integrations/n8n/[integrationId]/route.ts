import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getN8nIntegrationById,
  updateN8nIntegration,
  deleteN8nIntegration,
} from "@/lib/queue/n8n-webhook-worker";

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

    const integration = getN8nIntegrationById(integrationId, workspaceId);
    if (!integration) {
      return NextResponse.json({ success: false, error: "Integration not found" }, { status: 404 });
    }

    const safeResponse = {
      id: integration.id,
      workspaceId: integration.workspaceId,
      name: integration.name,
      description: integration.description,
      isEnabled: integration.isEnabled,
      eventFilters: integration.eventFilters,
      lastDeliveryAt: integration.lastDeliveryAt,
      lastDeliveryStatus: integration.lastDeliveryStatus,
      failureCount: integration.failureCount,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };

    return NextResponse.json({ success: true, data: safeResponse });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch integration";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const workspaceId = user?.id || body.workspaceId || "ws-ig-pub-1";

    const updated = updateN8nIntegration(integrationId, workspaceId, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Integration not found or unauthorized" }, { status: 404 });
    }

    const safeResponse = {
      id: updated.id,
      workspaceId: updated.workspaceId,
      name: updated.name,
      description: updated.description,
      isEnabled: updated.isEnabled,
      eventFilters: updated.eventFilters,
      updatedAt: updated.updatedAt,
    };

    return NextResponse.json({ success: true, data: safeResponse });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update integration";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}

export async function DELETE(
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

    const success = deleteN8nIntegration(integrationId, workspaceId);
    if (!success) {
      return NextResponse.json({ success: false, error: "Integration not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Integration deleted" });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete integration";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
