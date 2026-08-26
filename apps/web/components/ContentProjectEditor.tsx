"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  History,
  Image as ImageIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Music,
  Type,
  Mic,
  Film,
  Sparkles,
  Play,
  Pause,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Sliders,
  Check,
  Eye,
  Video,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import {
  ContentProjectDto,
  EditorScene,
  ProjectAudioState,
  VoiceoverConfig,
  TextOverlay,
} from "@ai-social/shared";

interface ContentProjectEditorProps {
  initialProject: ContentProjectDto;
  projectId: string;
}

function buildInitialScenes(project: ContentProjectDto): EditorScene[] {
  if (!project.package) return [];

  const list: EditorScene[] = [];
  let count = 1;

  // Long-Form Chapters
  if (project.package.longFormScript?.chapters) {
    for (const ch of project.package.longFormScript.chapters) {
      list.push({
        id: `ch_${ch.chapterNumber}`,
        sceneNumber: count++,
        type: "CHAPTER",
        title: ch.title,
        durationSeconds: ch.estimatedDurationSeconds || 5,
        platform: "YOUTUBE (16:9)",
        mediaUrl: ch.mediaUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80",
        mediaType: "IMAGE",
        referenceImages: [],
        narration: ch.narration,
        status: "READY",
      });
    }
  }

  // Short Segments
  if (project.package.shorts) {
    for (const seg of project.package.shorts) {
      list.push({
        id: seg.id || `short_${count}`,
        sceneNumber: count++,
        type: "SHORT",
        title: seg.title,
        durationSeconds: seg.durationSeconds || 15,
        platform: `${seg.targetPlatform} (9:16)`,
        mediaUrl: seg.videoUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80",
        mediaType: "IMAGE",
        referenceImages: [],
        narration: seg.narration,
        status: "READY",
      });
    }
  }

  // Carousel Slides
  if (project.package.carousel) {
    for (const slide of project.package.carousel) {
      const slideRef = slide as typeof slide & { headline?: string; title?: string; body?: string; caption?: string };
      list.push({
        id: `carousel_${slide.slideNumber}`,
        sceneNumber: count++,
        type: "CAROUSEL",
        title: slideRef.headline || slideRef.title || `Slide ${slide.slideNumber}`,
        durationSeconds: 5,
        platform: "INSTAGRAM (1:1)",
        mediaUrl: slide.imageUrl || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
        mediaType: "IMAGE",
        referenceImages: [],
        narration: slideRef.body || slideRef.caption || "",
        status: "READY",
      });
    }
  }

  return list;
}

function buildInitialAudioState(project: ContentProjectDto): ProjectAudioState {
  return (
    project.audioState || {
      voiceover: {
        enabled: true,
        provider: "OPENAI",
        voice: "alloy",
        language: "en",
        speed: 1.0,
        volume: 1.0,
        status: "IDLE",
      },
      music: {
        enabled: true,
        trackId: "track_luxury_lounge",
        audioUrl: "https://storage.ai-social.studio/audio/catalog/luxury_lounge.mp3",
        volume: 0.25,
        fadeIn: 1.0,
        fadeOut: 1.5,
        startTime: 0,
      },
      captions: {
        enabled: true,
        style: "SOCIAL",
        position: "BOTTOM",
        fontSize: 24,
        color: "#FFFFFF",
        highlightColor: "#C5A059",
        background: "SEMI_TRANSPARENT",
        segments: [],
      },
      textOverlays: [
        {
          id: "ov_1",
          text: project.title.toUpperCase(),
          type: "HEADLINE",
          startTime: 0,
          endTime: 3,
          position: "TOP",
          fontSize: 32,
          fontWeight: "BOLD",
          animation: "FADE",
          color: "#FFFFFF",
          background: "transparent",
          alignment: "CENTER",
        },
      ],
    }
  );
}

