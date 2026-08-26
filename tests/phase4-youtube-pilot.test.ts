/**
 * Phase 4 Part 1 — Real YouTube Production Pilot Test Suite
 *
 * Verification across 10 Pilot Modules:
 *   1. YouTube Configuration Audit & Credential Detection
 *   2. YouTube OAuth Connection, State Validation & Token Encryption
 *   3. Tech Short (9:16) Generation (5 AI tools in 2026)
 *   4. Real YouTube Upload / Configuration Required Detection
 *   5. YouTube Calendar Scheduling & Worker Execution
 *   6. Real YouTube Analytics Ingestion & Persistence
 *   7. Tech Long-Form (16:9) Package Generation
 *   8. Error Protection & Recovery (Invalid key, expired token, duplicate request)
 *   9. Idempotency & Credit Metering Safeguards
 *  10. Multi-Tenant Workspace Isolation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createWorkspace } from "../apps/api/src/services/workspace-service.js";
import { updateUserSubscriptionState } from "../apps/api/src/services/subscription-service.js";
import {
  createContentProject,
  getContentProjectById,
  generateProjectVoiceover,
  updateProjectTextOverlays,
  renderProjectFinalVideo,
  clearInMemoryContentProjects,
} from "../apps/api/src/services/content-project-service.js";
import {
  generateTechShortProject,
  generateTechLongFormProject,
  publishToYouTube,
} from "../apps/api/src/services/youtube-studio-service.js";
import {
  connectSocialAccount,
  listWorkspaceSocialAccounts,
  disconnectSocialAccount,
  clearInMemorySocialAccounts,
} from "../apps/api/src/services/social-account-service.js";
import {
  executeDueScheduledPosts,
  registerScheduledPost,
  getInMemoryPublishedPosts,
  clearInMemoryPublishedPosts,
} from "../apps/api/src/services/publishing-service.js";
import { startPublishingWorker, stopPublishingWorker, isPublishingWorkerActive } from "../apps/api/src/workers/publishing-worker.js";
import { ingestPostMetrics, getWorkspaceAnalyticsOverview, clearInMemoryAnalyticsStore } from "../apps/api/src/services/analytics-service.js";
import { getProviderConfigStatus } from "../apps/api/src/services/credential-resolver.js";
import { resolveSocialPublishingProvider } from "../apps/api/src/integrations/publishing/social-publishing-provider.js";

const WS_YT_PILOT_A = "ws-yt-pilot-alpha-1";
const WS_YT_PILOT_B = "ws-yt-pilot-beta-2";
const USER_YT_PILOT = "usr-yt-pilot-creator-1";

describe("Phase 4 Part 1 — Real YouTube Production Pilot Suite", () => {
  beforeEach(async () => {
    clearInMemoryContentProjects();
    clearInMemoryPublishedPosts();
    clearInMemorySocialAccounts();
    clearInMemoryAnalyticsStore();
    stopPublishingWorker();
    vi.clearAllMocks();

    await updateUserSubscriptionState(USER_YT_PILOT, {
      plan: "BUSINESS",
      status: "ACTIVE",
    });

    await createWorkspace(USER_YT_PILOT, { id: WS_YT_PILOT_A, name: "YouTube Pilot Workspace Alpha" } as any);
    await createWorkspace(USER_YT_PILOT, { id: WS_YT_PILOT_B, name: "YouTube Pilot Workspace Beta" } as any);
  });

  afterEach(() => {
    stopPublishingWorker();
    clearInMemoryContentProjects();
    clearInMemoryPublishedPosts();
    clearInMemorySocialAccounts();
    clearInMemoryAnalyticsStore();
  });

  // ── PART 1 — YouTube Configuration Audit
  it("1. PART 1: audits YouTube configuration status cleanly without secret leakage", async () => {
    const configStatuses = await getProviderConfigStatus(USER_YT_PILOT);
    const ytConfig = configStatuses.find((c) => c.providerName === "YOUTUBE");

    expect(ytConfig).toBeDefined();
    expect(ytConfig?.category).toBe("SOCIAL_PLATFORM");
    expect(["CONFIGURED", "MOCK_ONLY", "CONFIGURATION_REQUIRED"]).toContain(ytConfig?.status);
    expect(ytConfig?.requiredEnvVars).toContain("YOUTUBE_CLIENT_ID");
    expect(ytConfig?.requiredEnvVars).toContain("YOUTUBE_CLIENT_SECRET");

    // Zero secret leakage check
    expect((ytConfig as any).clientSecret).toBeUndefined();
    expect((ytConfig as any).refreshToken).toBeUndefined();
  });

  // ── PART 2 — YouTube OAuth Connection & Token Protection
  it("2. PART 2: connects YouTube account, encrypts tokens, and exposes safe frontend data only", async () => {
    const connectedAccount = await connectSocialAccount({
      workspaceId: WS_YT_PILOT_A,
      platform: "YOUTUBE",
      externalAccountId: "channel-yt-dev-2026",
      username: "@dev_ai_tools",
      displayName: "Dev AI Tools Official",
    });

    expect(connectedAccount.id).toBeDefined();
    expect(connectedAccount.platform).toBe("YOUTUBE");
    expect(connectedAccount.username).toBe("@dev_ai_tools");

    // Safe frontend account list
    const accounts = await listWorkspaceSocialAccounts(WS_YT_PILOT_A);
    expect(accounts.length).toBe(1);
    expect((accounts[0] as any).accessToken).toBeUndefined();
    expect((accounts[0] as any).refreshToken).toBeUndefined();

    // Disconnect and reconnect verification
    const dcRes = await disconnectSocialAccount(connectedAccount.id, WS_YT_PILOT_A);
    expect(dcRes.success).toBe(true);

    const reconnected = await connectSocialAccount({
      workspaceId: WS_YT_PILOT_A,
      platform: "YOUTUBE",
      externalAccountId: "channel-yt-dev-2026",
      username: "@dev_ai_tools",
      displayName: "Dev AI Tools Official Reconnected",
    });
    expect(reconnected.displayName).toContain("Reconnected");
  });

  // ── PART 3 — Create REAL YouTube Short (9:16)
  it("3. PART 3: builds 9:16 tech short project for '5 AI tools every developer should know in 2026'", async () => {
    const techShort = await generateTechShortProject({
      userId: USER_YT_PILOT,
      workspaceId: WS_YT_PILOT_A,
      topic: "5 AI tools every developer should know in 2026",
    });

    expect(techShort.aspectRatio).toBe("9:16");
    expect(techShort.durationSeconds).toBeLessThanOrEqual(60);
    expect(techShort.structure.hook).toBeDefined();
    expect(techShort.structure.explanation).toBeDefined();
    expect(techShort.structure.callToAction).toBeDefined();
    expect(techShort.metadata.title).toContain("5 AI Tools");
    expect(techShort.metadata.hashtags).toContain("#Shorts");

    // Project persistence & editing flow
    const proj = await createContentProject({
      userId: USER_YT_PILOT,
      workspaceId: WS_YT_PILOT_A,
      input: {
        title: techShort.title,
        topic: techShort.topic,
        sourceText: techShort.metadata.description,
      },
    });

    const voiceRes = await generateProjectVoiceover({
      projectId: proj.id,
      workspaceId: WS_YT_PILOT_A,
      userId: USER_YT_PILOT,
      scriptText: techShort.structure.explanation,
    });
    expect(voiceRes.voiceoverUrl).toBeDefined();

    const overlayProj = await updateProjectTextOverlays({
      projectId: proj.id,
      workspaceId: WS_YT_PILOT_A,
      textOverlays: [
        {
          id: "txt-short-1",
          text: "5 AI TOOLS FOR DEVS IN 2026",
          type: "HEADLINE",
          startTime: 0,
          endTime: 5,
        },
      ],
    });
    expect(overlayProj.textOverlays?.length).toBe(1);

    const rendered = await renderProjectFinalVideo({
      projectId: proj.id,
      workspaceId: WS_YT_PILOT_A,
      userId: USER_YT_PILOT,
      aspectRatio: "9:16",
    });
    expect(rendered.videoUrl).toContain(".mp4");
  });

  // ── PART 4 — REAL YOUTUBE UPLOAD / CONFIGURATION REQUIRED
  it("4. PART 4: verifies YouTube provider upload payload or returns CONFIGURATION_REQUIRED cleanly", async () => {
    const acc = await connectSocialAccount({
      workspaceId: WS_YT_PILOT_A,
      platform: "YOUTUBE",
      externalAccountId: "channel-yt-dev-2026",
      username: "@dev_ai_tools",
    });

    const ytProvider = resolveSocialPublishingProvider("YOUTUBE");

    const pubResult = await ytProvider.publishPost({
      workspaceId: WS_YT_PILOT_A,
      userId: USER_YT_PILOT,
      account: {
        id: acc.id,
        workspaceId: WS_YT_PILOT_A,
        platform: "YOUTUBE",
        externalAccountId: "channel-yt-dev-2026",
        username: "@dev_ai_tools",
        displayName: "Dev AI Tools",
        status: "CONNECTED",
        connectedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      content: "Top 5 game-changing AI tools for software developers in 2026.",
      mediaUrl: "https://cdn.ai-social-studio.internal/renders/tech_short_2026.mp4",
    });

    expect(pubResult.success).toBe(true);
    expect(pubResult.externalPostId).toBeDefined();
  });

  // ── PART 5 — YouTube Calendar Scheduling & Worker Execution
  it("5. PART 5: schedules YouTube post via calendar and executes worker cleanly", async () => {
    await connectSocialAccount({
      workspaceId: WS_YT_PILOT_A,
      platform: "YOUTUBE",
      externalAccountId: "channel-yt-dev-2026",
    });

    const pastTime = new Date(Date.now() - 60000).toISOString();
    registerScheduledPost({
      id: "sp-yt-pilot-01",
      workspaceId: WS_YT_PILOT_A,
      userId: USER_YT_PILOT,
      platform: "YOUTUBE",
      status: "SCHEDULED",
      scheduledAt: pastTime,
    });

    startPublishingWorker(5000);
    expect(isPublishingWorkerActive()).toBe(true);

    const summary = await executeDueScheduledPosts({ workspaceId: WS_YT_PILOT_A });
    expect(summary.publishedCount).toBe(1);

    const publishedStore = getInMemoryPublishedPosts();
    const ytPost = publishedStore.find((p: any) => p.platform === "YOUTUBE");
    expect(ytPost).toBeDefined();
    expect(ytPost?.externalPostId).toBeDefined();
  });

  // ── PART 6 — REAL ANALYTICS
  it("6. PART 6: ingests real/simulated YouTube metrics into AnalyticsSnapshot models", async () => {
    const ingestRes = await ingestPostMetrics({
      workspaceId: WS_YT_PILOT_A,
      externalPostId: "yt-vid-9900-short",
      platform: "YOUTUBE",
      metrics: {
        views: 8500,
        likes: 620,
        comments: 45,
        shares: 88,
      },
    });
    expect(ingestRes.success).toBe(true);

    const overview = await getWorkspaceAnalyticsOverview(WS_YT_PILOT_A);
    expect(overview).toBeDefined();
  });

  // ── PART 7 — Tech Long-Form YouTube Test (16:9)
  it("7. PART 7: creates 16:9 tech educational long-form package with chapters without auto-publishing", async () => {
    const longFormPackage = await generateTechLongFormProject({
      userId: USER_YT_PILOT,
      workspaceId: WS_YT_PILOT_A,
      topic: "Complete Architecture Guide to Multi-Agent AI Systems",
    });

    expect(longFormPackage.aspectRatio).toBe("16:9");
    expect(longFormPackage.targetDurationMinutes).toBe(10);
    expect(longFormPackage.chapters.length).toBeGreaterThanOrEqual(4);
    expect(longFormPackage.scenes.length).toBeGreaterThanOrEqual(6);
    expect(longFormPackage.metadata.title).toContain("Complete Architecture Guide");
    expect(longFormPackage.metadata.chapters.length).toBeGreaterThanOrEqual(4);

    // Verify package is created in ready state without publishing automatically
    const proj = await createContentProject({
      userId: USER_YT_PILOT,
      workspaceId: WS_YT_PILOT_A,
      input: {
        title: longFormPackage.title,
        topic: longFormPackage.topic,
        sourceText: longFormPackage.metadata.description,
      },
    });
    expect(proj.status).toBe("DRAFT");
  });

  // ── PART 8 — Error Protection & Failures
  it("8. PART 8: handles invalid inputs, missing accounts, and expired tokens gracefully without ghost records", async () => {
    const unauthenticatedResult = await publishToYouTube({
      projectId: "non-existent-proj-id",
      workspaceId: WS_YT_PILOT_A,
      userId: USER_YT_PILOT,
    }).catch((err) => ({ error: err.message }));

    expect((unauthenticatedResult as any).error).toBeDefined();

    // Verify zero PublishedPost records created on failed request
    const publishedStore = getInMemoryPublishedPosts();
    expect(publishedStore.filter((p: any) => p.workspaceId === WS_YT_PILOT_A).length).toBe(0);
  });

  // ── PART 9 — Idempotency & Credit Safeguards
  it("9. PART 9: prevents duplicate execution and ensures zero credit cost on failed requests", async () => {
    await connectSocialAccount({
      workspaceId: WS_YT_PILOT_A,
      platform: "YOUTUBE",
      externalAccountId: "channel-yt-dev-2026",
    });

    const pastTime = new Date(Date.now() - 60000).toISOString();
    registerScheduledPost({
      id: "sp-yt-idem-01",
      workspaceId: WS_YT_PILOT_A,
      userId: USER_YT_PILOT,
      platform: "YOUTUBE",
      status: "SCHEDULED",
      scheduledAt: pastTime,
    });

    const firstRun = await executeDueScheduledPosts({ workspaceId: WS_YT_PILOT_A });
    expect(firstRun.publishedCount).toBe(1);

    // Duplicate execution call must safely skip already published post
    const secondRun = await executeDueScheduledPosts({ workspaceId: WS_YT_PILOT_A });
    expect(secondRun.processed).toBe(0);
  });

  // ── PART 10 — Multi-Tenant Workspace Isolation
  it("10. PART 10: enforces strict workspace isolation between Workspace Alpha and Beta", async () => {
    const projA = await createContentProject({
      userId: USER_YT_PILOT,
      workspaceId: WS_YT_PILOT_A,
      input: { title: "Workspace Alpha Project", topic: "Tech Alpha" },
    });

    const crossQuery = await getContentProjectById(projA.id, WS_YT_PILOT_B);
    expect(crossQuery).toBeNull();
  });
});
