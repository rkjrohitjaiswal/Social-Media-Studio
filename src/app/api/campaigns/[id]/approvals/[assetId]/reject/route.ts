import { NextResponse } from "next/server";
import { rejectAsset } from "@/lib/queue/quality-worker";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const approval = rejectAsset(assetId);

    return NextResponse.json({
      success: true,
      approval,
      message: "Asset rejected successfully",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to reject asset";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
