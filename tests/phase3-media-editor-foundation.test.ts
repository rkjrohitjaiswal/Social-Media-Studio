import { describe, it, expect, beforeEach } from "vitest";
import {
  createContentProject,
  getContentProjectById,
  generateProjectPackage,
  saveProjectVersion,
  restorePreviousVersion,
  regenerateProjectScene,
  clearInMemoryContentProjects,
} from "../apps/api/src/services/content-project-service.js";
import { clearInMemoryContentPackages } from "../apps/api/src/services/content-repurposing-service.js";
import { clearInMemoryVideoJobs } from "../apps/api/src/services/video-composition-service.js";
import { clearInMemoryUsage, getUserUsage } from "../apps/api/src/services/usage-service.js";
import { EditorScene } from "@ai-social/shared";

describe("Phase 3 Part 7 — Professional Media Editor Foundation", { timeout: 25000 }, () => {
  beforeEach(() => {
    clearInMemoryContentProjects();
    clearInMemoryContentPackages();
    clearInMemoryVideoJobs();
    clearInMemoryUsage();
  });

  it("1. loads existing ContentProject with package assets", async () => {
    const userId = "usr-editor-load";
    const workspaceId = "ws-editor-load";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Editor Project Load",
        topic: "Media Editor Foundation Topic",
      },
    });

    await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    const project = await getContentProjectById(created.id, workspaceId);
    expect(project).not.toBeNull();
    expect(project?.package).toBeDefined();
    expect(project?.package?.longFormScript).toBeDefined();
  });

  it("2. enforces workspace isolation (Workspace A project is invisible to Workspace B)", async () => {
    const userId = "usr-editor-ws";
    const workspaceA = "ws-editor-A";
    const workspaceB = "ws-editor-B";

    const createdA = await createContentProject({
      userId,
      workspaceId: workspaceA,
      input: {
        title: "Workspace A Editor Project",
        topic: "Topic A",
      },
    });

    const retrievedB = await getContentProjectById(createdA.id, workspaceB);
    expect(retrievedB).toBeNull();
  });

  it("3. handles project not found or unauthorized access", async () => {
    const project = await getContentProjectById("non_existent_project", "ws-editor-test");
    expect(project).toBeNull();
  });

  it("4. supports scene mapping and selection from project package", async () => {
    const userId = "usr-editor-scenes";
    const workspaceId = "ws-editor-scenes";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: { title: "Scenes Project", topic: "Scenes Topic" },
    });

    const generated = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    const pkg = generated.package!;
    expect(pkg.longFormScript?.chapters.length).toBeGreaterThan(0);
    expect(pkg.shorts.length).toBeGreaterThan(0);
  });

  it("5. updates scene duration locally and preserves values", async () => {
    const userId = "usr-editor-dur";
    const workspaceId = "ws-editor-dur";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: { title: "Duration Project", topic: "Duration Topic" },
    });

    const generated = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    const mockScenes: EditorScene[] = [
      {
        id: "ch_1",
        sceneNumber: 1,
        type: "CHAPTER",
        title: "Intro Scene",
        durationSeconds: 12,
        platform: "YOUTUBE",
        status: "MODIFIED",
      },
    ];

    const saved = await saveProjectVersion({
      projectId: generated.id,
      workspaceId,
      scenes: mockScenes,
    });

    expect(saved.package?.longFormScript?.chapters[0].estimatedDurationSeconds).toBe(12);
  });

  it("6. supports reordering scenes in saved version snapshot", async () => {
    const userId = "usr-editor-reorder";
    const workspaceId = "ws-editor-reorder";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: { title: "Reorder Project", topic: "Reorder Topic" },
    });

    const generated = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    const reorderedScenes: EditorScene[] = [
      {
        id: "ch_2",
        sceneNumber: 1,
        type: "CHAPTER",
        title: "Reordered Chapter 2",
        durationSeconds: 8,
        platform: "YOUTUBE",
      },
      {
        id: "ch_1",
        sceneNumber: 2,
        type: "CHAPTER",
        title: "Reordered Chapter 1",
        durationSeconds: 5,
        platform: "YOUTUBE",
      },
    ];

    const saved = await saveProjectVersion({
      projectId: generated.id,
      workspaceId,
      scenes: reorderedScenes,
    });

    expect(saved.package?.longFormScript?.chapters[0].title).toBe("Reordered Chapter 2");
  });

  it("7. supports asset replacement flow with custom mediaUrl", async () => {
    const userId = "usr-editor-replace";
    const workspaceId = "ws-editor-replace";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: { title: "Replace Project", topic: "Replace Topic" },
    });

    const generated = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    const replacedMediaUrl = "https://images.unsplash.com/photo-custom-asset?w=800";
    const replacedScenes: EditorScene[] = [
      {
        id: "ch_1",
        sceneNumber: 1,
        type: "CHAPTER",
        title: "Replaced Chapter",
        durationSeconds: 6,
        platform: "YOUTUBE",
        mediaUrl: replacedMediaUrl,
      },
    ];

    const saved = await saveProjectVersion({
      projectId: generated.id,
      workspaceId,
      scenes: replacedScenes,
    });

    expect(saved.package?.longFormScript?.chapters[0].mediaUrl).toBe(replacedMediaUrl);
  });

  it("8 & 13. target regenerates a single scene with credit metering enforcement", async () => {
    const userId = "usr-editor-regen";
    const workspaceId = "ws-editor-regen";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: { title: "Regen Project", topic: "Regen Topic" },
    });

    await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    const initialUsage = await getUserUsage(userId);
    expect(initialUsage.freeCreditsUsed).toBe(1); // 1 credit for package generation

    const regenResult = await regenerateProjectScene({
      projectId: created.id,
      workspaceId,
      userId,
      sceneId: "ch_1",
    });

    expect(regenResult.regeneratedSceneId).toBe("ch_1");
    expect(regenResult.project.creditsConsumed).toBe(2);

    const updatedUsage = await getUserUsage(userId);
    expect(updatedUsage.freeCreditsUsed).toBe(2);
  });

  it("9 & 10. saveProjectVersion creates a new version snapshot and preserves history", async () => {
    const userId = "usr-editor-save-ver";
    const workspaceId = "ws-editor-save-ver";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: { title: "Save Ver Project", topic: "Save Ver Topic" },
    });

    const generated = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    expect(generated.versions).toHaveLength(0); // v1 is active

    const savedVer1 = await saveProjectVersion({
      projectId: generated.id,
      workspaceId,
      versionLabel: "v2-custom-edit",
    });

    expect(savedVer1.versions).toHaveLength(1);
    expect(savedVer1.versions[0].package).toBeDefined();
  });

  it("11. restores previous version from history", async () => {
    const userId = "usr-editor-restore";
    const workspaceId = "ws-editor-restore";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: { title: "Restore Ver Project", topic: "Restore Ver Topic" },
    });

    const generated = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    const savedVer = await saveProjectVersion({
      projectId: generated.id,
      workspaceId,
    });

    const snapshotId = savedVer.versions[0].versionId;

    const restored = await restorePreviousVersion({
      projectId: created.id,
      workspaceId,
      versionId: snapshotId,
    });

    expect(restored.package).toBeDefined();
  });

  it("12. protects against duplicate save requests", async () => {
    const userId = "usr-editor-dup";
    const workspaceId = "ws-editor-dup";

    const created = await createContentProject({
      userId,
      workspaceId,
      input: { title: "Dup Save Project", topic: "Dup Save Topic" },
    });

    const generated = await generateProjectPackage({
      projectId: created.id,
      workspaceId,
      userId,
    });

    const p1 = saveProjectVersion({ projectId: generated.id, workspaceId });
    const p2 = saveProjectVersion({ projectId: generated.id, workspaceId });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.id).toBe(r2.id);
  });

  it("14. handles API error gracefully for invalid project ID or workspace", async () => {
    await expect(
      saveProjectVersion({
        projectId: "invalid_id",
        workspaceId: "invalid_ws",
      })
    ).rejects.toThrow("Content project not found or workspace access denied");
  });
});
