import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { campaignSetupSchema } from "@/lib/validations/campaign";
import { dispatchN8nEvent } from "@/lib/integrations/n8n/event-dispatcher";

interface MemoryAsset {
  id: string;
  storagePath: string;
  fileName: string;
  isReference: boolean;
  signedUrl?: string;
}

interface MemoryCampaign {
  id: string;
  workspaceId: string;
  brandId: string;
  name: string;
  description?: string | null;
  status: string;
  referenceAsset?: MemoryAsset | null;
  inputAssets?: MemoryAsset[];
  createdAt: string;
  updatedAt: string;
}

// Memory store fallback for standalone demonstration/testing if DB connection is unavailable
const memoryCampaigns: MemoryCampaign[] = [
  {
    id: "campaign-01",
    workspaceId: "workspace-1",
    brandId: "brand-1",
    name: "Summer Haute Couture 2026",
    description: "Editorial campaign showcasing Mediterranean resort collection",
    status: "READY",
    referenceAsset: {
      id: "ref-01",
      storagePath: "workspace-1/campaigns/campaign-01/reference/ref.jpg",
      fileName: "resort-moodboard-01.jpg",
      isReference: true,
      signedUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=400&auto=format&fit=crop",
    },
    inputAssets: [
      {
        id: "inp-01",
        storagePath: "workspace-1/campaigns/campaign-01/inputs/prod1.jpg",
        fileName: "silk-dress-01.jpg",
        isReference: false,
        signedUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=400&auto=format&fit=crop",
      },
      {
        id: "inp-02",
        storagePath: "workspace-1/campaigns/campaign-01/inputs/prod2.jpg",
        fileName: "leather-handbag-02.jpg",
        isReference: false,
        signedUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=400&auto=format&fit=crop",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Map memory campaigns with signed URLs for reference asset if present
    const campaignsWithUrls = await Promise.all(
      memoryCampaigns.map(async (camp) => {
        let refSignedUrl = camp.referenceAsset?.signedUrl || null;
        if (user && camp.referenceAsset?.storagePath) {
          const { data: signedData } = await supabase.storage
            .from("campaign-assets")
            .createSignedUrl(camp.referenceAsset.storagePath, 3600);
          if (signedData?.signedUrl) {
            refSignedUrl = signedData.signedUrl;
          }
        }
        return {
          ...camp,
          referenceAsset: camp.referenceAsset
            ? { ...camp.referenceAsset, signedUrl: refSignedUrl }
            : null,
          inputCount: camp.inputAssets ? camp.inputAssets.length : 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      campaigns: campaignsWithUrls,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch campaigns";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const validation = campaignSetupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const newCampaign: MemoryCampaign = {
      id: `campaign-${Date.now()}`,
      workspaceId: user?.id || "workspace-1",
      brandId: validation.data.brandId,
      name: validation.data.name,
      description: validation.data.description || null,
      status: "DRAFT",
      referenceAsset: null,
      inputAssets: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryCampaigns.unshift(newCampaign);

    dispatchN8nEvent({
      eventType: "campaign.created",
      workspaceId: newCampaign.workspaceId,
      data: {
        campaignId: newCampaign.id,
        campaignName: newCampaign.name,
        brandId: newCampaign.brandId,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      campaign: newCampaign,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to create campaign";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
