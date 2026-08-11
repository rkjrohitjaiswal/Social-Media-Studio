import { NextResponse } from "next/server";
import { enqueueInstagramPublishJob } from "@/lib/queue/instagram-worker";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { id: campaignId, assetId } = await params;
    const body = await request.json();

    const {
      socialCopyId,
      caption,
      hashtags,
      cta,
      approvalStatus,
      imageStatus,
      copyStatus,
      qualityStatus,
      imageUrl,
    } = body;

    const publication = await enqueueInstagramPublishJob({
      workspaceId: "workspace-1",
      campaignId,
      generatedAssetId: assetId,
      socialCopyId: socialCopyId || "copy-1",
      caption: caption || "Luxury Mediterranean Haute Couture",
      hashtags: hashtags || ["maisonlumiere", "hautecouture"],
      cta: cta || "Discover the edit.",
      approvalStatus: approvalStatus || "APPROVED",
      imageStatus: imageStatus || "COMPLETED",
      copyStatus: copyStatus || "COMPLETED",
      qualityStatus: qualityStatus || "COMPLETED",
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop",
    });

    return NextResponse.json({
      success: true,
      publication,
      message: "Publishing job enqueued successfully",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to enqueue publishing job";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
