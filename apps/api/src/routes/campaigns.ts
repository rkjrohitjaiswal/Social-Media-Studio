import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { checkCampaignReadinessServer } from "@ai-social/shared";

export const campaignsRouter = Router();

campaignsRouter.use(requireAuth as any);

const mockCampaigns: any[] = [
  {
    id: "demo-campaign-1",
    name: "Summer Minimalist Collection 2026",
    brandId: "brand-1",
    description: "Architectural lighting & Scandinavian ceramic accents.",
    status: "READY",
    referenceAssetId: "ref-1",
    inputAssetsCount: 3,
    createdAt: new Date().toISOString(),
  },
];

campaignsRouter.get("/", (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: mockCampaigns });
});

campaignsRouter.post("/", (req: AuthenticatedRequest, res: Response) => {
  const { name, brandId, description } = req.body;
  const newCampaign = {
    id: `campaign-${Date.now()}`,
    name: name || "New Campaign",
    brandId: brandId || "brand-1",
    description: description || "",
    status: "DRAFT",
    referenceAssetId: null,
    inputAssetsCount: 0,
    createdAt: new Date().toISOString(),
  };
  mockCampaigns.push(newCampaign);
  res.status(201).json({ success: true, data: newCampaign });
});

campaignsRouter.get("/:id", (req: AuthenticatedRequest, res: Response) => {
  const campaign = mockCampaigns.find((c) => c.id === req.params.id) || mockCampaigns[0];
  res.json({ success: true, data: campaign });
});

campaignsRouter.get("/:id/readiness", (req: AuthenticatedRequest, res: Response) => {
  const campaign = mockCampaigns.find((c) => c.id === req.params.id) || mockCampaigns[0];
  const readiness = checkCampaignReadinessServer({
    name: campaign.name,
    brandId: campaign.brandId,
    referenceAssetId: campaign.referenceAssetId,
    inputAssetsCount: campaign.inputAssetsCount || 1,
  });
  res.json({ success: true, data: readiness });
});

campaignsRouter.post("/:id/generate/run", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      runId: `run-${Date.now()}`,
      status: "QUEUED",
      totalJobs: 3,
    },
  });
});

campaignsRouter.get("/:id/generate/events", (req: AuthenticatedRequest, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${JSON.stringify({ type: "JOB_COMPLETED", jobIndex: 1, status: "COMPLETED" })}\n\n`);

  setTimeout(() => {
    res.write(`data: ${JSON.stringify({ type: "RUN_COMPLETED", status: "COMPLETED" })}\n\n`);
    res.end();
  }, 1000);
});

campaignsRouter.post("/:id/generate", (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: "Generation triggered" });
});

campaignsRouter.post("/:id/generate/retry", (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: "Generation retried" });
});

campaignsRouter.get("/:id/schedule", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        id: "sched-1",
        platform: "INSTAGRAM",
        scheduledFor: new Date(Date.now() + 86400000).toISOString(),
        status: "SCHEDULED",
        captionSnapshot: "Elevate your living space with our handcrafted ceramic vase.",
      },
    ],
  });
});

campaignsRouter.post("/:id/schedule", (req: AuthenticatedRequest, res: Response) => {
  const newSchedule = {
    id: `sched-${Date.now()}`,
    platform: req.body.platform || "INSTAGRAM",
    scheduledFor: req.body.scheduledFor || new Date(Date.now() + 86400000).toISOString(),
    status: "SCHEDULED",
    captionSnapshot: req.body.captionSnapshot || "Scheduled post",
  };
  res.status(201).json({ success: true, data: newSchedule });
});

campaignsRouter.post("/:id/schedule/:scheduleId/cancel", (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: "Schedule cancelled" });
});

campaignsRouter.get("/:id/publish", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        id: "pub-1",
        platform: "INSTAGRAM",
        status: "PUBLISHED",
        publishedAt: new Date().toISOString(),
        permalink: "https://instagram.com/p/demo123",
      },
    ],
  });
});

campaignsRouter.post("/:id/publish", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      id: `pub-${Date.now()}`,
      status: "PUBLISHED",
      publishedAt: new Date().toISOString(),
      permalink: "https://instagram.com/p/demo-published",
    },
  });
});

campaignsRouter.post("/:id/assets/upload-url", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      uploadUrl: "https://placeholder-upload-url.com",
      assetId: `asset-${Date.now()}`,
    },
  });
});
