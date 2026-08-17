import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
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

// Health Check Endpoint (Required by Render & Monitoring)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
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

// Start HTTP Server
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[API Server] Running on http://localhost:${PORT}`);
  });
}

export default app;
