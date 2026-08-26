"use client";

import React, { useState } from "react";
import {
  Video,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Zap,
  Music,
  Mic,
  Sparkles,
  Sliders,
} from "lucide-react";
import { getAuthHeader } from "@/lib/api-client";
import { VideoCompositionJobResult, VideoScriptOutput } from "@ai-social/shared";

export function ShortVideoStudio() {
  const [activeTab, setActiveTab] = useState<"QUICK_CREATE" | "PRO_MODE">("QUICK_CREATE");

  // QUICK CREATE STATE
  const [quickPrompt, setQuickPrompt] = useState("Explain React Server Components in 30 seconds.");
  const [quickDuration, setQuickDuration] = useState<15 | 30 | 60>(30);
  const [quickAspect, setQuickAspect] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [quickPlatform, setQuickPlatform] = useState<"INSTAGRAM" | "YOUTUBE_SHORT" | "TIKTOK">("INSTAGRAM");

  // PRO MODE STATE
  const [images, setImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop",
  ]);
  const [newImgUrl, setNewImgUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState<15 | 30 | 60>(15);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [title, setTitle] = useState("Haute Couture Autumn Highlights");
  const [captionsInput, setCaptionsInput] = useState("Bespoke elegance, Fine craftsmanship, Timeless luxury");
  const [transition, setTransition] = useState<"fade" | "cut">("fade");
  const [musicUrl, setMusicUrl] = useState("");
  const [voiceoverUrl, setVoiceoverUrl] = useState("");

  const [isComposing, setIsComposing] = useState(false);
  const [jobResult, setJobResult] = useState<VideoCompositionJobResult | null>(null);
  const [generatedScript, setGeneratedScript] = useState<VideoScriptOutput | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddImage = () => {
    if (!newImgUrl.trim()) return;
    if (images.length >= 10) {
      setErrorMsg("Maximum 10 input images allowed");
      return;
    }
    setImages((prev) => [...prev, newImgUrl.trim()]);
    setNewImgUrl("");
    setErrorMsg(null);
  };

  const handleRemoveImage = (idx: number) => {
    if (images.length <= 1) {
      setErrorMsg("At least 1 image is required");
      return;
    }
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setErrorMsg(null);
  };

  // QUICK AI CREATE
  const handleQuickCreate = async () => {
    if (!quickPrompt.trim()) return;
    setIsComposing(true);
    setErrorMsg(null);
    setJobResult(null);
    setGeneratedScript(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      const res = await fetch(`${apiBase}/api/video/smart-create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          prompt: quickPrompt,
          durationSeconds: quickDuration,
          aspectRatio: quickAspect,
          platform: quickPlatform,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setGeneratedScript(json.data.script);
        setJobResult(json.data.videoResult);
      } else {
        setErrorMsg(json.error || "Quick AI Video creation failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error during video creation";
      setErrorMsg(msg);
    } finally {
      setIsComposing(false);
    }
  };

  // PRO MODE MANUAL COMPOSE
  const handleComposeVideo = async () => {
    setIsComposing(true);
    setErrorMsg(null);
    setJobResult(null);
    setGeneratedScript(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      const captions = captionsInput.split(",").map((s) => s.trim()).filter(Boolean);

      const res = await fetch(`${apiBase}/api/video/compose`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          images,
          durationSeconds,
          aspectRatio,
          title,
          captions,
          transition,
          musicUrl: musicUrl || undefined,
          voiceoverUrl: voiceoverUrl || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setJobResult(json.data);
      } else {
        setErrorMsg(json.error || "Video composition failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error during video composition";
      setErrorMsg(msg);
    } finally {
      setIsComposing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* BANNER HEADER */}
      <div className="glass-card p-6 md:p-8 rounded-3xl space-y-3 border-l-4 border-l-[#c5a059] bg-[#14161a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#c5a059] uppercase tracking-wider">
            <Film className="w-4 h-4 text-[#c5a059]" />
            <span>Phase 3 — Short Video Engine</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/30 flex items-center gap-1.5">
            <Zap className="w-3 h-3 fill-[#c5a059]" />
            1 Credit Per Video
          </span>
        </div>
        <h2 className="font-serif-luxury text-2xl md:text-3xl font-bold text-[#f5f4f0]">
          AI Short Video Studio
        </h2>
        <p className="text-xs text-[#9e9d98] max-w-2xl">
          Generate script breakdowns, text-to-speech voiceovers, smart captions, and local FFmpeg video compositions in one click.
        </p>

        {/* QUICK CREATE VS PRO MODE TABS */}
        <div className="flex items-center gap-3 pt-3">
          <button
            onClick={() => setActiveTab("QUICK_CREATE")}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === "QUICK_CREATE"
                ? "bg-[#c5a059] text-black shadow-lg"
                : "bg-[#0b0c0e] text-[#9e9d98] border border-white/10 hover:text-[#f5f4f0]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> ⚡ Quick AI Create Mode
          </button>

          <button
            onClick={() => setActiveTab("PRO_MODE")}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === "PRO_MODE"
                ? "bg-[#c5a059] text-black shadow-lg"
                : "bg-[#0b0c0e] text-[#9e9d98] border border-white/10 hover:text-[#f5f4f0]"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> 🎛️ Pro Manual Mode
          </button>
        </div>
      </div>

      {/* QUICK AI CREATE MODE */}
      {activeTab === "QUICK_CREATE" && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6 border-white/10 max-w-3xl mx-auto">
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold uppercase text-[#9e9d98]">
              Topic or Prompt Brief
            </label>
            <textarea
              rows={3}
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              placeholder="e.g. Explain React Server Components in 30 seconds."
              className="w-full bg-[#0b0c0e] border border-white/10 rounded-2xl p-4 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-[#9e9d98]">Duration</label>
              <select
                value={quickDuration}
                onChange={(e) => setQuickDuration(Number(e.target.value) as 15 | 30 | 60)}
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
              >
                <option value={15}>15 Seconds (Reel/Short)</option>
                <option value={30}>30 Seconds (Standard)</option>
                <option value={60}>60 Seconds (Extended)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-[#9e9d98]">Aspect Ratio</label>
              <select
                value={quickAspect}
                onChange={(e) => setQuickAspect(e.target.value as "9:16" | "1:1" | "16:9")}
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
              >
                <option value="9:16">9:16 (Vertical Story / Reel)</option>
                <option value="1:1">1:1 (Square Feed Post)</option>
                <option value="16:9">16:9 (Landscape Video)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-[#9e9d98]">Platform</label>
              <select
                value={quickPlatform}
                onChange={(e) => setQuickPlatform(e.target.value as "INSTAGRAM" | "YOUTUBE_SHORT" | "TIKTOK")}
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
              >
                <option value="INSTAGRAM">Instagram Reel</option>
                <option value="YOUTUBE_SHORT">YouTube Short</option>
                <option value="TIKTOK">TikTok Video</option>
              </select>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            disabled={isComposing || !quickPrompt.trim()}
            onClick={handleQuickCreate}
            className="w-full py-4 rounded-2xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg uppercase tracking-wider font-mono"
          >
            {isComposing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Generating Script, Voice, Captions & Rendering MP4...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" />
                <span>⚡ Quick AI Generate & Compose Video (1 Credit)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* PRO MANUAL MODE */}
      {activeTab === "PRO_MODE" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN — INPUT IMAGES (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card p-5 rounded-2xl space-y-4 border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase text-[#9e9d98] flex items-center gap-2">
                  <span>1. Sequence Images</span>
                  <span className="text-[10px] text-emerald-400">({images.length}/10)</span>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {images.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group bg-black/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Seq ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[9px] font-mono bg-black/70 text-white px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>

              {images.length < 10 && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newImgUrl}
                    onChange={(e) => setNewImgUrl(e.target.value)}
                    placeholder="Paste image URL..."
                    className="flex-1 bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-3 py-2 bg-[#14161a] border border-white/10 hover:border-[#c5a059] text-[#c5a059] rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN — SETTINGS & COMPOSITION (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-card p-6 rounded-3xl space-y-5 border-white/10">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase text-[#9e9d98]">Video Title Overlay</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Autumn Couture Highlights"
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase text-[#9e9d98]">Scene Captions (comma-separated)</label>
                  <input
                    type="text"
                    value={captionsInput}
                    onChange={(e) => setCaptionsInput(e.target.value)}
                    placeholder="e.g. Bespoke elegance, Premium wool, Handcrafted detail"
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase text-[#9e9d98]">Duration</label>
                  <select
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Number(e.target.value) as 15 | 30 | 60)}
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
                  >
                    <option value={15}>15 Seconds (Reel/Short)</option>
                    <option value={30}>30 Seconds (Standard)</option>
                    <option value={60}>60 Seconds (Extended)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase text-[#9e9d98]">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as "9:16" | "1:1" | "16:9")}
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
                  >
                    <option value="9:16">9:16 (Vertical Feed / Story)</option>
                    <option value="1:1">1:1 (Square Post)</option>
                    <option value="16:9">16:9 (Landscape Video)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase text-[#9e9d98]">Transition Effect</label>
                  <select
                    value={transition}
                    onChange={(e) => setTransition(e.target.value as "fade" | "cut")}
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
                  >
                    <option value="fade">Fade Cross-Dissolve</option>
                    <option value="cut">Direct Hard Cut</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase text-[#9e9d98] flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-[#c5a059]" />
                    <span>Background Music (Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={musicUrl}
                    onChange={(e) => setMusicUrl(e.target.value)}
                    placeholder="Audio MP3 URL..."
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase text-[#9e9d98] flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-[#c5a059]" />
                    <span>Voiceover Audio (Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={voiceoverUrl}
                    onChange={(e) => setVoiceoverUrl(e.target.value)}
                    placeholder="Voiceover MP3 URL..."
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="button"
                disabled={isComposing || images.length === 0}
                onClick={handleComposeVideo}
                className="w-full py-3.5 rounded-2xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {isComposing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Composing MP4 Short Video with FFmpeg...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 text-black" />
                    <span>Compose {durationSeconds}s Short Video (1 Credit)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATED AI SCRIPT PREVIEW */}
      {generatedScript && (
        <div className="glass-card p-6 rounded-3xl space-y-4 border border-[#c5a059]/30 bg-[#14161a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#c5a059] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#c5a059]" /> Generated AI Video Script
            </span>
            <span className="text-xs font-mono text-[#9e9d98]">{generatedScript.scenes.length} Scenes</span>
          </div>
          <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0]">{generatedScript.title}</h3>
          <p className="text-xs text-[#c5a059] italic font-serif">Hook: &quot;{generatedScript.hook}&quot;</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {generatedScript.scenes.map((scene, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-[#0b0c0e] border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#9e9d98]">
                  <span>Scene #{scene.sceneNumber}</span>
                  <span>{scene.durationSeconds}s</span>
                </div>
                <p className="text-xs text-[#f5f4f0] font-medium">&quot;{scene.narration}&quot;</p>
                <span className="text-[10px] font-mono text-emerald-400 block">Caption: {scene.caption}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPLETED VIDEO DISPLAY & PLAYER */}
      {jobResult && (
        <div className="space-y-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Video Composition {jobResult.status}</span>
            </div>
            <span className="text-xs font-mono text-[#9e9d98]">
              Job ID: <code className="text-[#c5a059]">{jobResult.jobId}</code>
            </span>
          </div>

          {jobResult.videoAsset && (
            <div className="glass-card p-6 rounded-3xl space-y-4 border border-[#c5a059]/40 bg-[#14161a] max-w-xl mx-auto">
              <div className="aspect-[9/16] max-h-[480px] rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/10 mx-auto">
                <video
                  controls
                  className="w-full h-full object-contain"
                  src={jobResult.videoAsset.publicUrl}
                  poster={images[0]}
                >
                  Your browser does not support HTML5 video playback.
                </video>
              </div>

              <div className="space-y-2 text-center">
                <h4 className="font-serif-luxury text-lg font-bold text-[#f5f4f0]">
                  {jobResult.videoAsset.title || "Composed MP4 Short Video"}
                </h4>
                <div className="flex items-center justify-center gap-3 text-xs font-mono text-[#9e9d98]">
                  <span>Format: {jobResult.videoAsset.aspectRatio}</span>
                  <span>•</span>
                  <span>Duration: {jobResult.videoAsset.durationSeconds}s</span>
                  <span>•</span>
                  <span>Size: {(jobResult.videoAsset.fileSizeBytes / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
