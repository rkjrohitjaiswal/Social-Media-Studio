import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";

export const n8nRouter = Router();

n8nRouter.use(requireAuth as any);

const mockIntegrations: any[] = [
  {
    id: "n8n-int-1",
    name: "Zapier Automation Flow",
    description: "Triggers external content review and publishing notification.",
    isEnabled: true,
    lastDeliveryStatus: "SUCCESS",
    lastDeliveryAt: new Date().toISOString(),
    failureCount: 0,
  },
];

n8nRouter.get("/", (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: mockIntegrations });
});

n8nRouter.post("/", (req: AuthenticatedRequest, res: Response) => {
  const newInt = {
    id: `n8n-int-${Date.now()}`,
    name: req.body.name || "New Webhook Integration",
    description: req.body.description || "",
    isEnabled: req.body.isEnabled !== false,
    lastDeliveryStatus: "PENDING",
    lastDeliveryAt: null,
    failureCount: 0,
  };
  mockIntegrations.push(newInt);
  res.status(201).json({ success: true, data: newInt });
});

n8nRouter.get("/:integrationId", (req: AuthenticatedRequest, res: Response) => {
  const item = mockIntegrations.find((i) => i.id === req.params.integrationId) || mockIntegrations[0];
  res.json({ success: true, data: item });
});

n8nRouter.put("/:integrationId", (req: AuthenticatedRequest, res: Response) => {
  const index = mockIntegrations.findIndex((i) => i.id === req.params.integrationId);
  if (index !== -1) {
    mockIntegrations[index] = { ...mockIntegrations[index], ...req.body };
  }
  res.json({ success: true, data: mockIntegrations[index] || req.body });
});

n8nRouter.delete("/:integrationId", (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: "Integration deleted" });
});

n8nRouter.post("/:integrationId/test", (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: "Test webhook delivered successfully", status: 200 });
});

n8nRouter.get("/:integrationId/deliveries", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        id: "del-1",
        eventType: "CONTENT_GENERATED",
        status: "DELIVERED",
        responseStatus: 200,
        createdAt: new Date().toISOString(),
      },
    ],
  });
});

n8nRouter.post("/deliveries/:deliveryId/retry", (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: "Webhook retry queued" });
});
