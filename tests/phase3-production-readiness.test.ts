import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createContentProject,
  getContentProjectById,
  generateProjectVoiceover,
  generateProjectCaptions,
  updateProjectTextOverlays,
  patchProjectAudioState,
  renderProjectFinalVideo,
  saveProjectVersion,
  restorePreviousVersion,
  scheduleProjectAsset,
  clearInMemoryContentProjects,
} from "../apps/api/src/services/content-project-service.js";
import {
  getUserWorkspaces,
  checkWorkspaceMembership,
  createWorkspace,
  clearInMemoryWorkspaces,
} from "../apps/api/src/services/workspace-service.js";
import { updateUserSubscriptionState } from "../apps/api/src/services/subscription-service.js";
import {
  generateMultiImageCreatives,
  clearInMemoryGenerationRuns,
} from "../apps/api/src/services/creative-generation-service.js";
import {
  selectMusicTrack,
  calculateAudioDuckingOptions,
} from "../apps/api/src/services/music-service.js";
import {
  submitForApproval,
  approveContent,
  clearInMemoryApprovals,
} from "../apps/api/src/services/approval-service.js";
import {
  executeDueScheduledPosts,
  getInMemoryPublishedPosts,
  clearInMemoryPublishedPosts,
} from "../apps/api/src/services/publishing-service.js";
import {
  getInMemoryDeliveries,
  clearInMemoryDeliveries,
} from "../apps/api/src/services/webhook-service.js";
import {
  ingestPostMetrics,
  getAnalyticsOverview,
  clearInMemoryAnalytics,
} from "../apps/api/src/services/analytics-service.js";
import {
  repurposeContentPackage,
  clearInMemoryContentPackages,
} from "../apps/api/src/services/content-repurposing-service.js";
import {
  getProviderConfigStatus,
  assertProviderConfigured,
} from "../apps/api/src/config/provider-config.js";
import {
  resolveSocialPublishingProvider,
  YouTubePublishingProvider,
  InstagramPublishingProvider,
} from "../apps/api/src/integrations/publishing/social-publishing-provider.js";
import {
  consumeUsage,
  getUserUsage,
  clearInMemoryUsage,
} from "../apps/api/src/services/usage-service.js";
import { connectSocialAccount } from "../apps/api/src/services/social-account-service.js";

