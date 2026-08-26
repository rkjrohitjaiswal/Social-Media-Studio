"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  FileText,
  Video,
  Image as ImageIcon,
  Share2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Calendar,
  History,
  Tv,
  Plus,
  Edit3,
} from "lucide-react";
import { ContentProjectDto, ContentPackageResult } from "@ai-social/shared";

export function ContentCommandCenterStudio() {
  const [projects, setProjects] = useState<ContentProjectDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<ContentProjectDto | null>(null);

  // New Project Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newSourceText, setNewSourceText] = useState("");

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadProjects() {
      try {
        const res = await fetch("http://localhost:4000/api/content-projects");
        const data = await res.json();
        if (!ignore && data.success && Array.isArray(data.data)) {
          setProjects(data.data);
          if (data.data.length > 0 && !selectedProjectId) {
            setSelectedProjectId(data.data[0].id);
          }
        }
      } catch {
        // Fallback
      }
    }
    loadProjects();
    return () => { ignore = true; };
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    let ignore = false;
    async function loadDetails() {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:4000/api/content-projects/${selectedProjectId}`);
        const data = await res.json();
        if (!ignore && data.success) {
          setCurrentProject(data.data);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
    return () => { ignore = true; };
  }, [selectedProjectId]);

  const handleCreateProject = async () => {
    if (!newTitle.trim() || !newTopic.trim()) {
      setError("Please provide both a Title and Topic for the project");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:4000/api/content-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          topic: newTopic,
          sourceText: newSourceText,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create project");
      }

      setIsCreating(false);
      setNewTitle("");
      setNewTopic("");
      setNewSourceText("");
      setProjects((prev) => [data.data, ...prev]);
      setSelectedProjectId(data.data.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Project creation failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePackage = async () => {
    if (!selectedProjectId) return;

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:4000/api/content-projects/${selectedProjectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate package");
      }

      setCurrentProject(data.data);
      setNotice("Multi-platform Content Package successfully generated!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Package generation failed";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`http://localhost:4000/api/content-projects/${selectedProjectId}/submit-review`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setCurrentProject(data.data);
        setNotice("Content project submitted for client review & approval!");
      }
    } catch {
      setError("Failed to submit project for review");
    }
  };

  const handleScheduleProject = async () => {
    if (!selectedProjectId) return;
    try {
      const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();
      const res = await fetch(`http://localhost:4000/api/content-projects/${selectedProjectId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "YOUTUBE",
          scheduledAt: futureDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentProject(data.data);
        setNotice("Content project assets scheduled for publishing!");
      }
    } catch {
      setError("Failed to schedule project assets");
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`http://localhost:4000/api/content-projects/${selectedProjectId}/restore-version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentProject(data.data);
        setNotice(`Restored version ${versionId}`);
      }
    } catch {
      setError("Failed to restore version");
    }
  };

  const pkg: ContentPackageResult | null = currentProject?.package || null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      {/* HEADER & PROJECT SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#c5a059] uppercase tracking-wider font-semibold">Phase 3 Part 6</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/30">Content Command Center</span>
          </div>
          <h1 className="text-3xl font-bold font-serif-luxury text-[#f5f4f0] mt-1">
            Unified Content Command Center
          </h1>
          <p className="text-sm text-[#9e9d98]">
            Central container orchestrating multi-platform content creation, inline editing, version history, approvals & scheduling.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId || ""}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-[#14161a] border border-white/10 text-xs font-mono text-[#f5f4f0] rounded-xl px-3 py-2 outline-none focus:border-[#c5a059]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.status})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsCreating(true)}
            className="px-3.5 py-2 rounded-xl bg-[#c5a059] text-black font-bold font-mono text-xs hover:opacity-90 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* NEW PROJECT MODAL */}
      {isCreating && (
        <div className="glass-card p-6 rounded-3xl border border-[#c5a059]/30 bg-[#14161a] space-y-4 max-w-xl mx-auto">
          <h2 className="text-lg font-bold font-serif-luxury text-[#f5f4f0]">Create New Content Project</h2>
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[#9e9d98] font-mono">Project Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. How AI Agents Work Masterclass"
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-[#f5f4f0] mt-1 outline-none focus:border-[#c5a059]"
              />
            </div>
            <div>
              <label className="text-[#9e9d98] font-mono">Core Topic / Prompt</label>
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="e.g. How Autonomous AI Agents Work from scratch"
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-[#f5f4f0] mt-1 outline-none focus:border-[#c5a059]"
              />
            </div>
            <div>
              <label className="text-[#9e9d98] font-mono">Source Notes / Context</label>
              <textarea
                value={newSourceText}
                onChange={(e) => setNewSourceText(e.target.value)}
                rows={3}
                placeholder="Paste key notes or research outline..."
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-[#f5f4f0] mt-1 outline-none focus:border-[#c5a059]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsCreating(false)}
              className="px-3.5 py-2 rounded-xl bg-white/5 text-xs text-[#9e9d98] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateProject}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[#c5a059] text-black font-bold font-mono text-xs"
            >
              Create Project
            </button>
          </div>
        </div>
      )}

      {/* PROJECT DASHBOARD */}
      {currentProject && !isCreating && (
        <div className="space-y-6">
          {/* PROJECT STATUS & PROGRESS BANNER */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 bg-[#14161a] space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/40">
                    {currentProject.status}
                  </span>
                  <span className="text-xs font-mono text-[#9e9d98]">Credits Used: {currentProject.creditsConsumed}</span>
                </div>
                <h2 className="text-2xl font-bold font-serif-luxury text-[#f5f4f0] mt-1 flex items-center gap-2">
                  {currentProject.title}
                </h2>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleGeneratePackage}
                  disabled={generating}
                  className="px-4 py-2 rounded-xl bg-[#c5a059] text-black font-bold font-mono text-xs hover:opacity-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {currentProject.package ? "Regenerate Package" : "Generate Package"}
                </button>

                <Link
                  href={`/content-studio/${currentProject.id}/editor`}
                  className="px-4 py-2 rounded-xl bg-white/10 border border-[#c5a059]/40 text-xs font-mono text-[#c5a059] font-bold hover:bg-[#c5a059] hover:text-black transition-all flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Open Editor
                </Link>

                <button
                  onClick={handleSubmitForReview}
                  disabled={!currentProject.package || currentProject.status === "IN_REVIEW"}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-[#f5f4f0] hover:border-[#c5a059] hover:text-[#c5a059] transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Send for Review
                </button>

                <button
                  onClick={handleScheduleProject}
                  disabled={!currentProject.package}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-[#f5f4f0] hover:border-emerald-400 hover:text-emerald-400 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Calendar className="w-3.5 h-3.5" /> Schedule Assets
                </button>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#9e9d98]">Package Completion</span>
                <span className="text-[#c5a059] font-bold">
                  {currentProject.completedAssetsCount} / {currentProject.totalAssetsCount} Assets ({currentProject.progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-[#0b0c0e] h-2.5 rounded-full overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-[#c5a059] to-emerald-400 h-full transition-all duration-500"
                  style={{ width: `${currentProject.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* SOURCE MATERIAL & VERSION HISTORY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-5 rounded-2xl border border-white/10 bg-[#14161a] space-y-2">
              <h3 className="text-xs font-mono font-bold text-[#c5a059] uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Topic & Context
              </h3>
              <p className="text-xs text-[#f5f4f0] font-medium">{currentProject.topic}</p>
              {currentProject.sourceText && (
                <p className="text-[11px] text-[#9e9d98] line-clamp-3 italic">&quot;{currentProject.sourceText}&quot;</p>
              )}
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/10 bg-[#14161a] space-y-2 lg:col-span-2">
              <h3 className="text-xs font-mono font-bold text-[#c5a059] uppercase tracking-wider flex items-center gap-2">
                <History className="w-3.5 h-3.5" /> Version History ({currentProject.versions.length} Previous Saved Versions)
              </h3>
              {currentProject.versions.length === 0 ? (
                <p className="text-xs text-[#9e9d98]">Current version is v1. Regenerating will automatically store version snapshots.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentProject.versions.map((ver, idx) => (
                    <button
                      key={ver.versionId}
                      onClick={() => handleRestoreVersion(ver.versionId)}
                      className="px-3 py-1.5 rounded-xl bg-[#0b0c0e] border border-white/10 text-xs font-mono text-[#9e9d98] hover:text-[#c5a059] hover:border-[#c5a059] transition-all flex items-center gap-1.5"
                    >
                      <span>v{idx + 1} ({new Date(ver.timestamp).toLocaleTimeString()})</span>
                      <span className="text-[10px] text-[#c5a059] font-bold">Restore</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PACKAGE ASSETS CONTAINER */}
          {pkg && (
            <div className="space-y-6 pt-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-lg font-bold font-serif-luxury text-[#f5f4f0] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#c5a059]" /> Package Multi-Asset Container
                </h3>
              </div>

              {/* LONG FORM YOUTUBE VIDEO */}
              <div className="glass-card p-6 rounded-3xl border border-[#c5a059]/30 bg-[#14161a] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#c5a059] uppercase tracking-wider font-bold flex items-center gap-2">
                    <Tv className="w-4 h-4" /> 1. Long-Form YouTube Video (16:9)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Ready
                  </span>
                </div>
                <h4 className="text-base font-serif-luxury font-bold text-[#f5f4f0]">{pkg.longFormScript.title}</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                  {pkg.longFormScript.chapters.map((c) => (
                    <div key={c.chapterNumber} className="p-2.5 rounded-xl bg-[#0b0c0e] border border-white/10 space-y-1">
                      <span className="text-[10px] text-[#c5a059] font-mono">Ch #{c.chapterNumber} ({c.estimatedDurationSeconds}s)</span>
                      <h5 className="font-bold text-[#f5f4f0]">{c.title}</h5>
                    </div>
                  ))}
                </div>
              </div>

              {/* SHORT HIGHLIGHTS */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-[#c5a059] uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4" /> 2. Short Video Assets (Shorts / Reels / TikTok / LinkedIn)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {pkg.shorts.map((seg) => (
                    <div key={seg.id} className="p-4 rounded-2xl bg-[#14161a] border border-white/10 space-y-2">
                      <div className="flex justify-between text-[10px] font-mono text-[#9e9d98]">
                        <span className="text-[#c5a059] font-bold">{seg.targetPlatform}</span>
                        <span>{seg.durationSeconds}s</span>
                      </div>
                      <h5 className="text-xs font-bold text-[#f5f4f0]">{seg.title}</h5>
                      <p className="text-[11px] text-[#9e9d98] line-clamp-2">&quot;{seg.narration}&quot;</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CAROUSEL & THREAD */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-5 rounded-2xl border border-white/10 bg-[#14161a] space-y-3">
                  <h4 className="text-xs font-mono font-bold text-[#c5a059] uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> 3. Instagram Carousel (6 Slides)
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {pkg.carousel.map((slide) => (
                      <div key={slide.slideNumber} className="p-2.5 rounded-xl bg-[#0b0c0e] border border-white/10 text-[11px] space-y-0.5">
                        <span className="text-[9px] font-mono text-[#c5a059]">Slide #{slide.slideNumber}</span>
                        <h6 className="font-bold text-[#f5f4f0] line-clamp-1">{slide.title}</h6>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-white/10 bg-[#14161a] space-y-3">
                  <h4 className="text-xs font-mono font-bold text-[#c5a059] uppercase tracking-wider flex items-center gap-2">
                    <Share2 className="w-4 h-4" /> 4. X / Twitter Thread (5 Posts)
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pkg.xThread.map((post) => (
                      <div key={post.postIndex} className="p-2.5 rounded-xl bg-[#0b0c0e] border border-white/10 text-[11px] text-[#f5f4f0]">
                        {post.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
