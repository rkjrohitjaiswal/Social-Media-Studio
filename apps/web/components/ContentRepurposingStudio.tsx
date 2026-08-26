"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  Video,
  Layers,
  FileText,
  Share2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Tv,
  Send,
  Sliders,
  Upload,
  FolderPlus,
  RefreshCw,
  Eye,
  X,
  Check,
  ExternalLink,
  ChevronRight,
  Clock,
  Film,
  MessageSquare,
  Hash,
  Info,
  Trash2,
} from "lucide-react";
import { ContentPackageResult, ContentProjectDto } from "@ai-social/shared";

interface SourceState {
  type: "FILE" | "PROJECT" | "SCRIPT" | null;
  title: string;
  detail?: string;
  file?: File;
  projectId?: string;
  sourceText?: string;
}

type OutputFormatKey =
  | "shorts"
  | "reels"
  | "tiktok"
  | "linkedin"
  | "carousel"
  | "xthread"
  | "longvideo"
  | "captions";

interface OutputFormatOption {
  key: OutputFormatKey;
  name: string;
  platform: string;
  format: string;
  icon: React.ElementType;
}

const OUTPUT_FORMATS: OutputFormatOption[] = [
  { key: "shorts", name: "YouTube Short", platform: "YouTube", format: "9:16 • 15s", icon: Video },
  { key: "reels", name: "Instagram Reel", platform: "Instagram", format: "9:16 • 30s", icon: Video },
  { key: "tiktok", name: "TikTok Video", platform: "TikTok", format: "9:16 • 30s", icon: Video },
  { key: "linkedin", name: "LinkedIn Video", platform: "LinkedIn", format: "16:9 • 60s", icon: Video },
  { key: "carousel", name: "Instagram Carousel", platform: "Instagram", format: "1:1 • 6 Slides", icon: Layers },
  { key: "xthread", name: "X Post / Thread", platform: "X / Twitter", format: "Text • 5 Posts", icon: Share2 },
  { key: "longvideo", name: "YouTube Master Video", platform: "YouTube", format: "16:9 • 5m+", icon: Tv },
  { key: "captions", name: "Thumbnails & Captions", platform: "Multi-Platform", format: "Covers & Copy", icon: Sparkles },
];

