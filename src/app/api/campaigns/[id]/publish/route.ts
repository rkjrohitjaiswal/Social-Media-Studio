import { NextResponse } from "next/server";
import { getPublicationsByCampaign } from "@/lib/queue/instagram-worker";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params;
    const publications = getPublicationsByCampaign(campaignId);

    return NextResponse.json({
      success: true,
      publications,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch publications";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