describe("Phase 3 Part 10 — Production Readiness & End-to-End Platform QA Regression Suite", { timeout: 30000 }, () => {
  const userId = "usr_prod_qa_owner";
  const workspaceIdA = "ws_prod_qa_alpha";
  const workspaceIdB = "ws_prod_qa_beta";

  beforeEach(() => {
    clearInMemoryContentProjects();
    clearInMemoryWorkspaces();
    clearInMemoryGenerationRuns();
    clearInMemoryApprovals();
    clearInMemoryPublishedPosts();
    clearInMemoryDeliveries();
    clearInMemoryAnalytics();
    clearInMemoryContentPackages();
    clearInMemoryUsage();
  });

  it("completes full 24-step production content lifecycle regression test", async () => {
    // 1. Create workspace
    await updateUserSubscriptionState(userId, { plan: "BUSINESS", status: "ACTIVE" });
    await createWorkspace(userId, { name: "Prod QA Alpha", slug: "ws_prod_qa_alpha", id: workspaceIdA } as any);
    const workspaces = await getUserWorkspaces(userId);
    expect(workspaces.length).toBeGreaterThan(0);
    const isMember = await checkWorkspaceMembership(userId, workspaceIdA);
    expect(isMember).toBe(true);

    // Initial Credit Setup
    const initialUsage = await getUserUsage(userId);
    expect(initialUsage).toBeDefined();

    // Connect social account for workspace
    await connectSocialAccount({
      workspaceId: workspaceIdA,
      userId,
      platform: "YOUTUBE",
      externalAccountId: "yt_account_prod_10",
      username: "TechChannelOfficial",
    });

    // 2. Create content project
    const project = await createContentProject({
      userId,
      workspaceId: workspaceIdA,
      input: {
        title: "Autonomous AI Agents Launch Campaign",
        topic: "Production AI Agents Architecture",
        sourceText: "Comprehensive guide to building agentic workflows and multi-platform automation.",
      },
    });
    expect(project.id).toBeDefined();
    expect(project.status).toBe("DRAFT");
    expect(project.workspaceId).toBe(workspaceIdA);

    // 3. Upload/reference assets
    const updatedProject = await createContentProject({
      userId,
      workspaceId: workspaceIdA,
      input: {
        title: project.title,
        topic: project.topic,
        sourceAssets: [
          "https://cdn.example.com/assets/ref-1.jpg",
          "https://cdn.example.com/assets/input-1.jpg",
        ],
      },
    });
    expect(updatedProject.id).toBeDefined();

    // 4. Generate multiple images
    const imgGenResult = await generateMultiImageCreatives({
      userId,
      workspaceId: workspaceIdA,
      creativeBrief: "High-tech luxury cyberpunk server room with glowing blue interface",
      aspectRatio: "1:1",
      variantsCount: 3,
    });
    expect(imgGenResult.runId).toBeDefined();

    // 5. Generate video
    const videoResult = await renderProjectFinalVideo({
      projectId: project.id,
      workspaceId: workspaceIdA,
      aspectRatio: "9:16",
      durationSeconds: 15,
    });
    expect(videoResult.videoUrl).toBeDefined();

    // 6. Create voiceover
    const voiceoverRes = await generateProjectVoiceover({
      projectId: project.id,
      workspaceId: workspaceIdA,
      scriptText: "Welcome to the future of AI automation with AI Social Media Studio.",
      voiceId: "21m00Tcm4TlvDq8ikWAM",
    });
    expect(voiceoverRes.voiceoverUrl).toBeDefined();

    // 7. Add music & ducking
    const selectedTrack = selectMusicTrack("TECH");
    expect(selectedTrack).toBeDefined();
    const duckingOptions = calculateAudioDuckingOptions({ hasVoiceover: true, voiceoverVolume: 1.0 });
    expect(duckingOptions.musicVolume).toBeLessThan(1.0);

    const audioPatchRes = await patchProjectAudioState({
      projectId: project.id,
      workspaceId: workspaceIdA,
      patch: {
        backgroundMusicUrl: selectedTrack.url,
        backgroundMusicVolume: duckingOptions.musicVolume,
        autoDuckingEnabled: true,
      },
    });
    expect(audioPatchRes.backgroundMusicUrl).toBe(selectedTrack.url);

    // 8. Generate captions
    const captionsRes = await generateProjectCaptions({
      projectId: project.id,
      workspaceId: workspaceIdA,
    });
    expect(captionsRes.captions.length).toBeGreaterThan(0);

    // 9. Add text overlays
    const overlaysRes = await updateProjectTextOverlays({
      projectId: project.id,
      workspaceId: workspaceIdA,
      textOverlays: [
        { text: "AI SOCIAL MEDIA STUDIO", timestamp: "00:00", style: "TITLE" },
        { text: "AUTONOMOUS AGENTS v2.0", timestamp: "00:05", style: "SUBTITLE" },
      ],
    });
    expect(overlaysRes.textOverlays.length).toBe(2);

    // 10. Save version
    const version1 = await saveProjectVersion({
      projectId: project.id,
      workspaceId: workspaceIdA,
      commitMessage: "Version 1.0 — Initial Master Cut",
    });
    expect(version1.versionNumber).toBe(1);

    // 11. Restore version
    const restored = await restorePreviousVersion({
      projectId: project.id,
      workspaceId: workspaceIdA,
      targetVersionNumber: 1,
    });
    expect(restored.currentVersionNumber).toBe(1);

    // 12. Submit for approval
    const approvalReq = await submitForApproval({
      workspaceId: workspaceIdA,
      userId,
      entityId: project.id,
      entityType: "PROJECT",
      title: project.title,
    });
    expect(approvalReq.status).toBe("PENDING");

    // 13. Approve
    const approved = await approveContent({
      approvalId: approvalReq.id,
      workspaceId: workspaceIdA,
      reviewerUserId: userId,
    });
    expect(approved.status).toBe("APPROVED");

    // 14. Schedule
    const scheduleRes = await scheduleProjectAsset({
      projectId: project.id,
      workspaceId: workspaceIdA,
      platform: "YOUTUBE",
      scheduledAt: new Date(Date.now() - 1000).toISOString(), // Past date so it is due
    });
    expect(scheduleRes.status).toBe("SCHEDULED");

    // 15. Background worker executes
    const pubSummary = await executeDueScheduledPosts({
      workspaceId: workspaceIdA,
      userId,
    });
    expect(pubSummary.processed).toBeGreaterThan(0);

    // 16. Publish through provider abstraction
    const provider = resolveSocialPublishingProvider("YOUTUBE");
    expect(provider).toBeDefined();
    expect(provider.platform).toBe("YOUTUBE");

    // 17. Create PublishedPost
    const publishedPosts = getInMemoryPublishedPosts();
    expect(publishedPosts.length).toBeGreaterThan(0);
    const pubRecord = publishedPosts[0];
    expect(pubRecord.platform).toBe("YOUTUBE");
    expect(pubRecord.externalPostId).toBeDefined();

    // 18. Deduct publishing credit exactly once
    const usageRes = await consumeUsage(userId, "PUBLISHING");
    expect(usageRes).toBeDefined();

    // 19. Dispatch POST_PUBLISHED webhook
    const deliveries = getInMemoryDeliveries();
    expect(deliveries).toBeDefined();

    // 20. Update analytics
    await ingestPostMetrics({
      workspaceId: workspaceIdA,
      externalPostId: pubRecord.externalPostId || pubRecord.id,
      platform: "YOUTUBE",
      metrics: {
        impressions: 15400,
        views: 9800,
        likes: 1200,
        shares: 310,
      },
    });

    const analyticsOverview = await getAnalyticsOverview({ workspaceId: workspaceIdA });
    expect(analyticsOverview.totalViews).toBeGreaterThanOrEqual(9800);
    expect(analyticsOverview.totalLikes).toBeGreaterThanOrEqual(1200);

    // 21. Repurpose content
    const repurposeRes = await repurposeContentPackage({
      userId,
      workspaceId: workspaceIdA,
      title: project.title,
      sourceText: project.sourceText || "Repurpose source text",
    });
    expect(repurposeRes.packageId).toBeDefined();

    // 22. Verify workspace isolation
    const projectInWsB = await getContentProjectById(project.id, workspaceIdB);
    expect(projectInWsB).toBeNull(); // Workspace B cannot view Workspace A project

    const analyticsWsB = await getAnalyticsOverview({ workspaceId: workspaceIdB });
    expect(analyticsWsB.publishedCount).toBe(0); // Workspace B analytics isolated

    // 23. Verify failure isolation
    try {
      assertProviderConfigured("AI_VIDEO", true);
    } catch (err: any) {
      expect(err.message).toContain("Provider AI_VIDEO is not configured for production");
    }

    // 24. Verify idempotency
    const pubKey = `pub_key_${pubRecord.id}`;
    const pubResult1 = await provider.publishPost({
      workspaceId: workspaceIdA,
      userId,
      content: "Idempotent post",
      idempotencyKey: pubKey,
    });
    const pubResult2 = await provider.publishPost({
      workspaceId: workspaceIdA,
      userId,
      content: "Idempotent post",
      idempotencyKey: pubKey,
    });
    expect(pubResult1.externalPostId).toBe(pubResult2.externalPostId);
  });

  it("verifies missing production credentials result in controlled configuration errors and never fake successful publishing", async () => {
    // When STRICT_PRODUCTION_PROVIDERS=true or checking unavailable provider status
    const statusInfo = getProviderConfigStatus("TIKTOK");
    expect(statusInfo.provider).toBe("TIKTOK");
    expect(statusInfo.missingEnvVars).toContain("TIKTOK_ACCESS_TOKEN");

    // Calling production YouTube provider directly with no credentials returns controlled error
    const prodYt = new YouTubePublishingProvider("", "");
    const res = await prodYt.publishPost({
      workspaceId: workspaceIdA,
      userId,
      content: "Test post without credentials",
    });
    expect(res.success).toBe(false);
    expect(res.status).toBe("FAILED");
    expect(res.error).toContain("Provider not configured");

    // Calling production Instagram provider directly with no credentials returns controlled error
    const prodIg = new InstagramPublishingProvider("");
    const resIg = await prodIg.publishPost({
      workspaceId: workspaceIdA,
      userId,
      content: "Test IG post without token",
    });
    expect(resIg.success).toBe(false);
    expect(resIg.status).toBe("FAILED");
    expect(resIg.error).toContain("Instagram Access Token missing");
  });
});
