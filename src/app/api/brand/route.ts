import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { brandSchema } from "@/lib/validations/brand";

// Mock memory store fallback for standalone testing if DB instance is unpopulated
let memoryBrand: Record<string, unknown> = {
  id: "brand-1",
  workspaceId: "workspace-1",
  name: "Maison Lumière",
  description: "Haute couture & luxury atelier social presence",
  logoUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=300&auto=format&fit=crop",
  logoStoragePath: null,
  primaryColor: "#0B0C0E",
  secondaryColor: "#F5F4F0",
  accentColor: "#C5A059",
  toneVoice: "Editorial",
  contentStyle: "Luxury editorial",
  targetAudience: "Discerning luxury consumers, high-fashion enthusiasts",
  defaultCta: "Discover the exclusive collection online now.",
  website: "https://maisonlumiere.com",
  instagramUsername: "maisonlumiere_official",
  contactEmail: "director@maisonlumiere.com",
  contactPhone: "+33 1 42 68 55 00",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If logoStoragePath exists, attempt to generate signed URL
    let signedLogoUrl = memoryBrand.logoUrl;
    if (user && memoryBrand.logoStoragePath) {
      const { data: signedData } = await supabase.storage
        .from("brand-assets")
        .createSignedUrl(memoryBrand.logoStoragePath as string, 3600);
      if (signedData?.signedUrl) {
        signedLogoUrl = signedData.signedUrl;
      }
    }

    return NextResponse.json({
      success: true,
      brand: {
        ...memoryBrand,
        logoSignedUrl: signedLogoUrl,
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch brand profile";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.getUser();

    const body = await request.json();
    const validation = brandSchema.safeParse(body);

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

    const data = validation.data;
    memoryBrand = {
      ...memoryBrand,
      name: data.name,
      description: data.description || null,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      toneVoice: data.toneVoice === "Custom" ? data.customTone || "Custom" : data.toneVoice,
      contentStyle:
        data.contentStyle === "Custom"
          ? data.customContentStyle || "Custom"
          : data.contentStyle || null,
      targetAudience: data.targetAudience || null,
      defaultCta: data.defaultCta || null,
      website: data.website || null,
      instagramUsername: data.instagramUsername || null,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      brand: memoryBrand,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to update brand profile";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
