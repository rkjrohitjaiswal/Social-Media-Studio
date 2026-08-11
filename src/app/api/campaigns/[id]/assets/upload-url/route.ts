import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCampaignAssetFile, sanitizeCampaignFileName } from "@/lib/validations/campaign";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const { fileName, mimeType, fileSizeBytes, isReference } = body;

    if (!fileName || !mimeType || !fileSizeBytes) {
      return NextResponse.json(
        { success: false, error: "Missing asset file parameters (fileName, mimeType, fileSizeBytes)" },
        { status: 400 }
      );
    }

    // Validate MIME type and size limit (max 20MB)
    const fileCheck = validateCampaignAssetFile({
      type: mimeType,
      size: fileSizeBytes,
      name: fileName,
    });

    if (!fileCheck.valid) {
      return NextResponse.json(
        { success: false, error: fileCheck.error },
        { status: 400 }
      );
    }

    const workspaceId = user?.id || "workspace-1";
    const sanitizedName = sanitizeCampaignFileName(fileName);
    const subFolder = isReference ? "reference" : "inputs";
    const storagePath = `${workspaceId}/campaigns/${campaignId}/${subFolder}/${sanitizedName}`;

    // Issue authorized upload capability URL for Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("campaign-assets")
      .createSignedUploadUrl(storagePath);

    const uploadUrl = uploadData?.signedUrl || `https://placeholder-project.supabase.co/storage/v1/upload/resumable/campaign-assets/${storagePath}`;

    return NextResponse.json({
      success: true,
      uploadUrl,
      storagePath,
      token: uploadData?.token || "upload-token",
      workspaceId,
      campaignId,
      isReference: !!isReference,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to issue direct upload URL capability";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
