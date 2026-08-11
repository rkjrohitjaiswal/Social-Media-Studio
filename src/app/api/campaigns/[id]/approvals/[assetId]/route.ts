import { NextResponse } from "next/server";
import { approveAsset } from "@/lib/queue/quality-worker";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const approval = approveAsset(assetId);

    return NextResponse.json({
      success: true,
      approval,
      message: "Asset approved successfully",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to approve asset";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
