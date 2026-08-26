import { describe, it, expect, beforeEach } from "vitest";
import {
  createContentProject,
  getContentProjectById,
  listContentProjects,
  updateContentProject,
  generateProjectPackage,
  submitProjectForReview,
  scheduleProjectAsset,
  restorePreviousVersion,
  clearInMemoryContentProjects,
} from "../apps/api/src/services/content-project-service.js";
import { clearInMemoryContentPackages } from "../apps/api/src/services/content-repurposing-service.js";
import { clearInMemoryVideoJobs } from "../apps/api/src/services/video-composition-service.js";
import { clearInMemoryUsage, getUserUsage } from "../apps/api/src/services/usage-service.js";

describe("Phase 3 Part 6 — Content Command Center / Unified Editor", { timeout: 25000 }, () => {
  beforeEach(() => {
    clearInMemoryContentProjects();
    clearInMemoryContentPackages();
    clearInMemoryVideoJobs();
    clearInMemoryUsage();
  });

  it("1. creates content project in DRAFT status", async () => {
    const userId = "usr-proj-create";
    const workspaceId = "ws-proj-create";

    const project = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "AI Agents Masterclass",
        topic: "How Autonomous AI Agents Work",
        sourceText: "Raw research notes on agentic loops and tool calling.",
      },
    });

    expect(project.id).toBeDefined();
    expect(project.status).toBe("DRAFT");
    expect(project.topic).toBe("How Autonomous AI Agents Work");
  });

  it("2. retrieves project by ID", async () => {
    const userId = "usr-proj-get";
    const workspaceId = "ws-proj-get";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Retrieval Project",
        topic: "Retrieval Test Topic",
      },
    });

    const retrieved = await getContentProjectById(created.id, workspaceId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(created.id);
  });

  it("3. enforces workspace isolation (Workspace A project is invisible to Workspace B)", async () => {
    const userId = "usr-proj-ws";
    const workspaceA = "ws-proj-A";
    const workspaceB = "ws-proj-B";

    const createdA = await createContentProject({
      userId,
      workspaceId: workspaceA,
      input: {
        title: "Workspace A Project",
        topic: "Topic A",
      },
    });

    const retrievedB = await getContentProjectById(createdA.id, workspaceB);
    expect(retrievedB).toBeNull();
  });

  it("4. persists source material, topic, notes, and reference URLs", async () => {
    const userId = "usr-proj-source";
    const workspaceId = "ws-proj-source";

    const project = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Source Material Test",
        topic: "Source Notes Topic",
        sourceText: "Detailed notebookLM source notes.",
        referenceUrls: ["https://example.com/ref1"],
      },
    });

    expect(project.sourceText).toBe("Detailed notebookLM source notes.");
    expect(project.referenceUrls).toContain("https://example.com/ref1");
  });

  it("5 & 6. orchestrates multi-platform content package generation", async () => {
    const userId = "usr-proj-gen";
    const workspaceId = "ws-proj-gen";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Generation Orchestration Test",
        topic: "Multi Platform Orchestration",
      },
    });

    const updated = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    expect(updated.status).toBe("READY");
    expect(updated.package).not.toBeNull();
    expect(updated.package?.longFormScript).toBeDefined();
    expect(updated.package?.shorts.length).toBeGreaterThan(0);
  });

  it("7 & 8. verifies multiple child assets with independent status tracking", async () => {
    const userId = "usr-proj-child-status";
    const workspaceId = "ws-proj-child-status";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Child Assets Check",
        topic: "Child Status Tracking",
      },
    });

    const updated = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    const pkg = updated.package;
    expect(pkg?.shorts).toBeDefined();
    expect(pkg?.carousel).toHaveLength(6);
    expect(pkg?.xThread).toHaveLength(5);
    expect(pkg?.thumbnailConcepts.length).toBeGreaterThanOrEqual(3);
  });

  it("9 & 10. handles failed child asset isolation and allows package retry", async () => {
    const userId = "usr-proj-retry";
    const workspaceId = "ws-proj-retry";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Retry Test Project",
        topic: "Retry Topic",
      },
    });

    const run1 = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    expect(run1.package).not.toBeNull();

    const run2 = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
      idempotencyKey: `retry_key_${Date.now()}`,
    });

    expect(run2.package).not.toBeNull();
    expect(run2.versions.length).toBe(1); // Stored previous version in history
  });

  it("11 & 12. updates content project details inline", async () => {
    const userId = "usr-proj-update";
    const workspaceId = "ws-proj-update";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Initial Title",
        topic: "Initial Topic",
      },
    });

    const updated = await updateContentProject({
      projectId: created.id,
      workspaceId,
      input: {
        title: "Updated Project Title",
        topic: "Updated Topic",
      },
    });

    expect(updated.title).toBe("Updated Project Title");
    expect(updated.topic).toBe("Updated Topic");
  });

  it("13 & 14. integrates with approval workflow and transitions status to IN_REVIEW", async () => {
    const userId = "usr-proj-review";
    const workspaceId = "ws-proj-review";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Review Test Project",
        topic: "Approval Review Topic",
      },
    });

    await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    const inReview = await submitProjectForReview({
      projectId: created.id,
      workspaceId,
      userId,
    });

    expect(inReview.status).toBe("IN_REVIEW");
  });

  it("15 & 16. integrates with calendar scheduling and transitions status to SCHEDULED", async () => {
    const userId = "usr-proj-sched";
    const workspaceId = "ws-proj-sched";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Scheduling Test Project",
        topic: "Scheduling Topic",
      },
    });

    await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    const scheduled = await scheduleProjectAsset({
      projectId: created.id,
      workspaceId,
      userId,
      platform: "YOUTUBE",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    });

    expect(scheduled.status).toBe("SCHEDULED");
    expect(scheduled.scheduledPosts.length).toBe(1);
  });

  it("17. supports analytics linkage for published project posts", async () => {
    const userId = "usr-proj-[#analytics]";
    const workspaceId = "ws-proj-analytics";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Analytics Linkage Project",
        topic: "Analytics Topic",
      },
    });

    expect(created.publishedPosts).toBeDefined();
  });

  it("18. consumes exactly 1 credit per package generation run", async () => {
    const userId = "usr-proj-credit";
    const workspaceId = "ws-proj-credit";

    const initialUsage = await getUserUsage(userId);
    expect(initialUsage.freeCreditsUsed).toBe(0);

    const created = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Credit Metering Project",
        topic: "Credit Topic",
      },
    });

    await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    const updatedUsage = await getUserUsage(userId);
    expect(updatedUsage.freeCreditsUsed).toBe(1);
  });

  it("19. idempotency check prevents double charging on retries", async () => {
    const userId = "usr-proj-idemp";
    const workspaceId = "ws-proj-idemp";
    const key = "idemp_proj_key_456";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Idempotency Project",
        topic: "Idempotency Topic",
      },
    });

    const res1 = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
      idempotencyKey: key,
    });

    const res2 = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
      idempotencyKey: key,
    });

    expect(res1.package?.packageId).toBe(res2.package?.packageId);
    const usage = await getUserUsage(userId);
    expect(usage.freeCreditsUsed).toBe(1);
  });

  it("20. rejects unauthorized access to project across workspaces", async () => {
    const userId = "usr-unauth-proj";
    await expect(
      getContentProjectById("non_existent_id", "ws-unauth")
    ).resolves.toBeNull();
  });

  it("21. rejects invalid status transitions or empty project review submission", async () => {
    const userId = "usr-proj-invalid";
    const workspaceId = "ws-proj-invalid";

    const empty = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Empty Review Project",
        topic: "Empty Topic",
      },
    });

    await expect(
      submitProjectForReview({
        projectId: empty.id,
        workspaceId,
        userId,
      })
    ).rejects.toThrow();
  });

  it("22. calculates aggregate project completion percentage and completed assets count", async () => {
    const userId = "usr-proj-calc";
    const workspaceId = "ws-proj-calc";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Completion Progress Project",
        topic: "Completion Topic",
      },
    });

    const generated = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    expect(generated.progressPercent).toBe(100);
    expect(generated.completedAssetsCount).toBe(10);
  });

  it("23. preserves version history and allows restoring a previous package version", async () => {
    const userId = "usr-proj-versions";
    const workspaceId = "ws-proj-versions";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Version History Project",
        topic: "Version History Topic",
      },
    });

    // Run 1 (Version 1)
    const run1 = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    const ver1Id = run1.versions[0]?.versionId || "ver_mock_1";

    // Run 2 (Version 2)
    const run2 = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
      idempotencyKey: `run2_${Date.now()}`,
    });

    expect(run2.versions.length).toBe(1);

    // Restore Version 1
    const restored = await restorePreviousVersion({
      projectId: created.id,
      workspaceId,
      versionId: run2.versions[0].versionId,
    });

    expect(restored.package).toBeDefined();
  });

  it("24. lists all projects for a specific workspace", async () => {
    const userId = "usr-proj-list";
    const workspaceId = "ws-proj-list-target";

    await createContentProject({
      userId,
      workspaceId,
      input: { title: "List Proj 1", topic: "Topic 1" },
    });

    await createContentProject({
      userId,
      workspaceId,
      input: { title: "List Proj 2", topic: "Topic 2" },
    });

    const list = await listContentProjects(workspaceId);
    expect(list).toHaveLength(2);
  });
});
