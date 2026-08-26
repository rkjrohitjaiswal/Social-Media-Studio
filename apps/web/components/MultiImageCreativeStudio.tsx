"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Download,
  Wand2,
  Zap,
} from "lucide-react";
import { getAuthHeader } from "@/lib/api-client";
import { GeneratedCreativeVariant, CreativeGenerationRunResult } from "@ai-social/shared";

const DEFAULT_PRESET_IMAGES = [
  "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop",
];

const STYLE_PRESETS = [
  { id: "LUXURY", label: "Luxury & Couture", desc: "Warm gold lighting & soft shadows" },
  { id: "MINIMAL", label: "Minimalist Studio", desc: "Clean neutral backdrop & crisp lines" },
  { id: "CINEMATIC", label: "Cinematic Mood", desc: "Dramatic contrast & anamorphic depth" },
  { id: "VIBRANT", label: "Vibrant Lifestyle", desc: "High saturation & energetic tone" },
];

export function MultiImageCreativeStudio() {
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>(
    "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1200&auto=format&fit=crop"
  );

  const [inputImageUrls, setInputImageUrls] = useState<string[]>([
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop",
  ]);

  const [newImageUrl, setNewImageUrl] = useState<string>("");
  const [creativeBrief, setCreativeBrief] = useState<string>(
    "High-fashion autumn campaign showcase highlighting architectural silhouette, warm studio lighting, and premium material craftsmanship."
  );

  const [platform, setPlatform] = useState<string>("INSTAGRAM");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5" | "9:16" | "16:9">("4:5");
  const [count, setCount] = useState<number>(2);
  const [stylePreset, setStylePreset] = useState<string>("LUXURY");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<CreativeGenerationRunResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scheduledSuccessId, setScheduledSuccessId] = useState<string | null>(null);

  const handleAddInputImage = () => {
    if (!newImageUrl.trim()) return;
    if (inputImageUrls.length >= 5) {
      setErrorMsg("Maximum 5 input product images allowed");
      return;
    }
    setInputImageUrls((prev) => [...prev, newImageUrl.trim()]);
    setNewImageUrl("");
    setErrorMsg(null);
  };

  const handleRemoveInputImage = (index: number) => {
    if (inputImageUrls.length <= 1) {
      setErrorMsg("At least 1 input image is required");
      return;
    }
    setInputImageUrls((prev) => prev.filter((_, i) => i !== index));
    setErrorMsg(null);
  };

  const handleGenerateCreatives = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setScheduledSuccessId(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      const res = await fetch(`${apiBase}/api/creatives/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          referenceImageUrl: referenceImageUrl || undefined,
          inputImageUrls,
          creativeBrief,
          platform,
          aspectRatio,
          count,
          stylePreset,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setGenerationResult(json.data);
      } else {
        setErrorMsg(json.error || "Failed to generate multi-image creatives");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error generating creatives";
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScheduleVariant = async (variant: GeneratedCreativeVariant) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      const res = await fetch(`${apiBase}/api/calendar/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          scheduledFor: new Date(Date.now() + 86400000).toISOString(),
          captionSnapshot: `${variant.headline}\n\n${variant.caption}`,
          platform: variant.platform,
        }),
      });

      if (res.ok) {
        setScheduledSuccessId(variant.id);
        setTimeout(() => setScheduledSuccessId(null), 4000);
      }
    } catch {
      // Handle schedule error
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div className="glass-card p-6 md:p-8 rounded-3xl space-y-3 border-l-4 border-l-[#c5a059] bg-[#14161a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#c5a059] uppercase tracking-wider">
            <Wand2 className="w-4 h-4 text-[#c5a059]" />
            <span>Phase 3 — AI Creative Studio</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/30 flex items-center gap-1.5">
            <Zap className="w-3 h-3 fill-[#c5a059]" />
            1 Credit Per Run
          </span>
        </div>
        <h2 className="font-serif-luxury text-2xl md:text-3xl font-bold text-[#f5f4f0]">
          Multi-Image AI Creative Generator
        </h2>
        <p className="text-xs text-[#9e9d98] max-w-2xl">
          Transform reference style imagery and multiple product input shots into tailored, high-converting social media creative variants.
        </p>
      </div>

      {/* FORM CONFIGURATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN — INPUT ASSETS & REFERENCE (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. REFERENCE IMAGE (OPTIONAL) */}
          <div className="glass-card p-5 rounded-2xl space-y-3 border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold uppercase text-[#9e9d98] flex items-center gap-2">
                <span>1. Reference Style Image</span>
                <span className="text-[10px] text-[#c5a059]">(Optional)</span>
              </label>
            </div>
            <p className="text-[11px] text-[#6b6a65]">
              Provide a reference image to guide composition, mood, and lighting style.
            </p>
            <input
              type="text"
              value={referenceImageUrl}
              onChange={(e) => setReferenceImageUrl(e.target.value)}
              placeholder="Paste reference image URL..."
              className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
            />
            {referenceImageUrl && (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/40">
                <img
                  src={referenceImageUrl}
                  alt="Reference Style"
                  className="w-full h-full object-cover"
                  onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                />
              </div>
            )}
          </div>

          {/* 2. PRODUCT / INPUT IMAGES (MULTIPLE) */}
          <div className="glass-card p-5 rounded-2xl space-y-4 border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold uppercase text-[#9e9d98] flex items-center gap-2">
                <span>2. Product Input Images</span>
                <span className="text-[10px] text-emerald-400">({inputImageUrls.length}/5)</span>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {inputImageUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group bg-black/50">
                  <img src={url} alt={`Input ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveInputImage(idx)}
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

            {inputImageUrls.length < 5 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Paste additional product image URL..."
                  className="flex-1 bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddInputImage}
                  className="px-3 py-2 bg-[#14161a] border border-white/10 hover:border-[#c5a059] text-[#c5a059] rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — CREATIVE BRIEF & CONFIGURATION (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-card p-6 rounded-3xl space-y-5 border-white/10">
            {/* CREATIVE BRIEF TEXTAREA */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold uppercase text-[#9e9d98]">
                3. Creative Brief / Prompt
              </label>
              <textarea
                rows={3}
                value={creativeBrief}
                onChange={(e) => setCreativeBrief(e.target.value)}
                placeholder="Describe your creative vision, key selling points, target mood, and aesthetic guidelines..."
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-2xl p-4 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none resize-none leading-relaxed"
              />
            </div>

            {/* STYLE PRESETS */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold uppercase text-[#9e9d98]">
                4. Aesthetic Style Preset
              </label>
              <div className="grid grid-cols-2 gap-3">
                {STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setStylePreset(preset.id)}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      stylePreset === preset.id
                        ? "bg-[#c5a059]/10 border-[#c5a059] text-[#f5f4f0]"
                        : "bg-[#0b0c0e] border-white/10 text-[#9e9d98] hover:border-white/20"
                    }`}
                  >
                    <div className="text-xs font-bold font-serif-luxury text-[#f5f4f0]">{preset.label}</div>
                    <div className="text-[10px] text-[#6b6a65] mt-0.5">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* PLATFORM, ASPECT RATIO, & COUNT */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* PLATFORM */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-[#9e9d98]">Target Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
                >
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="PINTEREST">Pinterest</option>
                  <option value="X">X (Twitter)</option>
                  <option value="TIKTOK">TikTok</option>
                  <option value="FACEBOOK">Facebook</option>
                </select>
              </div>

              {/* ASPECT RATIO */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-[#9e9d98]">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as "1:1" | "4:5" | "9:16" | "16:9")}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
                >
                  <option value="4:5">4:5 (Portrait Feed)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="9:16">9:16 (Story / Reel)</option>
                  <option value="16:9">16:9 (Landscape)</option>
                </select>
              </div>

              {/* VARIANT COUNT */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-[#9e9d98]">Variants Count</label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:border-[#c5a059] outline-none"
                >
                  <option value={1}>1 Creative Variant</option>
                  <option value={2}>2 Creative Variants</option>
                  <option value={3}>3 Creative Variants</option>
                  <option value={4}>4 Creative Variants</option>
                </select>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* GENERATE SUBMIT BUTTON */}
            <button
              type="button"
              disabled={isGenerating || inputImageUrls.length === 0 || !creativeBrief.trim()}
              onClick={handleGenerateCreatives}
              className="w-full py-3.5 rounded-2xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Multi-Image AI Creatives...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-black" />
                  <span>Generate {count} AI Creative Variants (1 Credit)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* GENERATED CREATIVE VARIANTS DISPLAY GRID */}
      {generationResult && generationResult.variants.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#c5a059] uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Generation Completed</span>
              </div>
              <h3 className="font-serif-luxury text-2xl font-bold text-[#f5f4f0] mt-1">
                Generated Creative Variants ({generationResult.variants.length})
              </h3>
            </div>
            <span className="text-xs font-mono text-[#9e9d98]">
              Run ID: <code className="text-[#c5a059]">{generationResult.runId}</code>
            </span>
          </div>

          {scheduledSuccessId && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Creative successfully scheduled to publishing calendar!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {generationResult.variants.map((variant) => (
              <div
                key={variant.id}
                className="glass-card p-6 rounded-3xl space-y-4 border border-white/10 hover:border-[#c5a059]/40 transition-all relative"
              >
                {/* IMAGE PREVIEW CONTAINER */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black/60 border border-white/10">
                  <img
                    src={variant.imageUrl}
                    alt={variant.headline}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono text-[#c5a059] border border-white/10">
                    Variant #{variant.variantNumber} • {variant.aspectRatio}
                  </div>
                  <div className="absolute top-3 right-3 bg-emerald-500/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono text-white font-bold">
                    Quality {variant.qualityScore}/10
                  </div>
                </div>

                {/* COPY DETAILS */}
                <div className="space-y-2">
                  <h4 className="font-serif-luxury text-lg font-bold text-[#f5f4f0]">
                    {variant.headline}
                  </h4>
                  <p className="text-xs text-[#9e9d98] line-clamp-3 leading-relaxed">
                    {variant.caption}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {variant.hashtags.map((tag, tIdx) => (
                      <span key={tIdx} className="text-[10px] font-mono text-[#c5a059] bg-[#c5a059]/10 px-2 py-0.5 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-[10px] font-mono text-[#6b6a65] uppercase">
                    Platform: {variant.platform}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(variant.imageUrl, "_blank")}
                      className="p-2 rounded-xl bg-[#14161a] border border-white/10 text-[#9e9d98] hover:text-[#f5f4f0] text-xs transition-all"
                      title="View Full Resolution Image"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleScheduleVariant(variant)}
                      className="px-4 py-2 rounded-xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Schedule</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