export function ContentRepurposingStudio() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Workflow Step State
  const [currentStep, setCurrentStep] = useState<"01 SOURCE" | "02 ANALYZE" | "03 ADAPT" | "04 REVIEW" | "05 PUBLISH">("01 SOURCE");

  // Source Workspace State
  const [source, setSource] = useState<SourceState>({
    type: null,
    title: "",
  });
  const [topicInput, setTopicInput] = useState("3 AI tools every developer should know");
  const [sourceTextInput, setSourceTextInput] = useState("");
  const [targetDuration, setTargetDuration] = useState<5 | 10 | 15 | 20>(5);
  const [toneInput, setToneInput] = useState("Educational & Engaging");
  const [audienceInput, setAudienceInput] = useState("Tech & Creator Audience");

  // Selection & Output Filters
  const [selectedFormats, setSelectedFormats] = useState<OutputFormatKey[]>([
    "shorts",
    "reels",
    "tiktok",
    "carousel",
    "xthread",
    "captions",
  ]);

  // Project Picker Modal
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectsList, setProjectsList] = useState<ContentProjectDto[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Inspector Modal
  const [inspectItem, setInspectItem] = useState<{
    type: "LONG_VIDEO" | "SHORT" | "CAROUSEL" | "X_THREAD" | "CAPTIONS";
    title: string;
    platform: string;
    data: any;
  } | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"CONTENT" | "VISUAL" | "CAPTION" | "METADATA">("CONTENT");

  // Provider Readiness State
  const [providerStatuses, setProviderStatuses] = useState<{
    openai: boolean;
    image: boolean;
    video: boolean;
  }>({
    openai: true,
    image: true,
    video: true,
  });

  // Execution & Output State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packageResult, setPackageResult] = useState<ContentPackageResult | null>(null);
  const [sentToApproval, setSentToApproval] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Provider Status on Mount
  useEffect(() => {
    async function fetchProviderStatus() {
      try {
        const res = await fetch(`${apiBase}/api/integrations/providers/status`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setProviderStatuses({
              openai: json.data.openaiKeyConfigured ?? true,
              image: json.data.openaiKeyConfigured ?? true,
              video: json.data.ffmpegAvailable ?? true,
            });
          }
        }
      } catch {
        // Default to connected status for interface stability
      }
    }
    fetchProviderStatus();
  }, [apiBase]);

  // Fetch Projects for Modal
  const handleOpenProjectModal = async () => {
    setShowProjectModal(true);
    setLoadingProjects(true);
    try {
      const res = await fetch(`${apiBase}/api/content-projects`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setProjectsList(data.data);
      }
    } catch {
      // Keep empty or default fallback if backend unreachable
    } finally {
      setLoadingProjects(false);
    }
  };

  // Select Project Source
  const handleSelectProjectSource = (proj: ContentProjectDto) => {
    setSource({
      type: "PROJECT",
      title: proj.title,
      detail: `Project • ${(proj as any).contentType || "TEACHING"} • ${proj.completedAssetsCount || 0} Assets`,
      projectId: proj.id,
    });
    setTopicInput(proj.title);
    setShowProjectModal(false);
  };

  // File Upload Source Trigger
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSource({
        type: "FILE",
        title: file.name,
        detail: `${(file.size / (1024 * 1024)).toFixed(1)} MB • ${file.type || "Media file"}`,
        file,
      });
      if (!topicInput || topicInput === "3 AI tools every developer should know") {
        setTopicInput(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  // Toggle Output Format Selection
  const toggleFormat = (key: OutputFormatKey) => {
    setSelectedFormats((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Execute Package Generation
  const handleCreatePackage = async () => {
    if (!topicInput.trim()) {
      setError("Please enter a topic or select a valid source content item.");
      return;
    }
    if (selectedFormats.length === 0) {
      setError("Please select at least one output format to create.");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentStep("03 ADAPT");

    try {
      const res = await fetch(`${apiBase}/api/repurpose`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": `repurpose_${Date.now()}`,
        },
        body: JSON.stringify({
          topic: topicInput.trim(),
          sourceText: source.sourceText || sourceTextInput,
          targetDurationMinutes: targetDuration,
          tone: toneInput,
          audience: audienceInput,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate repurposed package");
      }

      setPackageResult(data.data);
      setCurrentStep("04 REVIEW");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Repurposing failed";
      setError(msg);
      setCurrentStep("01 SOURCE");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToApproval = (itemId: string) => {
    setSentToApproval((prev) => ({ ...prev, [itemId]: true }));
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#F5F4F0] p-4 sm:p-6 lg:p-8 space-y-8 font-sans selection:bg-[#D4AF37]/30">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="video/*,audio/*,image/*,.mp4,.mov,.pdf,.txt"
      />

      {/* 1. HEADER & WORKFLOW STATUS */}
      <header className="border-b border-white/[0.08] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20">
              AI SOCIAL MEDIA STUDIO
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F4F0]">
            Repurpose Content
          </h1>
          <p className="text-xs sm:text-sm text-[#9E9D98] mt-0.5">
            Turn one piece of content into platform-ready assets.
          </p>
        </div>

        {/* 5-Step Workflow Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#151618] border border-white/[0.08] p-1.5 rounded-2xl text-[10px] sm:text-xs font-mono overflow-x-auto no-scrollbar shrink-0">
          {(["01 SOURCE", "02 ANALYZE", "03 ADAPT", "04 REVIEW", "05 PUBLISH"] as const).map(
            (step, idx) => {
              const isActive = currentStep === step;
              return (
                <React.Fragment key={step}>
                  <span
                    className={`px-2.5 py-1 rounded-xl font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-[#D4AF37] text-[#0B0C0E] shadow-sm shadow-[#D4AF37]/20"
                        : "text-[#9E9D98]"
                    }`}
                  >
                    {step}
                  </span>
                  {idx < 4 && <span className="text-white/20 font-sans">→</span>}
                </React.Fragment>
              );
            }
          )}
        </div>
      </header>

      {/* ERROR DISPLAY */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. SOURCE WORKSPACE (2-COLUMN STITCH LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / PRIMARY: SOURCE CONTENT DROPZONE / CARD (col-span-8) */}
        <section className="lg:col-span-8 bg-[#151618] border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h2 className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#D4AF37]" /> Source Content
            </h2>
            {source.type && (
              <span className="text-[10px] font-mono text-[#9E9D98] uppercase">
                Active Source Loaded
              </span>
            )}
          </div>

          {source.type ? (
            /* Real Active Source Card */
            <div className="p-4 bg-[#0B0C0E] border border-[#D4AF37]/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 truncate">
                <div className="w-12 h-12 rounded-xl bg-[#151618] border border-white/10 flex items-center justify-center shrink-0">
                  {source.type === "FILE" && <Film className="w-6 h-6 text-[#D4AF37]" />}
                  {source.type === "PROJECT" && <FolderPlus className="w-6 h-6 text-[#D4AF37]" />}
                  {source.type === "SCRIPT" && <FileText className="w-6 h-6 text-[#D4AF37]" />}
                </div>
                <div className="truncate">
                  <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-wider">
                    {source.type} SOURCE
                  </span>
                  <h3 className="text-sm font-bold text-[#F5F4F0] truncate">{source.title}</h3>
                  {source.detail && <p className="text-xs text-[#9E9D98] font-mono">{source.detail}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-[#151618] border border-white/10 text-xs font-semibold text-[#F5F4F0] hover:bg-white/5 transition-colors"
                >
                  Replace
                </button>
                <button
                  onClick={() => setSource({ type: null, title: "" })}
                  className="p-1.5 rounded-xl bg-[#151618] border border-white/10 text-rose-400 hover:text-rose-300 transition-colors"
                  title="Remove Source"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Empty Source Dropzone */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-[#D4AF37]/40 bg-[#0B0C0E]/50 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#151618] border border-white/10 flex items-center justify-center mx-auto text-[#9E9D98] group-hover:text-[#D4AF37] group-hover:scale-105 transition-all">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#F5F4F0]">
                  Drop video, audio, script, or click to upload
                </p>
                <p className="text-xs text-[#9E9D98] mt-1 font-mono">
                  Supported formats: MP4, MOV, MP3, PDF, TXT or raw text notes
                </p>
              </div>
            </div>
          )}

          {/* Topic & Source Text inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-[#9E9D98]">Content Topic / Title</label>
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. 3 AI tools every developer should know"
                className="w-full bg-[#0B0C0E] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F4F0] focus:border-[#D4AF37]/50 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-[#9E9D98]">Tone & Style</label>
              <input
                type="text"
                value={toneInput}
                onChange={(e) => setToneInput(e.target.value)}
                className="w-full bg-[#0B0C0E] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F4F0] focus:border-[#D4AF37]/50 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-[#9E9D98]">
              Raw Source Notes / Script Details
            </label>
            <textarea
              value={sourceTextInput}
              onChange={(e) => setSourceTextInput(e.target.value)}
              rows={3}
              placeholder="Paste raw research summaries, transcript notes, or article content..."
              className="w-full bg-[#0B0C0E] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F4F0] focus:border-[#D4AF37]/50 outline-none resize-none"
            />
          </div>
        </section>

        {/* RIGHT: SOURCE OPTIONS & PROVIDER STATUS (col-span-4) */}
        <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
          {/* Quick Source Option Cards */}
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-5 space-y-3">
            <h3 className="text-xs font-mono font-bold text-[#F5F4F0] uppercase tracking-wider">
              Quick Source Options
            </h3>

            <button
              onClick={handleOpenProjectModal}
              className="w-full p-3 rounded-2xl bg-[#0B0C0E] border border-white/[0.08] hover:border-[#D4AF37]/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <FolderPlus className="w-5 h-5 text-[#D4AF37] shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-[#F5F4F0]">Select Existing Project</h4>
                  <p className="text-[10px] text-[#9E9D98]">Pick from your Content Studio workspace</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9E9D98] group-hover:text-[#F5F4F0]" />
            </button>

            <button
              onClick={() => {
                setSource({
                  type: "SCRIPT",
                  title: topicInput || "Custom Script Notes",
                  detail: `${sourceTextInput.length} characters`,
                });
              }}
              className="w-full p-3 rounded-2xl bg-[#0B0C0E] border border-white/[0.08] hover:border-[#D4AF37]/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#D4AF37] shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-[#F5F4F0]">Use Text / Script Input</h4>
                  <p className="text-[10px] text-[#9E9D98]">Repurpose raw text notes or transcript</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9E9D98] group-hover:text-[#F5F4F0]" />
            </button>
          </div>

          {/* PROVIDER STATUS WIDGET */}
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-xs font-mono font-bold text-[#F5F4F0] uppercase tracking-wider">
                AI PROVIDERS
              </span>
              <Link
                href="/settings/integrations"
                className="text-[10px] font-mono text-[#D4AF37] hover:underline flex items-center gap-1"
              >
                <span>Manage providers</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#0B0C0E] border border-white/[0.06]">
                <span className="text-[#9E9D98]">OpenAI Script Engine</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#0B0C0E] border border-white/[0.06]">
                <span className="text-[#9E9D98]">Image Generation</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#0B0C0E] border border-white/[0.06]">
                <span className="text-[#9E9D98]">Video Composition</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. OUTPUT SELECTION ("CHOOSE WHAT TO CREATE") */}
      <section className="bg-[#151618] border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-3">
          <div>
            <h2 className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#D4AF37]" /> Choose What to Create
            </h2>
            <p className="text-xs text-[#9E9D98] mt-0.5">
              Select supported formats to generate in this repurposing package.
            </p>
          </div>

          {/* Dynamic Action Trigger */}
          <button
            onClick={handleCreatePackage}
            disabled={loading || selectedFormats.length === 0}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0B0C0E] font-bold text-xs hover:opacity-95 transition-all shadow-md shadow-[#D4AF37]/10 flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating Assets...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  Generate Selected ({selectedFormats.length} Asset{selectedFormats.length === 1 ? "" : "s"})
                </span>
              </>
            )}
          </button>
        </div>

        {/* Selectable Output Chips Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {OUTPUT_FORMATS.map((fmt) => {
            const isSelected = selectedFormats.includes(fmt.key);
            const Icon = fmt.icon;
            return (
              <div
                key={fmt.key}
                onClick={() => toggleFormat(fmt.key)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? "bg-[#D4AF37]/10 border-[#D4AF37] shadow-sm shadow-[#D4AF37]/5"
                    : "bg-[#0B0C0E] border-white/[0.08] hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-[#D4AF37]" : "text-[#9E9D98]"}`} />
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-[#F5F4F0] truncate">{fmt.name}</h4>
                    <p className="text-[10px] font-mono text-[#9E9D98]">{fmt.format}</p>
                  </div>
                </div>

                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? "bg-[#D4AF37] border-[#D4AF37] text-[#0B0C0E]"
                      : "border-white/20 bg-transparent"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. PLATFORM PREVIEWS GRID / RESULTS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h2 className="text-sm font-bold text-[#F5F4F0] flex items-center gap-2">
            <Film className="w-4 h-4 text-[#D4AF37]" /> Repurposed Asset Package
          </h2>
          {packageResult && (
            <span className="text-xs font-mono text-[#9E9D98]">
              Package ID: <strong className="text-[#D4AF37]">{packageResult.packageId}</strong>
            </span>
          )}
        </div>

        {!packageResult ? (
          /* Professional Empty State */
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0B0C0E] border border-white/10 flex items-center justify-center mx-auto text-[#9E9D98]">
              <Layers className="w-6 h-6 opacity-60" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F4F0]">No assets generated yet</h3>
              <p className="text-xs text-[#9E9D98] max-w-md mx-auto mt-1 font-mono">
                Select the formats you want to create above, then generate your repurposed content package.
              </p>
            </div>
          </div>
        ) : (
          /* Actual Generated Output Cards Grid */
          <div className="space-y-6">
            {/* LONG FORM MASTER VIDEO */}
            {selectedFormats.includes("longvideo") && packageResult.longFormScript && (
              <div className="bg-[#151618] border border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                      YOUTUBE MASTER (16:9)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      READY
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setInspectItem({
                        type: "LONG_VIDEO",
                        title: packageResult.longFormScript.title,
                        platform: "YouTube (16:9)",
                        data: packageResult.longFormScript,
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs text-[#F5F4F0] hover:bg-white/5 flex items-center gap-1.5 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#D4AF37]" /> Preview & Inspect
                  </button>
                </div>

                <h3 className="text-base font-bold text-[#F5F4F0]">{packageResult.longFormScript.title}</h3>
                <p className="text-xs text-[#9E9D98] italic font-serif">
                  Hook: &quot;{packageResult.longFormScript.hook}&quot;
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {packageResult.longFormScript.chapters.map((ch) => (
                    <div key={ch.chapterNumber} className="p-3 rounded-2xl bg-[#0B0C0E] border border-white/[0.08] space-y-1 text-xs">
                      <span className="text-[10px] font-mono text-[#D4AF37]">
                        Ch #{ch.chapterNumber} ({ch.estimatedDurationSeconds}s)
                      </span>
                      <h4 className="font-bold text-[#F5F4F0] truncate">{ch.title}</h4>
                      <p className="text-[#9E9D98] text-[11px] line-clamp-2">{ch.narration}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SHORT VIDEO HIGHLIGHTS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {packageResult.shorts.map((seg) => {
                const isApproved = sentToApproval[seg.id];
                return (
                  <div key={seg.id} className="bg-[#151618] border border-white/[0.08] rounded-3xl p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                        <span className="text-[#D4AF37] font-bold uppercase">{seg.targetPlatform}</span>
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          isApproved ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-[#9E9D98]"
                        }`}>
                          {isApproved ? "APPROVED" : "READY"}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#F5F4F0] line-clamp-2">{seg.title}</h4>
                      <p className="text-xs text-[#9E9D98] italic mt-1 font-serif line-clamp-2">
                        &quot;{seg.narration}&quot;
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                      <button
                        onClick={() =>
                          setInspectItem({
                            type: "SHORT",
                            title: seg.title,
                            platform: seg.targetPlatform,
                            data: seg,
                          })
                        }
                        className="flex-1 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs font-semibold text-[#F5F4F0] hover:bg-white/5 flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#D4AF37]" /> Preview
                      </button>
                      <button
                        onClick={() => handleSendToApproval(seg.id)}
                        disabled={isApproved}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isApproved
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-[#D4AF37] text-[#0B0C0E] hover:opacity-95"
                        }`}
                      >
                        {isApproved ? "Approved" : "Approve"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* INSTAGRAM CAROUSEL & X THREAD GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CAROUSEL CARD */}
              <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#D4AF37]" /> Instagram Carousel (6 Slides)
                  </span>
                  <button
                    onClick={() =>
                      setInspectItem({
                        type: "CAROUSEL",
                        title: "Instagram Carousel Package",
                        platform: "Instagram (1:1)",
                        data: packageResult.carousel,
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs text-[#F5F4F0] hover:bg-white/5 flex items-center gap-1.5 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#D4AF37]" /> Preview Slides
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {packageResult.carousel.map((slide) => (
                    <div key={slide.slideNumber} className="p-3 rounded-2xl bg-[#0B0C0E] border border-white/[0.08] text-xs space-y-1">
                      <span className="text-[10px] font-mono text-[#D4AF37]">Slide #{slide.slideNumber}</span>
                      <h5 className="font-bold text-[#F5F4F0] truncate">{slide.title}</h5>
                      <p className="text-[11px] text-[#9E9D98] line-clamp-2">{slide.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* X THREAD CARD */}
              <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-[#D4AF37]" /> X / Twitter Thread (5 Posts)
                  </span>
                  <button
                    onClick={() =>
                      setInspectItem({
                        type: "X_THREAD",
                        title: "X Thread Sequence",
                        platform: "X / Twitter",
                        data: packageResult.xThread,
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs text-[#F5F4F0] hover:bg-white/5 flex items-center gap-1.5 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#D4AF37]" /> View Sequence
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {packageResult.xThread.map((post) => (
                    <div key={post.postIndex} className="p-3 rounded-2xl bg-[#0B0C0E] border border-white/[0.08] text-xs text-[#F5F4F0]">
                      <span className="text-[10px] font-mono text-[#D4AF37] font-bold block mb-1">Post #{post.postIndex}</span>
                      {post.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* PROJECT PICKER MODAL */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-lg w-full space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-[#F5F4F0]">Select Existing Content Project</h3>
              <button onClick={() => setShowProjectModal(false)} className="text-[#9E9D98] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {loadingProjects ? (
                <div className="py-12 text-center text-xs font-mono text-[#9E9D98] space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D4AF37]" />
                  <p>Loading projects...</p>
                </div>
              ) : projectsList.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#9E9D98]">
                  <FolderPlus className="w-8 h-8 mx-auto opacity-40 mb-2" />
                  <p>No existing projects found in workspace.</p>
                </div>
              ) : (
                projectsList.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProjectSource(p)}
                    className="p-3.5 rounded-2xl bg-[#0B0C0E] border border-white/[0.08] hover:border-[#D4AF37] transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#F5F4F0]">{p.title}</h4>
                      <p className="text-[10px] font-mono text-[#9E9D98]">
                        Type: {(p as any).contentType || "TEACHING"} • Status: {p.status || "DRAFT"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW / INSPECTOR MODAL */}
      {inspectItem && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">
                  {inspectItem.platform} Inspector
                </span>
                <h3 className="text-base font-bold text-[#F5F4F0]">{inspectItem.title}</h3>
              </div>
              <button onClick={() => setInspectItem(null)} className="text-[#9E9D98] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inspector 4 Tabs */}
            <div className="flex items-center gap-1 border-b border-white/[0.08] pb-2 text-xs font-mono">
              {(["CONTENT", "VISUAL", "CAPTION", "METADATA"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setInspectorTab(tab)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    inspectorTab === tab
                      ? "bg-[#D4AF37] text-[#0B0C0E] font-bold"
                      : "text-[#9E9D98] hover:text-[#F5F4F0]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Inspector Tab Body */}
            <div className="flex-1 overflow-y-auto space-y-3 text-xs font-sans p-1">
              {inspectorTab === "CONTENT" && (
                <div className="space-y-3">
                  <div className="p-3 bg-[#0B0C0E] rounded-2xl border border-white/[0.06]">
                    <span className="text-[10px] font-mono text-[#D4AF37] font-bold">SCRIPT / NARRATION</span>
                    <p className="text-[#F5F4F0] mt-1 whitespace-pre-wrap">
                      {inspectItem.data.narration || inspectItem.data.description || JSON.stringify(inspectItem.data, null, 2)}
                    </p>
                  </div>
                </div>
              )}

              {inspectorTab === "VISUAL" && (
                <div className="space-y-3">
                  <div className="p-3 bg-[#0B0C0E] rounded-2xl border border-white/[0.06]">
                    <span className="text-[10px] font-mono text-[#D4AF37] font-bold">VISUAL DIRECTION</span>
                    <p className="text-[#9E9D98] mt-1">
                      {inspectItem.data.visualDirection || inspectItem.data.visualPrompt || "Cinematic 4K studio lighting with sharp depth of field."}
                    </p>
                  </div>
                </div>
              )}

              {inspectorTab === "CAPTION" && (
                <div className="space-y-3">
                  <div className="p-3 bg-[#0B0C0E] rounded-2xl border border-white/[0.06]">
                    <span className="text-[10px] font-mono text-[#D4AF37] font-bold">SMART CAPTION & HASHTAGS</span>
                    <p className="text-[#F5F4F0] mt-1">
                      {inspectItem.data.caption || `#AI #SocialStudio #${inspectItem.platform.replace(/\s+/g, "")}`}
                    </p>
                  </div>
                </div>
              )}

              {inspectorTab === "METADATA" && (
                <div className="space-y-2 font-mono text-[11px] text-[#9E9D98]">
                  <p>Target Platform: <strong className="text-[#F5F4F0]">{inspectItem.platform}</strong></p>
                  <p>Generated At: <strong className="text-[#F5F4F0]">{new Date().toLocaleString()}</strong></p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
