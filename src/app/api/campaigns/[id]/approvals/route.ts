import { NextResponse } from "next/server";
import { getLatestQualityAssessmentByAsset, getReviewEventsByAsset, getAssetApprovalRecord } from "@/lib/queue/quality-worker";
import { getSocialCopyByAsset } from "@/lib/queue/social-copy-worker";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params;
    const demoAssetId = "gen-asset-job-1";

    const qualityAssessment = getLatestQualityAssessmentByAsset(demoAssetId);
    const socialCopy = getSocialCopyByAsset(demoAssetId);
    const reviewEvents = getReviewEventsByAsset(demoAssetId);
    const approvalRecord = getAssetApprovalRecord(demoAssetId);

    return NextResponse.json({
      success: true,
      campaignId,
      assetId: demoAssetId,
      approvalRecord: approvalRecord || {
        generatedAssetId: demoAssetId,
        campaignId,
        workspaceId: "workspace-1",
        reviewStatus: "READY_FOR_REVIEW",
      },
      qualityAssessment,
      socialCopy,
      reviewEvents,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch approvals data";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
