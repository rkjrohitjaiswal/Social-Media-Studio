import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import { brandRouter } from "./routes/brand.js";
import { campaignsRouter } from "./routes/campaigns.js";
import { analyticsRouter } from "./routes/analytics.js";
import { integrationsRouter } from "./routes/integrations.js";
import { n8nRouter } from "./routes/n8n.js";
import { settingsRouter } from "./routes/settings.js";
import { billingRouter } from "./routes/billing.js";
import { contentRouter } from "./routes/content.js";
import { advisorRouter } from "./routes/advisor.js";
import { workspacesRouter } from "./routes/workspaces.js";
import { invitationsRouter } from "./routes/invitations.js";
import { approvalsRouter } from "./routes/approvals.js";
import { approvalLinksRouter } from "./routes/approval-links.js";
import { goalsRouter } from "./routes/goals.js";
import { toolsRouter } from "./routes/tools.js";
import { searchRouter } from "./routes/search.js";
import { templatesRouter } from "./routes/templates.js";
import { savedRouter } from "./routes/saved.js";
import { strategyRouter } from "./routes/strategy.js";
import { calendarRouter } from "./routes/calendar.js";
import { campaignPlannerRouter } from "./routes/campaign-planner.js";
import { trendsRouter } from "./routes/trends.js";
import { publishingRouter } from "./routes/publishing.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || process.env.WEB_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("CORS policy violation: Origin not allowed"), false);
      }
    },
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "50mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health Check Endpoint (Safe status check for production load balancers)
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    service: "AI Social Media Studio API",
  });
});

// API Routes
app.use("/api/brand", brandRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/analytics/advisor", advisorRouter);
app.use("/api/content", contentRouter);
app.use("/api/integrations/n8n", n8nRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/billing", billingRouter);
app.use("/api/workspaces", workspacesRouter);
app.use("/api/invitations", invitationsRouter);
app.use("/api/approvals", approvalsRouter);
app.use("/api/approval-links", approvalLinksRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/tools", toolsRouter);
app.use("/api/search", searchRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/saved", savedRouter);
app.use("/api/strategy", strategyRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/publishing", publishingRouter);
app.use("/api/campaigns/planner", campaignPlannerRouter);
app.use("/api/trends", trendsRouter);
import { usageRouter } from "./routes/usage.js";
app.use("/api/usage", usageRouter);
import { creativesRouter } from "./routes/creatives.js";
app.use("/api/creatives", creativesRouter);
import { videoRouter } from "./routes/video.js";
app.use("/api/video", videoRouter);
import { repurposeRouter } from "./routes/repurpose.js";
app.use("/api/repurpose", repurposeRouter);
import { contentProjectsRouter } from "./routes/content-projects.js";
app.use("/api/content-projects", contentProjectsRouter);
import { uploadRouter } from "./routes/upload.js";
app.use("/api/upload", uploadRouter);



import { startPublishingWorker } from "./workers/publishing-worker.js";

// Start HTTP Server
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[API Server] Running on http://localhost:${PORT}`);
    startPublishingWorker();
  });
}

export default app;
