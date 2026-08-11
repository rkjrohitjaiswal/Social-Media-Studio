import { NextResponse } from "next/server";
import { enqueueQualityAnalysisJob } from "@/lib/queue/quality-worker";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json().catch(() => ({}));
    const { generatedAssetId } = body;

    if (!generatedAssetId) {
      return NextResponse.json(
        { success: false, error: "Missing generatedAssetId for quality retry" },
        { status: 400 }
      );
    }

    const newAssessment = await enqueueQualityAnalysisJob({
      workspaceId: "workspace-1",
      campaignId,
      generatedAssetId,
      generatedAssetPath: `generated/${generatedAssetId}.png`,
      referenceAssetPath: "reference/resort-mood.jpg",
      inputAssetPath: "input/product.jpg",
      brandName: "Maison Lumière",
      toneVoice: "Editorial",
      campaignName: "Resort Campaign",
    });

    return NextResponse.json({
      success: true,
      assessment: newAssessment,
      message: "Quality assessment retried successfully",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to retry quality assessment";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
