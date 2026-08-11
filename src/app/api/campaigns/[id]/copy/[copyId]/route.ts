import { NextResponse } from "next/server";
import { updateSocialCopyUserEdit, updateSocialCopyApprovalStatus } from "@/lib/queue/social-copy-worker";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; copyId: string }> }
) {
  try {
    const { copyId } = await params;
    const body = await request.json();

    const { caption, hashtags, cta, altText, approvalStatus } = body;

    let updatedCopy = updateSocialCopyUserEdit(copyId, { caption, hashtags, cta, altText });

    if (approvalStatus) {
      updatedCopy = updateSocialCopyApprovalStatus(copyId, approvalStatus);
    }

    if (!updatedCopy) {
      return NextResponse.json(
        { success: false, error: `Social copy record ${copyId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      copy: updatedCopy,
      message: "Social copy updated successfully",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to update social copy";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
