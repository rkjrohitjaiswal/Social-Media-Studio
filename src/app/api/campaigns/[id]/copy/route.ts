import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSocialCopiesByCampaign, enqueueSocialCopyJob } from "@/lib/queue/social-copy-worker";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const workspaceId = user?.id || "workspace-1";
    let copies = getSocialCopiesByCampaign(campaignId);

    // Seed initial mock social copies if empty
    if (copies.length === 0) {
      const mockCopy1 = await enqueueSocialCopyJob({
        workspaceId,
        campaignId,
        generationJobId: "job-1",
        generatedAssetId: "gen-asset-job-1",
        brand: {
          name: "Maison Lumière",
          description: "Luxury Mediterranean resort fashion house",
          toneVoice: "Editorial",
          contentStyle: "Fashion editorial",
          defaultCta: "Discover the Mediterranean collection.",
        },
        campaign: {
          name: "Summer Haute Couture 2026",
          description: "Resort capsule series",
        },
        inputFileName: "silk-dress-01.jpg",
      });

      const mockCopy2 = await enqueueSocialCopyJob({
        workspaceId,
        campaignId,
        generationJobId: "job-2",
        generatedAssetId: "gen-asset-job-2",
        brand: {
          name: "Maison Lumière",
          description: "Luxury Mediterranean resort fashion house",
          toneVoice: "Editorial",
          contentStyle: "Fashion editorial",
          defaultCta: "Discover the Mediterranean collection.",
        },
        campaign: {
          name: "Summer Haute Couture 2026",
          description: "Resort capsule series",
        },
        inputFileName: "leather-handbag-02.jpg",
      });

      copies = [mockCopy1, mockCopy2];
    }

    return NextResponse.json({
      success: true,
      copies,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch social copies";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
