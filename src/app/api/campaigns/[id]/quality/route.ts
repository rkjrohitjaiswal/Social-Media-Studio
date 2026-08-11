import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  enqueueQualityAnalysisJob,
  getLatestQualityAssessmentByAsset,
} from "@/lib/queue/quality-worker";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const workspaceId = user?.id || "workspace-1";
    const demoAssetId = "gen-asset-job-1";

    let assessment = getLatestQualityAssessmentByAsset(demoAssetId);

    if (!assessment) {
      assessment = await enqueueQualityAnalysisJob({
        workspaceId,
        campaignId,
        generatedAssetId: demoAssetId,
        generatedAssetPath: "generated/job-1.png",
        referenceAssetPath: "reference/resort-mood.jpg",
        inputAssetPath: "input/silk-dress-01.jpg",
        brandName: "Maison Lumière",
        toneVoice: "Editorial",
        campaignName: "Summer Haute Couture 2026",
      });
    }

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch quality assessment";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
