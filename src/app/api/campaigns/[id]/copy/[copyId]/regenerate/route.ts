import { NextResponse } from "next/server";
import { regenerateSocialCopyForAsset } from "@/lib/queue/social-copy-worker";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; copyId: string }> }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const { generatedAssetId } = body;

    if (!generatedAssetId) {
      return NextResponse.json(
        { success: false, error: "Missing generatedAssetId for social copy regeneration" },
        { status: 400 }
      );
    }

    const updatedCopy = await regenerateSocialCopyForAsset(generatedAssetId);

    if (!updatedCopy) {
      return NextResponse.json(
        { success: false, error: "Failed to regenerate social copy" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      copy: updatedCopy,
      message: `New social copy Version ${updatedCopy.currentVersionNumber} generated successfully`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to regenerate social copy";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
