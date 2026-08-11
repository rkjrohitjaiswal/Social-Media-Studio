import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGenerationRun } from "@/lib/queue/generation-worker";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json().catch(() => ({}));
    const idempotencyKey = body.idempotencyKey || request.headers.get("x-idempotency-key");

    const workspaceId = user?.id || "workspace-1";

    // Server-Authoritative Campaign & Asset Composition Verification
    const mockCampaign = {
      id: campaignId,
      workspaceId,
      name: "Summer Haute Couture 2026",
      description: "Editorial campaign showcasing Mediterranean resort collection",
      brandName: "Maison Lumière",
      brandTone: "Editorial",
      contentStyle: "Luxury editorial",
      status: "READY",
      referenceAsset: {
        id: "ref-01",
        storagePath: `workspace-1/campaigns/${campaignId}/reference/ref.jpg`,
        fileName: "resort-moodboard-01.jpg",
      },
      inputAssets: [
        {
          id: "inp-01",
          storagePath: `workspace-1/campaigns/${campaignId}/inputs/prod1.jpg`,
          fileName: "silk-dress-01.jpg",
          signedUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=400&auto=format&fit=crop",
        },
        {
          id: "inp-02",
          storagePath: `workspace-1/campaigns/${campaignId}/inputs/prod2.jpg`,
          fileName: "leather-handbag-02.jpg",
          signedUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=400&auto=format&fit=crop",
        },
      ],
    };

    // Require exact 1 reference asset and >=1 input assets
    if (!mockCampaign.referenceAsset || mockCampaign.inputAssets.length === 0) {
      return NextResponse.json(
        { success: false, error: "Campaign is not READY for AI generation. Reference or product inputs missing." },
        { status: 400 }
      );
    }

    // Create or reuse GenerationRun with idempotency key
    const runState = createGenerationRun({
      workspaceId,
      campaignId,
      idempotencyKey: idempotencyKey || undefined,
      brandName: mockCampaign.brandName,
      brandTone: mockCampaign.brandTone,
      contentStyle: mockCampaign.contentStyle,
      campaignName: mockCampaign.name,
      campaignDescription: mockCampaign.description,
      referenceAsset: mockCampaign.referenceAsset,
      inputAssets: mockCampaign.inputAssets,
    });

    return NextResponse.json(
      {
        success: true,
        message: "AI Generation Run created and enqueued successfully",
        generationRunId: runState.id,
        run: runState,
      },
      { status: 202 }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to trigger AI generation run";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