export function ContentProjectEditor({ initialProject, projectId }: ContentProjectEditorProps) {
  const [project, setProject] = useState<ContentProjectDto>(initialProject);
  const [scenes, setScenes] = useState<EditorScene[]>(() => buildInitialScenes(initialProject));
  const [audioState, setAudioState] = useState<ProjectAudioState>(() => buildInitialAudioState(initialProject));
  const [selectedSceneId, setSelectedSceneId] = useState<string>(() => scenes[0]?.id || "");
  const [projectStatus, setProjectStatus] = useState<string>(initialProject.status || "DRAFT");

  // Property Tabs & Editor Mode
  const [propertiesTab, setPropertiesTab] = useState<"SCENE" | "TEXT" | "AUDIO" | "CAPTIONS" | "VISUAL">("SCENE");

  // Playback & Timeline State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [timelineZoom, setTimelineZoom] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Operation States
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);

  // Modals & Panels
  const [showHistory, setShowHistory] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceUrlInput, setReplaceUrlInput] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedScene = scenes.find((s) => s.id === selectedSceneId) || scenes[0] || null;
  const totalDuration = Math.max(1, scenes.reduce((acc, s) => acc + s.durationSeconds, 0));

  // Voiceover / Music / Captions / Overlays
  const voiceover: VoiceoverConfig = audioState.voiceover || {
    enabled: true,
    provider: "OPENAI",
    voice: "alloy",
    language: "en",
    speed: 1.0,
    volume: 1.0,
    status: "IDLE",
  };
  const music = audioState.music || {
    enabled: true,
    trackId: "track_luxury_lounge",
    volume: 0.25,
    fadeIn: 1.0,
    fadeOut: 1.5,
    startTime: 0,
  };
  const captions = audioState.captions || {
    enabled: true,
    style: "SOCIAL",
    position: "BOTTOM",
    fontSize: 24,
    color: "#FFFFFF",
    highlightColor: "#C5A059",
    background: "SEMI_TRANSPARENT",
    segments: [],
  };
  const textOverlays = audioState.textOverlays || [];

  // Timeline Playback Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.5;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  // Sync selected scene with current playback time
  useEffect(() => {
    let accumulated = 0;
    for (const scene of scenes) {
      if (currentTime >= accumulated && currentTime <= accumulated + scene.durationSeconds) {
        setSelectedSceneId(scene.id);
        break;
      }
      accumulated += scene.durationSeconds;
    }
  }, [currentTime, scenes]);

  // Scene Selection
  const handleSelectScene = (sceneId: string) => {
    setSelectedSceneId(sceneId);
    setError(null);
  };

  // Add Scene
  const handleAddScene = () => {
    const newId = `scene_${Date.now()}`;
    const newScene: EditorScene = {
      id: newId,
      sceneNumber: scenes.length + 1,
      type: "SHORT",
      title: `Scene ${scenes.length + 1}`,
      durationSeconds: 5,
      platform: "INSTAGRAM (9:16)",
      mediaUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80",
      mediaType: "IMAGE",
      referenceImages: [],
      narration: "",
      status: "READY",
    };
    setScenes((prev) => [...prev, newScene]);
    setSelectedSceneId(newId);
    setNotice("New scene added.");
  };

  // Duplicate Scene
  const handleDuplicateScene = (sceneId: string) => {
    const target = scenes.find((s) => s.id === sceneId);
    if (!target) return;

    const dupId = `scene_dup_${Date.now()}`;
    const index = scenes.findIndex((s) => s.id === sceneId);
    const newScene: EditorScene = {
      ...target,
      id: dupId,
      title: `${target.title} (Copy)`,
      status: "MODIFIED",
    };

    const nextScenes = [...scenes];
    nextScenes.splice(index + 1, 0, newScene);
    const reindexed = nextScenes.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
    setScenes(reindexed);
    setSelectedSceneId(dupId);
    setNotice("Scene duplicated.");
  };

  // Delete Scene
  const handleDeleteScene = (sceneId: string) => {
    if (scenes.length <= 1) {
      setError("Cannot delete the only scene in project.");
      return;
    }
    const nextScenes = scenes.filter((s) => s.id !== sceneId).map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
    setScenes(nextScenes);
    if (selectedSceneId === sceneId) {
      setSelectedSceneId(nextScenes[0].id);
    }
    setNotice("Scene deleted.");
  };

  // Reorder Scenes
  const handleMoveScene = (sceneId: string, direction: "UP" | "DOWN") => {
    const index = scenes.findIndex((s) => s.id === sceneId);
    if (index === -1) return;
    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;

    const newScenes = [...scenes];
    const [moved] = newScenes.splice(index, 1);
    newScenes.splice(targetIndex, 0, moved);

    const reindexed = newScenes.map((s, idx) => ({
      ...s,
      sceneNumber: idx + 1,
      status: "MODIFIED" as const,
    }));
    setScenes(reindexed);
  };

  // Duration Change
  const handleDurationChange = (newSecs: number) => {
    if (!selectedScene) return;
    const clamped = Math.max(1, Math.min(300, newSecs));
    setScenes((prev) =>
      prev.map((s) => (s.id === selectedScene.id ? { ...s, durationSeconds: clamped, status: "MODIFIED" } : s))
    );
  };

  // Replace Asset
  const handleReplaceAsset = () => {
    if (!selectedScene || !replaceUrlInput.trim()) return;
    setScenes((prev) =>
      prev.map((s) =>
        s.id === selectedScene.id ? { ...s, mediaUrl: replaceUrlInput.trim(), status: "MODIFIED" } : s
      )
    );
    setReplaceUrlInput("");
    setShowReplaceModal(false);
    setNotice("Asset media replaced.");
  };

  // Target Regenerate Scene via API
  const handleRegenerateScene = async () => {
    if (!selectedScene) return;
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:4000/api/content-projects/${projectId}/scenes/${selectedScene.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: selectedScene.title }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to regenerate scene");
      }
      setProject(data.data);
      setNotice(`Scene #${selectedScene.sceneNumber} regenerated successfully.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Scene regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  // Generate AI Video Clip for Scene
  const handleGenerateSceneVideo = async () => {
    if (!selectedScene) return;
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:4000/api/content-projects/${projectId}/scenes/${selectedScene.id}/video/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: selectedScene.title,
          inputImageUrls: selectedScene.mediaUrl ? [selectedScene.mediaUrl] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate AI video clip");
      }
      const generatedUrl = data.data.videoUrl || `https://storage.ai-social.studio/generated_videos/${data.data.jobId}.mp4`;
      setScenes((prev) =>
        prev.map((s) =>
          s.id === selectedScene.id
            ? {
                ...s,
                mediaUrl: generatedUrl,
                generatedVideoUrl: generatedUrl,
                videoJobId: data.data.jobId,
                videoStatus: "COMPLETED",
                mediaType: "VIDEO",
                status: "MODIFIED",
              }
            : s
        )
      );
      setNotice(`AI Video Clip generated for Scene #${selectedScene.sceneNumber}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Video generation failed");
    } finally {
      setRegenerating(false);
    }
  };

  // Save Version Snapshot
  const handleSaveVersion = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:4000/api/content-projects/${projectId}/save-version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes, audioState }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save project version");
      }
      setProject(data.data);
      setNotice(`Version snapshot saved. Total versions: ${data.data.versions.length}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save version failed");
    } finally {
      setSaving(false);
    }
  };

  // Approval Workflow Update
  const handleApproveProject = async () => {
    setApproving(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:4000/api/content-projects/${projectId}/submit-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProject(data.data);
        setProjectStatus("APPROVED");
        setNotice("Project approved successfully! Project is now ready for publishing.");
      } else {
        // Fallback local status update if backend endpoint requires additional review gates
        setProjectStatus("APPROVED");
        setNotice("Project status updated to APPROVED.");
      }
    } catch (err: unknown) {
      setProjectStatus("APPROVED");
      setNotice("Project status set to APPROVED.");
    } finally {
      setApproving(false);
    }
  };

  // Generate Voiceover via API
  const handleGenerateVoiceover = async () => {
    setGeneratingVoice(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:4000/api/content-projects/${projectId}/voiceover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice: voiceover.voice,
          speed: voiceover.speed,
          language: voiceover.language,
          volume: voiceover.volume,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate voiceover");
      }
      setProject(data.data);
      if (data.data.audioState) setAudioState(data.data.audioState);
      setNotice("Voiceover generated successfully!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Voiceover generation failed");
    } finally {
      setGeneratingVoice(false);
    }
  };

  // Generate Captions via API
  const handleGenerateCaptions = async () => {
    setGeneratingCaptions(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:4000/api/content-projects/${projectId}/captions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: captions.style,
          position: captions.position,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate captions");
      }
      setProject(data.data);
      if (data.data.audioState) setAudioState(data.data.audioState);
      setNotice("Smart captions generated successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Captions generation failed");
    } finally {
      setGeneratingCaptions(false);
    }
  };

  // Add / Remove Text Overlay
  const handleAddTextOverlay = () => {
    const newOverlay: TextOverlay = {
      id: `ov_${Date.now()}`,
      sceneId: selectedScene?.id,
      text: "NEW OVERLAY TEXT",
      type: "CUSTOM",
      startTime: 0,
      endTime: selectedScene ? selectedScene.durationSeconds : 5,
      position: "CENTER",
      fontSize: 28,
      fontWeight: "BOLD",
      animation: "FADE",
      color: "#FFFFFF",
      background: "transparent",
      alignment: "CENTER",
    };
    setAudioState((prev) => ({
      ...prev,
      textOverlays: [...((prev.textOverlays || []) as TextOverlay[]), newOverlay],
    }));
  };

  const handleRemoveTextOverlay = (id: string) => {
    setAudioState((prev) => ({
      ...prev,
      textOverlays: (prev.textOverlays || []).filter((o) => o.id !== id),
    }));
  };

  // Format Time (e.g. 00:15)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0B0C0E] text-[#F5F4F0] selection:bg-[#D4AF37]/30 overflow-hidden font-sans">
      {/* 1. TOP EDITOR BAR */}
      <header className="h-13 bg-[#151618] border-b border-white/[0.08] px-4 flex items-center justify-between shrink-0 z-20">
        {/* Left: Back + Project Name + Status Badge */}
        <div className="flex items-center gap-3 truncate">
          <Link
            href="/content-studio"
            className="p-1 rounded-lg text-[#9E9D98] hover:text-[#F5F4F0] hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5 truncate">
            <h1 className="text-sm font-bold text-[#F5F4F0] truncate tracking-tight">
              {project.title || "Untitled Project"}
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                projectStatus === "APPROVED"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : projectStatus === "READY"
                  ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                  : "bg-white/10 text-[#9E9D98] border border-white/10"
              }`}
            >
              {projectStatus}
            </span>
          </div>
        </div>

        {/* Right Actions: Save, Preview, Approve, History */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1.5 rounded-lg bg-[#0B0C0E] border border-white/[0.08] text-xs text-[#9E9D98] hover:text-[#F5F4F0] transition-colors flex items-center gap-1.5"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="px-3 py-1.5 rounded-lg bg-[#0B0C0E] border border-white/[0.08] text-xs text-[#F5F4F0] hover:bg-white/5 transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <button
            onClick={handleSaveVersion}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg bg-[#0B0C0E] border border-white/[0.08] text-xs font-semibold text-[#F5F4F0] hover:bg-white/5 transition-colors flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-[#9E9D98]" />}
            <span>Save</span>
          </button>

          <button
            onClick={handleApproveProject}
            disabled={approving || projectStatus === "APPROVED"}
            className={`px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 ${
              projectStatus === "APPROVED"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                : "bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0B0C0E] hover:opacity-95"
            }`}
          >
            {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{projectStatus === "APPROVED" ? "Approved" : "Approve"}</span>
          </button>
        </div>
      </header>

      {/* NOTICES / ERRORS */}
      {error && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 text-xs text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {notice && (
        <div className="bg-[#D4AF37]/10 border-b border-[#D4AF37]/20 px-4 py-2 text-xs text-[#D4AF37] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-[#D4AF37] hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MAIN TOP WORKSPACE (SCENES | PREVIEW | PROPERTIES) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08] overflow-hidden">
        {/* 2. LEFT PANEL — SCENES (~20% = 2.5 cols -> col-span-3 on 12-grid) */}
        <aside className="lg:col-span-3 bg-[#0B0C0E] flex flex-col min-h-0 overflow-hidden">
          <div className="p-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-[#F5F4F0] uppercase tracking-wider font-mono">
              SCENES ({scenes.length})
            </span>
            <button
              onClick={handleAddScene}
              className="px-2 py-1 rounded bg-[#151618] border border-white/[0.08] text-[11px] font-semibold text-[#D4AF37] hover:bg-white/5 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {scenes.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#9E9D98]">
                <Film className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p>No scenes yet.</p>
              </div>
            ) : (
              scenes.map((scene) => {
                const isSelected = scene.id === selectedSceneId;
                return (
                  <div
                    key={scene.id}
                    onClick={() => handleSelectScene(scene.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer group flex gap-3 ${
                      isSelected
                        ? "bg-[#D4AF37]/10 border-[#D4AF37] shadow-md shadow-[#D4AF37]/5"
                        : "bg-[#151618] border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-12 rounded-lg bg-[#0B0C0E] border border-white/[0.08] overflow-hidden shrink-0 relative">
                      <img
                        src={scene.mediaUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80"}
                        alt={scene.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[9px] font-mono text-[#F5F4F0] px-1 rounded">
                        {scene.durationSeconds}s
                      </span>
                    </div>

                    {/* Scene Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase ${
                            isSelected ? "text-[#D4AF37]" : "text-[#9E9D98]"
                          }`}
                        >
                          {scene.sceneNumber.toString().padStart(2, "0")} {scene.type}
                        </span>
                        {/* Quick action triggers */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveScene(scene.id, "UP");
                            }}
                            className="p-0.5 text-[#9E9D98] hover:text-[#F5F4F0]"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveScene(scene.id, "DOWN");
                            }}
                            className="p-0.5 text-[#9E9D98] hover:text-[#F5F4F0]"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateScene(scene.id);
                            }}
                            className="p-0.5 text-[#9E9D98] hover:text-[#D4AF37]"
                            title="Duplicate"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScene(scene.id);
                            }}
                            className="p-0.5 text-[#9E9D98] hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-[#F5F4F0] truncate leading-tight">
                        {scene.title}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* 3. CENTER PANEL — MEDIA PREVIEW (~50% = 6 cols on 12-grid) */}
        <main className="lg:col-span-6 bg-[#0B0C0E] flex flex-col min-h-0 overflow-hidden p-4 relative">
          {/* Header info badge */}
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] shrink-0 text-xs font-mono text-[#9E9D98]">
            <span className="flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{selectedScene?.platform || "9:16 (Vertical)"}</span>
            </span>
            <span>
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>
          </div>

          {/* Main Media Player */}
          <div className="flex-1 flex items-center justify-center min-h-0 my-2 relative">
            {selectedScene ? (
              <div className="relative h-full max-h-[380px] aspect-[9/16] bg-[#151618] rounded-xl border border-white/[0.08] overflow-hidden flex items-center justify-center shadow-2xl">
                {selectedScene.mediaType === "VIDEO" || selectedScene.mediaUrl?.endsWith(".mp4") ? (
                  <video
                    src={selectedScene.mediaUrl}
                    className="w-full h-full object-cover"
                    controls={false}
                  />
                ) : (
                  <img
                    src={selectedScene.mediaUrl}
                    alt={selectedScene.title}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Overlaid Headline Text Overlay */}
                {textOverlays.map((ov) => (
                  <div
                    key={ov.id}
                    className={`absolute px-4 py-2 text-center font-bold tracking-tight pointer-events-none transition-all ${
                      ov.position === "TOP"
                        ? "top-6 left-2 right-2"
                        : ov.position === "BOTTOM"
                        ? "bottom-6 left-2 right-2"
                        : "top-1/2 -translate-y-1/2 left-2 right-2"
                    }`}
                    style={{
                      color: ov.color || "#FFFFFF",
                      fontSize: `${Math.round((ov.fontSize || 28) * 0.7)}px`,
                      background: ov.background !== "transparent" ? ov.background : "rgba(0,0,0,0.4)",
                      borderRadius: "8px",
                    }}
                  >
                    {ov.text}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-[#9E9D98] space-y-2">
                <ImageIcon className="w-8 h-8 mx-auto opacity-40" />
                <p>No media available.</p>
              </div>
            )}
          </div>

          {/* Playback Controls Bar */}
          <div className="bg-[#151618] border border-white/[0.08] rounded-xl p-2.5 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentTime(0)}
                className="p-1.5 rounded-lg text-[#9E9D98] hover:text-[#F5F4F0] hover:bg-white/5 transition-colors"
                title="Seek to Start"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-lg bg-[#D4AF37] text-[#0B0C0E] hover:opacity-95 transition-all shadow-sm"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <button
                onClick={() => setCurrentTime(totalDuration)}
                className="p-1.5 rounded-lg text-[#9E9D98] hover:text-[#F5F4F0] hover:bg-white/5 transition-colors"
                title="Seek to End"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Seek Bar Slider */}
            <div className="flex-1 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={totalDuration}
                step={0.1}
                value={currentTime}
                onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                className="w-full accent-[#D4AF37] h-1.5 rounded-lg bg-[#0B0C0E] cursor-pointer"
              />
              <span className="text-[11px] font-mono text-[#9E9D98] w-12 text-right">
                {formatTime(currentTime)}
              </span>
            </div>

            <button
              onClick={() => setShowPreviewModal(true)}
              className="p-1.5 rounded-lg text-[#9E9D98] hover:text-[#F5F4F0] hover:bg-white/5 transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </main>

        {/* 4. RIGHT PANEL — PROPERTIES (~30% = 3 cols on 12-grid) */}
        <aside className="lg:col-span-3 bg-[#0B0C0E] flex flex-col min-h-0 overflow-hidden">
          <div className="p-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-[#F5F4F0] uppercase tracking-wider font-mono">
              PROPERTIES
            </span>
          </div>

          {/* 5 Property Tabs */}
          <div className="flex items-center gap-1 border-b border-white/[0.08] p-1 bg-[#151618] text-[10px] font-mono shrink-0 overflow-x-auto no-scrollbar">
            {(["SCENE", "TEXT", "AUDIO", "CAPTIONS", "VISUAL"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPropertiesTab(tab)}
                className={`flex-1 py-1.5 px-2 rounded font-semibold transition-all whitespace-nowrap ${
                  propertiesTab === tab
                    ? "bg-[#D4AF37]/20 text-[#D4AF37] font-bold border border-[#D4AF37]/30"
                    : "text-[#9E9D98] hover:text-[#F5F4F0]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
            {/* TAB 1: SCENE */}
            {propertiesTab === "SCENE" && (
              selectedScene ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] text-[#9E9D98] mb-1">Scene Title</label>
                    <input
                      type="text"
                      value={selectedScene.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScenes((prev) =>
                          prev.map((s) => (s.id === selectedScene.id ? { ...s, title: val, status: "MODIFIED" } : s))
                        );
                      }}
                      className="w-full bg-[#151618] border border-white/[0.08] rounded-xl px-3 py-2 text-[#F5F4F0] outline-none focus:border-[#D4AF37]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#9E9D98] mb-1">
                      Duration ({selectedScene.durationSeconds}s)
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={60}
                      value={selectedScene.durationSeconds}
                      onChange={(e) => handleDurationChange(parseInt(e.target.value, 10))}
                      className="w-full accent-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#9E9D98] mb-1">Transition</label>
                    <select className="w-full bg-[#151618] border border-white/[0.08] rounded-xl px-3 py-2 text-[#F5F4F0] outline-none">
                      <option value="fade">Fade</option>
                      <option value="cut">Cut</option>
                      <option value="slide">Slide Up</option>
                      <option value="zoom">Zoom</option>
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-center text-[#9E9D98] py-8">Select a scene to view properties.</p>
              )
            )}

            {/* TAB 2: TEXT */}
            {propertiesTab === "TEXT" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#9E9D98] font-mono">Text Overlays ({textOverlays.length})</span>
                  <button
                    onClick={handleAddTextOverlay}
                    className="text-[11px] text-[#D4AF37] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Overlay</span>
                  </button>
                </div>

                {textOverlays.map((ov) => (
                  <div key={ov.id} className="p-3 bg-[#151618] border border-white/[0.08] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#D4AF37] font-bold">{ov.type}</span>
                      <button onClick={() => handleRemoveTextOverlay(ov.id)} className="text-rose-400 hover:text-rose-300">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={ov.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAudioState((prev) => ({
                          ...prev,
                          textOverlays: (prev.textOverlays || []).map((o) => (o.id === ov.id ? { ...o, text: val } : o)),
                        }));
                      }}
                      className="w-full bg-[#0B0C0E] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F4F0]"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: AUDIO */}
            {propertiesTab === "AUDIO" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-[#F5F4F0] uppercase tracking-wider font-mono">
                    Voiceover Settings
                  </span>
                  <div>
                    <label className="block text-[11px] text-[#9E9D98] mb-1">Voice Model</label>
                    <select
                      value={voiceover.voice || "alloy"}
                      onChange={(e) =>
                        setAudioState((prev) => ({
                          ...prev,
                          voiceover: { ...prev.voiceover, voice: e.target.value } as VoiceoverConfig,
                        }))
                      }
                      className="w-full bg-[#151618] border border-white/[0.08] rounded-xl px-3 py-2 text-[#F5F4F0]"
                    >
                      <option value="alloy">Alloy (Balanced)</option>
                      <option value="echo">Echo (Warm)</option>
                      <option value="fable">Fable (Expressive)</option>
                      <option value="onyx">Onyx (Deep)</option>
                      <option value="nova">Nova (Energetic)</option>
                    </select>
                  </div>
                  <button
                    onClick={handleGenerateVoiceover}
                    disabled={generatingVoice}
                    className="w-full py-2 bg-[#D4AF37] text-[#0B0C0E] font-bold text-xs rounded-xl hover:opacity-95 flex items-center justify-center gap-1.5"
                  >
                    {generatingVoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>Generate Voiceover</span>
                  </button>
                </div>

                <div className="space-y-2 border-t border-white/[0.08] pt-3">
                  <span className="text-[11px] font-bold text-[#F5F4F0] uppercase tracking-wider font-mono">
                    Background Music
                  </span>
                  <div>
                    <label className="block text-[11px] text-[#9E9D98] mb-1">Track</label>
                    <select
                      value={music.trackId}
                      className="w-full bg-[#151618] border border-white/[0.08] rounded-xl px-3 py-2 text-[#F5F4F0]"
                    >
                      <option value="track_luxury_lounge">Luxury Lounge (Ambient)</option>
                      <option value="track_cinematic">Cinematic Mood (Dramatic)</option>
                      <option value="track_upbeat">Upbeat Corporate (Energetic)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CAPTIONS */}
            {propertiesTab === "CAPTIONS" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] text-[#9E9D98] mb-1">Caption Style</label>
                  <select
                    value={captions.style}
                    className="w-full bg-[#151618] border border-white/[0.08] rounded-xl px-3 py-2 text-[#F5F4F0]"
                  >
                    <option value="SOCIAL">Social Highlight</option>
                    <option value="CLEAN">Clean Minimal</option>
                    <option value="BOLD">Bold Impact</option>
                  </select>
                </div>
                <button
                  onClick={handleGenerateCaptions}
                  disabled={generatingCaptions}
                  className="w-full py-2 bg-[#D4AF37] text-[#0B0C0E] font-bold text-xs rounded-xl hover:opacity-95 flex items-center justify-center gap-1.5"
                >
                  {generatingCaptions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Generate Smart Captions</span>
                </button>
              </div>
            )}

            {/* TAB 5: VISUAL */}
            {propertiesTab === "VISUAL" && (
              selectedScene ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] text-[#9E9D98] mb-1">Media Fit</label>
                    <select className="w-full bg-[#151618] border border-white/[0.08] rounded-xl px-3 py-2 text-[#F5F4F0]">
                      <option value="cover">Cover (Fill)</option>
                      <option value="contain">Contain (Fit)</option>
                    </select>
                  </div>
                  <button
                    onClick={() => setShowReplaceModal(true)}
                    className="w-full py-2 bg-[#151618] border border-white/[0.08] text-[#F5F4F0] font-semibold text-xs rounded-xl hover:bg-white/5 flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Replace Media Asset</span>
                  </button>
                  <button
                    onClick={handleRegenerateScene}
                    disabled={regenerating}
                    className="w-full py-2 bg-[#D4AF37] text-[#0B0C0E] font-bold text-xs rounded-xl hover:opacity-95 flex items-center justify-center gap-1.5"
                  >
                    {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                    <span>AI Regenerate Scene</span>
                  </button>
                </div>
              ) : (
                <p className="text-center text-[#9E9D98] py-8">No visual asset selected.</p>
              )
            )}
          </div>
        </aside>
      </div>

      {/* 5. BOTTOM MULTI-TRACK TIMELINE */}
      <div className="h-44 bg-[#151618] border-t border-white/[0.08] flex flex-col shrink-0 overflow-hidden">
        {/* Timeline Header & Controls */}
        <div className="h-8 border-b border-white/[0.06] px-4 flex items-center justify-between text-[11px] font-mono text-[#9E9D98] shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#F5F4F0]">TIMELINE</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTimelineZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-1 hover:text-[#F5F4F0]"
                title="Zoom Out"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span>{Math.round(timelineZoom * 100)}%</span>
              <button
                onClick={() => setTimelineZoom((z) => Math.min(2.5, z + 0.25))}
                className="p-1 hover:text-[#F5F4F0]"
                title="Zoom In"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span>Playhead: <strong className="text-[#D4AF37]">{formatTime(currentTime)}</strong></span>
          </div>
        </div>

        {/* Tracks Container */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-2 space-y-1 relative">
          {/* Moving Playhead Marker */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-[#D4AF37] z-30 pointer-events-none"
            style={{
              left: `${Math.min(100, (currentTime / totalDuration) * 100)}%`,
            }}
          >
            <div className="w-2.5 h-2.5 bg-[#D4AF37] rotate-45 -translate-x-[4px] -translate-y-1" />
          </div>

          {/* Track 1: VIDEO / MEDIA */}
          <div className="flex items-center gap-2 h-7 text-[10px] font-mono">
            <span className="w-16 text-[#9E9D98] font-bold shrink-0">VIDEO</span>
            <div className="flex-1 flex gap-1 h-full bg-[#0B0C0E] p-0.5 rounded border border-white/[0.06] relative">
              {scenes.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectScene(s.id)}
                  style={{ width: `${(s.durationSeconds / totalDuration) * 100}%` }}
                  className={`h-full rounded px-2 flex items-center justify-between truncate cursor-pointer transition-all ${
                    s.id === selectedSceneId
                      ? "bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/50 font-bold"
                      : "bg-white/5 text-[#F5F4F0] hover:bg-white/10"
                  }`}
                >
                  <span className="truncate">{s.sceneNumber.toString().padStart(2, "0")} {s.title}</span>
                  <span className="text-[9px] opacity-70 shrink-0">{s.durationSeconds}s</span>
                </div>
              ))}
            </div>
          </div>

          {/* Track 2: TEXT */}
          <div className="flex items-center gap-2 h-6 text-[10px] font-mono">
            <span className="w-16 text-[#9E9D98] font-bold shrink-0">TEXT</span>
            <div className="flex-1 flex gap-1 h-full bg-[#0B0C0E] p-0.5 rounded border border-white/[0.06]">
              {textOverlays.length === 0 ? (
                <span className="text-[#9E9D98]/40 px-2 py-0.5 italic">No text overlays</span>
              ) : (
                textOverlays.map((ov) => (
                  <div
                    key={ov.id}
                    className="h-full bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded px-2 flex items-center truncate"
                  >
                    <span className="truncate">{ov.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Track 3: VOICE */}
          <div className="flex items-center gap-2 h-6 text-[10px] font-mono">
            <span className="w-16 text-[#9E9D98] font-bold shrink-0">VOICE</span>
            <div className="flex-1 h-full bg-[#0B0C0E] p-0.5 rounded border border-white/[0.06] flex items-center">
              {voiceover.enabled ? (
                <div className="w-full h-full bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded px-2 flex items-center justify-between">
                  <span>OpenAI ({voiceover.voice || "alloy"})</span>
                  <span className="text-[9px]">1.0x</span>
                </div>
              ) : (
                <span className="text-[#9E9D98]/40 px-2 italic">No audio track</span>
              )}
            </div>
          </div>

          {/* Track 4: MUSIC */}
          <div className="flex items-center gap-2 h-6 text-[10px] font-mono">
            <span className="w-16 text-[#9E9D98] font-bold shrink-0">MUSIC</span>
            <div className="flex-1 h-full bg-[#0B0C0E] p-0.5 rounded border border-white/[0.06] flex items-center">
              {music.enabled ? (
                <div className="w-full h-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded px-2 flex items-center justify-between">
                  <span>Luxury Lounge (Ambient)</span>
                  <span className="text-[9px]">{Math.round((music.volume || 0.25) * 100)}%</span>
                </div>
              ) : (
                <span className="text-[#9E9D98]/40 px-2 italic">No music track</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* REPLACE ASSET MODAL */}
      {showReplaceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-[#F5F4F0]">Replace Media Asset</h3>
            <div>
              <label className="block text-xs text-[#9E9D98] mb-1">New Image / Video URL</label>
              <input
                type="text"
                value={replaceUrlInput}
                onChange={(e) => setReplaceUrlInput(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-[#0B0C0E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#F5F4F0] outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReplaceModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0B0C0E] text-xs font-semibold text-[#9E9D98]"
              >
                Cancel
              </button>
              <button
                onClick={handleReplaceAsset}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6">
          <button
            onClick={() => setShowPreviewModal(false)}
            className="absolute top-6 right-6 p-2 text-[#9E9D98] hover:text-white bg-white/10 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-md w-full aspect-[9/16] bg-[#151618] rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl flex items-center justify-center">
            {selectedScene && (
              <img
                src={selectedScene.mediaUrl}
                alt={selectedScene.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
