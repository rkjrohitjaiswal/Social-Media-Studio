import { NextResponse } from "next/server";
import { getGenerationRunByCampaign, getGenerationRunById } from "@/lib/queue/generation-worker";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params;
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    const run = runId ? getGenerationRunById(runId) : getGenerationRunByCampaign(campaignId);

    if (!run) {
      return NextResponse.json(
        { success: false, message: "No active generation run found for this campaign" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      run,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch generation run status";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
