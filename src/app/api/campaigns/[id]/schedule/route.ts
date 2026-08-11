import { NextResponse } from "next/server";
import {
  createScheduledPublication,
  getScheduledPublicationsByCampaign,
} from "@/lib/queue/instagram-scheduler-worker";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params;
    let schedules = getScheduledPublicationsByCampaign(campaignId);

    // Auto-seed mock schedule if empty for demonstration
    if (schedules.length === 0) {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const mockSchedule = await createScheduledPublication({
        workspaceId: "workspace-1",
        campaignId,
        generatedAssetId: "gen-asset-job-1",
        socialCopyId: "copy-1",
        instagramAccountId: "ig-acc-1",
        scheduledFor: tomorrow,
        timezone: "Asia/Kolkata",
        caption: "Luxury Mediterranean Resort Haute Couture 2026",
        hashtags: ["maisonlumiere", "resort2026"],
        cta: "Discover the Mediterranean story.",
        approvalStatus: "APPROVED",
        imageStatus: "COMPLETED",
        copyStatus: "COMPLETED",
        qualityStatus: "COMPLETED",
      });
      schedules = [mockSchedule];
    }

    return NextResponse.json({
      success: true,
      schedules,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch schedules";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();

    const {
      generatedAssetId,
      socialCopyId,
      instagramAccountId,
      scheduledFor,
      timezone,
      caption,
      hashtags,
      cta,
      approvalStatus,
      imageStatus,
      copyStatus,
      qualityStatus,
    } = body;

    const schedule = await createScheduledPublication({
      workspaceId: "workspace-1",
      campaignId,
      generatedAssetId: generatedAssetId || "gen-asset-job-1",
      socialCopyId: socialCopyId || "copy-1",
      instagramAccountId: instagramAccountId || "ig-acc-1",
      scheduledFor,
      timezone: timezone || "Asia/Kolkata",
      caption: caption || "Luxury Mediterranean Haute Couture",
      hashtags: hashtags || ["maisonlumiere"],
      cta: cta || "Discover the edit.",
      approvalStatus: approvalStatus || "APPROVED",
      imageStatus: imageStatus || "COMPLETED",
      copyStatus: copyStatus || "COMPLETED",
      qualityStatus: qualityStatus || "COMPLETED",
    });

    return NextResponse.json({
      success: true,
      schedule,
      message: "Scheduled publication created successfully",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to create scheduled publication";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
