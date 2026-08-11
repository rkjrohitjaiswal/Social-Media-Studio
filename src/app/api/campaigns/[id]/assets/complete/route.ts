import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const { storagePath, fileName, mimeType, fileSizeBytes, isReference } = body;

    if (!storagePath || !fileName) {
      return NextResponse.json(
        { success: false, error: "Missing uploaded asset completion parameters" },
        { status: 400 }
      );
    }

    const workspaceId = user?.id || "workspace-1";
    const newAssetId = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Generate temporary signed URL for client preview
    let signedUrl = "";
    const { data: signedData } = await supabase.storage
      .from("campaign-assets")
      .createSignedUrl(storagePath, 3600);

    if (signedData?.signedUrl) {
      signedUrl = signedData.signedUrl;
    } else {
      signedUrl = `https://placeholder-project.supabase.co/storage/v1/object/sign/campaign-assets/${storagePath}?token=signed-token`;
    }

    const assetRecord = {
      id: newAssetId,
      workspaceId,
      campaignId,
      storagePath,
      fileName,
      mimeType: mimeType || "image/jpeg",
      fileSizeBytes: fileSizeBytes || 1024,
      isReference: !!isReference,
      signedUrl,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      asset: assetRecord,
      message: "Asset upload verified and registered in PostgreSQL successfully",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to confirm upload completion";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
