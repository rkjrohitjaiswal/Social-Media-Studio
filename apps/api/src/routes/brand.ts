import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { brandSchema } from "@ai-social/shared";

export const brandRouter = Router();

brandRouter.use(requireAuth as any);

const mockBrandStore: Record<string, any> = {
  "demo-workspace-1": {
    id: "brand-1",
    name: "Maison Lumiere",
    description: "Luxury artisanal interior decor & bespoke home goods.",
    primaryColor: "#0B0C0E",
    secondaryColor: "#F5F4F0",
    accentColor: "#C5A059",
    toneVoice: "Luxury",
    contentStyle: "Luxury editorial",
    targetAudience: "Discerning homeowners & interior designers seeking high-end craftsmanship.",
    defaultCta: "Explore the collection at maisonlumiere.com",
    website: "https://maisonlumiere.com",
    instagramUsername: "maisonlumiere",
    contactEmail: "concierge@maisonlumiere.com",
    contactPhone: "+1 (555) 234-5678",
  },
};

brandRouter.get("/", (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.workspaceId || "demo-workspace-1";
  const brand = mockBrandStore[workspaceId] || mockBrandStore["demo-workspace-1"];
  res.json({ success: true, data: brand });
});

brandRouter.put("/", (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.workspaceId || "demo-workspace-1";
  const parseResult = brandSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: parseResult.error.flatten(),
    });
  }

  const existing = mockBrandStore[workspaceId] || mockBrandStore["demo-workspace-1"];
  const updated = {
    ...existing,
    ...parseResult.data,
    updatedAt: new Date().toISOString(),
  };

  mockBrandStore[workspaceId] = updated;
  res.json({ success: true, data: updated });
});

brandRouter.post("/logo", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300",
      storagePath: "logos/demo-logo.jpg",
    },
  });
});
