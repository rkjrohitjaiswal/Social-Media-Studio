import { NextResponse } from "next/server";
import { getPublicationByAsset } from "@/lib/queue/instagram-worker";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const publication = getPublicationByAsset(assetId);

    return NextResponse.json({
      success: true,
      publication,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch publication status";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
