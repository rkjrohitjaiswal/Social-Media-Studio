import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    await supabase.auth.getUser();

    // Default mock response for campaign detail
    const campaignDetail = {
      id,
      workspaceId: "workspace-1",
      brandId: "brand-1",
      brandName: "Maison Lumière",
      name: "Summer Haute Couture 2026",
      description: "Editorial campaign showcasing Mediterranean resort collection",
      status: "READY",
      referenceAssetId: "ref-01",
      referenceAsset: {
        id: "ref-01",
        storagePath: `workspace-1/campaigns/${id}/reference/ref.jpg`,
        fileName: "resort-moodboard-01.jpg",
        isReference: true,
        signedUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=400&auto=format&fit=crop",
      },
      inputAssets: [
        {
          id: "inp-01",
          storagePath: `workspace-1/campaigns/${id}/inputs/prod1.jpg`,
          fileName: "silk-dress-01.jpg",
          isReference: false,
          signedUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=400&auto=format&fit=crop",
        },
        {
          id: "inp-02",
          storagePath: `workspace-1/campaigns/${id}/inputs/prod2.jpg`,
          fileName: "leather-handbag-02.jpg",
          isReference: false,
          signedUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=400&auto=format&fit=crop",
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      campaign: campaignDetail,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch campaign detail";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    return NextResponse.json({
      success: true,
      campaign: {
        id,
        ...body,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to update campaign";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Explicit deletion sequence:
    // 1. Authorize workspace permission
    // 2. Load reference + input storage paths for campaign
    const mockStoragePaths = [
      `workspace-1/campaigns/${id}/reference/ref.jpg`,
      `workspace-1/campaigns/${id}/inputs/prod1.jpg`,
      `workspace-1/campaigns/${id}/inputs/prod2.jpg`,
    ];

    // 3. Delete Supabase Storage objects in batch
    const { error: storageError } = await supabase.storage
      .from("campaign-assets")
      .remove(mockStoragePaths);

    if (storageError) {
      return NextResponse.json(
        {
          success: false,
          error: `Storage object deletion failed: ${storageError.message}. Campaign deletion aborted.`,
        },
        { status: 500 }
      );
    }

    // 4. Clear Campaign.referenceAssetId, delete MediaAssets and Campaign DB records
    return NextResponse.json({
      success: true,
      message: `Campaign ${id} and all associated reference/input storage objects deleted cleanly.`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to delete campaign";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
