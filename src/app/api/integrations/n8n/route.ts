import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getN8nIntegrations,
  createN8nIntegration,
} from "@/lib/queue/n8n-webhook-worker";
import { z } from "zod";

const createIntegrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  webhookUrl: z.string().url("Valid URL required"),
  secret: z.string().optional(),
  isEnabled: z.boolean().optional(),
  eventFilters: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const requestedWorkspaceId = searchParams.get("workspaceId");
    const workspaceId = user?.id ? requestedWorkspaceId || user.id : requestedWorkspaceId || "ws-ig-pub-1";

    const integrations = getN8nIntegrations(workspaceId).map((i) => ({
      id: i.id,
      workspaceId: i.workspaceId,
      name: i.name,
      description: i.description,
      isEnabled: i.isEnabled,
      eventFilters: i.eventFilters,
      lastDeliveryAt: i.lastDeliveryAt,
      lastDeliveryStatus: i.lastDeliveryStatus,
      failureCount: i.failureCount,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: integrations,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch integrations";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const validation = createIntegrationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const workspaceId = user?.id || body.workspaceId || "ws-ig-pub-1";

    const integration = createN8nIntegration({
      workspaceId,
      name: validation.data.name,
      description: validation.data.description,
      webhookUrl: validation.data.webhookUrl,
      secret: validation.data.secret,
      isEnabled: validation.data.isEnabled,
      eventFilters: validation.data.eventFilters,
    });

    // Never return raw secret or encrypted URL in API responses!
    const safeResponse = {
      id: integration.id,
      workspaceId: integration.workspaceId,
      name: integration.name,
      description: integration.description,
      isEnabled: integration.isEnabled,
      eventFilters: integration.eventFilters,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: safeResponse,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create integration";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
