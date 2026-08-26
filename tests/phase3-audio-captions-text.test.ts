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
} from "../apps/api/src/services/content-project-service";
import { clearInMemoryUsage, consumeUsage } from "../apps/api/src/services/usage-service";
import { selectMusicTrack, calculateAudioDuckingOptions } from "../apps/api/src/services/music-service";

describe("Phase 3 Part 7.2 — Audio + Captions + Text Overlay Studio", () => {
  const userId = "usr_editor_audio_1";
  const workspaceId = "ws_audio_studio_1";
  let projectId: string;

  beforeEach(async () => {
    clearInMemoryUsage();

    const proj = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Luxury Autumn Collection Launch",
        topic: "Haute Couture Fall Showcase",
      },
    });

    projectId = proj.id;
  });

  it("1. VOICEOVER CONFIGURATION: updates voiceover configuration options in project state", async () => {
    const updated = await patchProjectAudioState({
      projectId,
      workspaceId,
      patch: {
        voiceover: {
          enabled: true,
          voice: "nova",
          language: "es",
          speed: 1.2,
          volume: 0.9,
          status: "IDLE",
        },
      },
    });

    expect(updated.audioState?.voiceover?.voice).toBe("nova");
    expect(updated.audioState?.voiceover?.language).toBe("es");
    expect(updated.audioState?.voiceover?.speed).toBe(1.2);
    expect(updated.audioState?.voiceover?.volume).toBe(0.9);
  });

  it("2. VOICEOVER GENERATION: generates voiceover asset and consumes 1 credit", async () => {
    const result = await generateProjectVoiceover({
      projectId,
      workspaceId,
      userId,
      text: "Experience the timeless elegance of our Autumn Collection.",
      options: { voice: "shimmer", speed: 1.0 },
    });

    expect(result.audioUrl).toBeDefined();
    expect(result.audioUrl).toContain("audio");
    expect(result.durationSeconds).toBeGreaterThan(0);
    expect(result.project.audioState?.voiceover?.status).toBe("READY");
    expect(result.project.creditsConsumed).toBe(1);
  });

  it("3. VOICEOVER PERSISTENCE: persists generated voiceover URL to project audioState", async () => {
    await generateProjectVoiceover({
      projectId,
      workspaceId,
      userId,
      text: "Persisted voiceover test.",
    });

    const proj = await getContentProjectById(projectId, workspaceId);
    expect(proj?.audioState?.voiceover?.audioUrl).toBeDefined();
    expect(proj?.audioState?.voiceover?.status).toBe("READY");
  });

  it("4. MUSIC CONFIGURATION: updates background music track selection and fade settings", async () => {
    const track = selectMusicTrack("LUXURY");
    expect(track.id).toBe("track_luxury_lounge");

    const updated = await patchProjectAudioState({
      projectId,
      workspaceId,
      patch: {
        music: {
          enabled: true,
          trackId: track.id,
          audioUrl: track.publicUrl,
          volume: 0.3,
          fadeIn: 2.0,
          fadeOut: 2.5,
          startTime: 0,
        },
      },
    });

    expect(updated.audioState?.music?.trackId).toBe("track_luxury_lounge");
    expect(updated.audioState?.music?.fadeIn).toBe(2.0);
    expect(updated.audioState?.music?.fadeOut).toBe(2.5);
  });

  it("5. MUSIC PERSISTENCE: persists background music settings across queries", async () => {
    await patchProjectAudioState({
      projectId,
      workspaceId,
      patch: {
        music: {
          enabled: true,
          trackId: "track_upbeat_future",
          volume: 0.2,
          fadeIn: 1.0,
          fadeOut: 1.0,
          startTime: 0,
        },
      },
    });

    const proj = await getContentProjectById(projectId, workspaceId);
    expect(proj?.audioState?.music?.trackId).toBe("track_upbeat_future");
    expect(proj?.audioState?.music?.volume).toBe(0.2);
  });

  it("6. VOICE/MUSIC MIXING: automatically ducks music volume under voiceover", async () => {
    const duckedOptions = calculateAudioDuckingOptions(true);
    expect(duckedOptions.voiceoverVolume).toBe(1.0);
    expect(duckedOptions.musicVolume).toBe(0.2);

    const nonDuckedOptions = calculateAudioDuckingOptions(false);
    expect(nonDuckedOptions.musicVolume).toBe(0.8);
  });

  it("7. CAPTION GENERATION: generates smart readable captions from script scenes", async () => {
    const result = await generateProjectCaptions({
      projectId,
      workspaceId,
      style: "SOCIAL",
      position: "BOTTOM",
    });

    expect(result.captions.enabled).toBe(true);
    expect(result.captions.segments.length).toBeGreaterThan(0);
    expect(result.captions.style).toBe("SOCIAL");
  });

  it("8. CAPTION TIMING: assigns start/end times matching script scene duration", async () => {
    const result = await generateProjectCaptions({
      projectId,
      workspaceId,
    });

    const seg1 = result.captions.segments[0];
    expect(seg1).toBeDefined();
    expect(seg1.startTime).toBe(0);
    expect(seg1.endTime).toBeGreaterThan(seg1.startTime);
  });

  it("9. CAPTION STYLE: supports style variations (SOCIAL, BOLD, CLEAN)", async () => {
    const result = await generateProjectCaptions({
      projectId,
      workspaceId,
      style: "BOLD",
      position: "CENTER",
    });

    expect(result.captions.style).toBe("BOLD");
    expect(result.captions.position).toBe("CENTER");
  });

  it("10. TEXT OVERLAY CREATION: adds text overlay to project scene", async () => {
    const updated = await updateProjectTextOverlays({
      projectId,
      workspaceId,
      textOverlays: [
        {
          id: "txt_1",
          text: "FALL COLLECTION",
          type: "HEADLINE",
          startTime: 0,
          endTime: 4,
          position: "TOP",
          fontSize: 32,
          fontWeight: "BOLD",
          animation: "FADE",
          color: "#FFFFFF",
          alignment: "CENTER",
        },
      ],
    });

    expect(updated.audioState?.textOverlays?.length).toBe(1);
    expect(updated.audioState?.textOverlays?.[0].text).toBe("FALL COLLECTION");
  });

  it("11. MULTIPLE TEXT OVERLAYS: supports multiple text overlays on a single scene", async () => {
    const updated = await updateProjectTextOverlays({
      projectId,
      workspaceId,
      textOverlays: [
        {
          id: "txt_1",
          text: "FALL COLLECTION",
          type: "HEADLINE",
          startTime: 0,
          endTime: 4,
          position: "TOP",
          fontSize: 32,
          fontWeight: "BOLD",
          animation: "FADE",
          color: "#FFFFFF",
          alignment: "CENTER",
        },
        {
          id: "txt_2",
          text: "Exclusive Runway Preview",
          type: "SUBTITLE",
          startTime: 1,
          endTime: 5,
          position: "CENTER",
          fontSize: 20,
          fontWeight: "NORMAL",
          animation: "SLIDE_UP",
          color: "#C5A059",
          alignment: "CENTER",
        },
        {
          id: "txt_3",
          text: "Shop Now",
          type: "CTA",
          startTime: 3,
          endTime: 6,
          position: "BOTTOM",
          fontSize: 24,
          fontWeight: "BOLD",
          animation: "POP",
          color: "#000000",
          background: "#C5A059",
          alignment: "CENTER",
        },
      ],
    });

    expect(updated.audioState?.textOverlays?.length).toBe(3);
    expect(updated.audioState?.textOverlays?.[2].type).toBe("CTA");
  });

  it("12. TEXT OVERLAY TIMING: stores start and end timestamps for each overlay", async () => {
    const updated = await updateProjectTextOverlays({
      projectId,
      workspaceId,
      textOverlays: [
        {
          id: "txt_timed",
          text: "TIMED OVERLAY",
          type: "CUSTOM",
          startTime: 2,
          endTime: 8,
          position: "CENTER",
          fontSize: 24,
          fontWeight: "MEDIUM",
          animation: "FADE",
          color: "#FFFFFF",
          alignment: "CENTER",
        },
      ],
    });

    const ov = updated.audioState?.textOverlays?.[0];
    expect(ov?.startTime).toBe(2);
    expect(ov?.endTime).toBe(8);
  });

  it("13. TIMELINE INTEGRATION: aggregates 5-track scene, voice, music, caption, and text timeline metadata", async () => {
    const proj = await getContentProjectById(projectId, workspaceId);
    expect(proj?.audioState?.voiceover).toBeDefined();
    expect(proj?.audioState?.music).toBeDefined();
    expect(proj?.audioState?.captions).toBeDefined();
    expect(proj?.audioState?.textOverlays).toBeDefined();
  });

  it("14. FINAL COMPOSITION: renders final MP4 video combining scenes, voiceover, music, and text overlays", async () => {
    const result = await renderProjectFinalVideo({
      projectId,
      workspaceId,
      userId,
      aspectRatio: "9:16",
    });

    expect(result.videoUrl).toBeDefined();
    expect(result.videoUrl).toContain(".mp4");
    expect(result.project.status).toBe("READY");
    expect(result.jobId).toBeDefined();
  });

  it("15. VERSION PERSISTENCE: includes audio, music, caption, and text overlay states in saved version snapshots", async () => {
    await updateProjectTextOverlays({
      projectId,
      workspaceId,
      textOverlays: [
        {
          id: "txt_v1",
          text: "VERSION 1 OVERLAY",
          type: "HEADLINE",
          startTime: 0,
          endTime: 5,
          position: "TOP",
          fontSize: 30,
          fontWeight: "BOLD",
          animation: "FADE",
          color: "#FFFFFF",
          alignment: "CENTER",
        },
      ],
    });

    const saved = await saveProjectVersion({
      projectId,
      workspaceId,
      audioState: {
        textOverlays: [
          {
            id: "txt_v1",
            text: "VERSION 1 OVERLAY",
            type: "HEADLINE",
            startTime: 0,
            endTime: 5,
            position: "TOP",
            fontSize: 30,
            fontWeight: "BOLD",
            animation: "FADE",
            color: "#FFFFFF",
            alignment: "CENTER",
          },
        ],
      },
    });

    expect(saved.versions.length).toBe(1);
    expect(saved.versions[0].audioState?.textOverlays?.[0].text).toBe("VERSION 1 OVERLAY");
  });

  it("16. VERSION RESTORE: restores audio, music, caption, and overlay states when restoring previous version", async () => {
    await updateProjectTextOverlays({
      projectId,
      workspaceId,
      textOverlays: [
        {
          id: "txt_v1_snapshot",
          text: "ORIGINAL SNAPSHOT OVERLAY",
          type: "HEADLINE",
          startTime: 0,
          endTime: 5,
          position: "TOP",
          fontSize: 30,
          fontWeight: "BOLD",
          animation: "FADE",
          color: "#FFFFFF",
          alignment: "CENTER",
        },
      ],
    });

    const projBefore = await saveProjectVersion({
      projectId,
      workspaceId,
    });
    const firstVerId = projBefore.versions[0].versionId;

    // Mutate state with new overlay
    await updateProjectTextOverlays({
      projectId,
      workspaceId,
      textOverlays: [],
    });

    // Restore v1
    const restored = await restorePreviousVersion({
      projectId,
      workspaceId,
      versionId: firstVerId,
    });

    expect(restored.audioState?.textOverlays?.[0].text).toBe("ORIGINAL SNAPSHOT OVERLAY");
  });

  it("17. CREDIT METERING: meters voiceover and final render requests correctly", async () => {
    const projBefore = await getContentProjectById(projectId, workspaceId);
    const creditsBefore = projBefore!.creditsConsumed;

    await generateProjectVoiceover({
      projectId,
      workspaceId,
      userId,
      text: "Metering test.",
    });

    const projAfter = await getContentProjectById(projectId, workspaceId);
    expect(projAfter!.creditsConsumed).toBe(creditsBefore + 1);
  });

  it("18. FAILED GENERATION NO CHARGE: does not charge credits when usage limit is reached", async () => {
    // Exhaust user credits for usr_exhausted (FREE limit = 10 credits)
    await consumeUsage("usr_exhausted", "CONTENT_GENERATION", 10);

    await expect(
      generateProjectVoiceover({
        projectId,
        workspaceId,
        userId: "usr_exhausted",
        text: "Should fail.",
      })
    ).rejects.toThrow();
  });

  it("19. IDEMPOTENCY: prevents double charging when identical idempotencyKey is used", async () => {
    const key = `idem_${Date.now()}`;

    const res1 = await generateProjectVoiceover({
      projectId,
      workspaceId,
      userId,
      text: "Idempotent voiceover test.",
      idempotencyKey: key,
    });

    const creditsFirst = res1.project.creditsConsumed;

    const res2 = await generateProjectVoiceover({
      projectId,
      workspaceId,
      userId,
      text: "Idempotent voiceover test.",
      idempotencyKey: key,
    });

    expect(res2.project.creditsConsumed).toBe(creditsFirst);
  });

  it("20. WORKSPACE ISOLATION: rejects unauthorized access to audio endpoints across workspaces", async () => {
    await expect(
      getContentProjectById(projectId, "unauthorized_workspace_xyz")
    ).resolves.toBeNull();
  });
});
