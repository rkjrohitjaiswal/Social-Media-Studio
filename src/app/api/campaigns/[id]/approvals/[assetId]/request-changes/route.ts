import { NextResponse } from "next/server";
import { requestChangesOnAsset } from "@/lib/queue/quality-worker";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const body = await request.json();
    const { reviewerComment } = body;

    if (!reviewerComment || !reviewerComment.trim()) {
      return NextResponse.json(
        { success: false, error: "Reviewer comment is required when requesting changes" },
        { status: 400 }
      );
    }

    const approval = requestChangesOnAsset(assetId, reviewerComment);

    return NextResponse.json({
      success: true,
      approval,
      message: "Changes requested successfully",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to request changes";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
