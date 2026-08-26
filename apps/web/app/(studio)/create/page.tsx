"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Video,
  Image as ImageIcon,
  FileText,
  Repeat,
  Tv,
  Save,
  PlusCircle,
  Check,
  Globe,
  Loader2,
  ExternalLink,
  ChevronDown,
  Wand2,
  Eye,
  Sliders,
  Zap,
} from "lucide-react";
import { useStudio } from "@/lib/studio-context";
import { generatePlatformContent } from "@/lib/social-engine/platform-content-generator";
import { SocialPlatform, ContentType } from "@ai-social/shared";
import { MultiImageCreativeStudio } from "@/components/MultiImageCreativeStudio";
import { ShortVideoStudio } from "@/components/ShortVideoStudio";
import { getApiKeys } from "@/lib/api-client";

type CreationType =
  | "AI_CONTENT"
  | "IMAGE"
  | "VIDEO"
  | "CAROUSEL"
  | "SOCIAL_POST"
  | "YOUTUBE_SHORT"
  | "REPURPOSE";

const CREATION_TYPES: { id: CreationType; label: string; icon: React.ReactNode }[] = [
  { id: "AI_CONTENT", label: "AI Content", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: "IMAGE", label: "Image", icon: <ImageIcon className="w-3.5 h-3.5" /> },
  { id: "VIDEO", label: "Video", icon: <Video className="w-3.5 h-3.5" /> },
  { id: "CAROUSEL", label: "Carousel", icon: <Layers className="w-3.5 h-3.5" /> },
  { id: "SOCIAL_POST", label: "Social Post", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "YOUTUBE_SHORT", label: "YouTube Short", icon: <Tv className="w-3.5 h-3.5" /> },
  { id: "REPURPOSE", label: "Repurpose", icon: <Repeat className="w-3.5 h-3.5" /> },
];

const PLATFORMS: { id: SocialPlatform; label: string }[] = [
  { id: "YOUTUBE", label: "YouTube" },
  { id: "INSTAGRAM", label: "Instagram" },
  { id: "TIKTOK", label: "TikTok" },
  { id: "LINKEDIN", label: "LinkedIn" },
  { id: "X", label: "X" },
];

const FORMATS: Partial<Record<SocialPlatform, string[]>> = {
  YOUTUBE: ["Short", "Long-form"],
  INSTAGRAM: ["Reel", "Post", "Carousel", "Story"],
  TIKTOK: ["Short", "Video"],
  LINKEDIN: ["Post", "Carousel", "Article"],
  X: ["Post", "Thread"],
  FACEBOOK: ["Post", "Video", "Reel"],
  PINTEREST: ["Pin", "Idea Pin"],
  THREADS: ["Post", "Thread"],
  REDDIT: ["Post"],
  TELEGRAM: ["Message"],
  BLUESKY: ["Post"],
};

const TEMPLATES = [
  {
    id: "yt_short",
    title: "YouTube Short",
    desc: "30s viral short script & hook",
    prompt: "3 AI tools every developer should know to double their productivity.",
    platform: "YOUTUBE" as SocialPlatform,
    format: "Short",
    tone: "Punchy",
    length: "30 seconds",
  },
  {
    id: "insta_reel",
    title: "Instagram Reel",
    desc: "Visual carousel & audio voiceover",
    prompt: "Behind the scenes: how we built our multi-platform social media architecture.",
    platform: "INSTAGRAM" as SocialPlatform,
    format: "Reel",
    tone: "Editorial",
    length: "30 seconds",
  },
  {
    id: "prod_launch",
    title: "Product Launch",
    desc: "Multi-platform announcement & CTA",
    prompt: "Announcing AI Social Media Studio — the unified content workspace for creators.",
    platform: "LINKEDIN" as SocialPlatform,
    format: "Post",
    tone: "Professional",
    length: "Long-form",
  },
  {
    id: "edu_post",
    title: "Educational Post",
    desc: "Step-by-step breakdown & insights",
    prompt: "5 key principles of building clean provider abstractions in Next.js.",
    platform: "X" as SocialPlatform,
    format: "Post",
    tone: "Educational",
    length: "60 seconds",
  },
  {
    id: "personal_brand",
    title: "Personal Brand",
    desc: "Thought leadership story & quote",
    prompt: "Why I stopped using fragmented tools and built a single unified creative engine.",
    platform: "LINKEDIN" as SocialPlatform,
    format: "Post",
    tone: "Professional",
    length: "Long-form",
  },
  {
    id: "client_campaign",
    title: "Client Campaign",
    desc: "Portfolio showcase & results",
    prompt: "High-fashion autumn showcase highlighting craftsmanship and bespoke materials.",
    platform: "INSTAGRAM" as SocialPlatform,
    format: "Carousel",
    tone: "Luxury",
    length: "60 seconds",
  },
];

export default function CreateContentPage() {
  const router = useRouter();
  const { activeBrand } = useStudio();

  // Selection states
  const [creationType, setCreationType] = useState<CreationType>("AI_CONTENT");
  const [ideaPrompt, setIdeaPrompt] = useState<string>(
    "Create a 30-second video about 3 AI tools every developer should know to double their productivity."
  );
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>("INSTAGRAM");
  const [selectedFormat, setSelectedFormat] = useState<string>("Reel");

  // Settings Grid
  const [tone, setTone] = useState<string>("Professional");
  const [audience, setAudience] = useState<string>("Creators");
  const [language, setLanguage] = useState<string>("English");
  const [length, setLength] = useState<string>("30 seconds");
  const [brandVoice, setBrandVoice] = useState<string>("Default Brand Voice");

  // Preview State
  const [previewTab, setPreviewTab] = useState<"CONTENT" | "VISUAL" | "CAPTION" | "METADATA">("CONTENT");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedOutput, setGeneratedOutput] = useState<{
    headline: string;
    hook: string;
    body: string;
    cta: string;
    hashtags: string[];
  } | null>(null);

  // Provider Status State
  const [providersStatus, setProvidersStatus] = useState<Record<string, boolean>>({
    openai: false,
    runway: false,
    luma: false,
  });
  const [isLoadingProviders, setIsLoadingProviders] = useState<boolean>(true);

  // Fetch real BYOK Provider Keys on load
  useEffect(() => {
    async function loadProviders() {
      try {
        const keys = await getApiKeys();
        const statusMap: Record<string, boolean> = {
          openai: false,
          runway: false,
          luma: false,
        };
        keys.forEach((k) => {
          const provKey = k.provider.toLowerCase();
          statusMap[provKey] = true;
        });
        setProvidersStatus(statusMap);
      } catch (err) {
        console.error("Failed to fetch provider status:", err);
      } finally {
        setIsLoadingProviders(false);
      }
    }
    loadProviders();
  }, []);

  // Update format options when platform changes
  const availableFormats = FORMATS[selectedPlatform] || ["Post"];

  const handleSelectPlatform = (p: SocialPlatform) => {
    setSelectedPlatform(p);
    const formats = FORMATS[p] || ["Post"];
    if (!formats.includes(selectedFormat)) {
      setSelectedFormat(formats[0]);
    }
  };

  const handleApplyTemplate = (tmpl: (typeof TEMPLATES)[0]) => {
    setIdeaPrompt(tmpl.prompt);
    setSelectedPlatform(tmpl.platform);
    setSelectedFormat(tmpl.format);
    setTone(tmpl.tone);
    setLength(tmpl.length);
  };

  const handleGenerateContent = async () => {
    if (!ideaPrompt.trim()) return;

    setIsGenerating(true);
    try {
      // Trigger actual content generation logic
      const result = generatePlatformContent({
        platform: selectedPlatform,
        contentType: "GENERAL",
        sourceData: {
          teaching: {
            topic: ideaPrompt.slice(0, 50),
            learningObjective: ideaPrompt,
            keyPoints: [ideaPrompt],
          },
        },
        brand: {
          name: activeBrand?.name || "AI Social Media Studio",
          toneVoice: tone,
          defaultCta: "Link in bio to learn more",
        },
        assetUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80",
      });

      setGeneratedOutput({
        headline: result.title || ideaPrompt.slice(0, 50),
        hook: ideaPrompt,
        body: result.caption || result.description || ideaPrompt,
        cta: result.cta || "Check link in bio for full details.",
        hashtags: (result as unknown as { hashtags?: string[] }).hashtags || result.hashtagsJson || ["#AI", "#Productivity", "#Tech"],
      });
      setPreviewTab("CONTENT");
    } catch (err) {
      console.error("Generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = () => {
    alert("Draft saved to workspace project queue.");
  };

  const handleCreateProject = () => {
    router.push("/content-studio");
  };

  const hasAnyProvider = Object.values(providersStatus).some(Boolean);

  return (
    <div className="space-y-6 pb-16 selection:bg-[#D4AF37]/30 text-[#F5F4F0]">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F4F0]">
              Create Content
            </h1>
          </div>
          <p className="text-xs text-[#9E9D98] mt-0.5">
            Turn an idea into content ready for every channel.
          </p>
        </div>

        {/* Right side compact actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSaveDraft}
            className="px-4 py-2 rounded-xl bg-[#151618] border border-white/[0.08] text-xs font-semibold text-[#F5F4F0] hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5 text-[#9E9D98]" />
            <span>Save Draft</span>
          </button>
          <button
            onClick={handleCreateProject}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0B0C0E] font-bold text-xs shadow-md shadow-[#D4AF37]/10 hover:opacity-95 transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#0B0C0E]" />
            <span>Create Project</span>
          </button>
        </div>
      </div>

      {/* 2. SUBTLE WORKFLOW INDICATOR */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px] font-mono text-[#9E9D98]/80 no-scrollbar">
        <span className="px-2 py-0.5 rounded-md bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 font-bold shrink-0">
          01 CREATE
        </span>
        <span className="text-[#9E9D98]/40">→</span>
        <span className="px-2 py-0.5 rounded-md hover:text-[#F5F4F0] shrink-0">02 EDIT</span>
        <span className="text-[#9E9D98]/40">→</span>
        <span className="px-2 py-0.5 rounded-md hover:text-[#F5F4F0] shrink-0">03 REPURPOSE</span>
        <span className="text-[#9E9D98]/40">→</span>
        <span className="px-2 py-0.5 rounded-md hover:text-[#F5F4F0] shrink-0">04 SCHEDULE</span>
        <span className="text-[#9E9D98]/40">→</span>
        <span className="px-2 py-0.5 rounded-md hover:text-[#F5F4F0] shrink-0">05 PUBLISH</span>
        <span className="text-[#9E9D98]/40">→</span>
        <span className="px-2 py-0.5 rounded-md hover:text-[#F5F4F0] shrink-0">06 ANALYZE</span>
      </div>

      {/* 3. CREATION TYPE SELECTOR (Horizontal Compact Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-white/[0.08]">
        {CREATION_TYPES.map((ct) => {
          const isSelected = creationType === ct.id;
          return (
            <button
              key={ct.id}
              onClick={() => {
                setCreationType(ct.id);
                if (ct.id === "YOUTUBE_SHORT") {
                  setSelectedPlatform("YOUTUBE");
                  setSelectedFormat("Short");
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                isSelected
                  ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm"
                  : "bg-[#151618] text-[#9E9D98] border border-white/[0.08] hover:text-[#F5F4F0] hover:bg-white/5"
              }`}
            >
              <span className={isSelected ? "text-[#D4AF37]" : "text-[#9E9D98]"}>{ct.icon}</span>
              <span>{ct.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-STUDIO CONDITIONAL RENDERING */}
      {creationType === "IMAGE" ? (
        <MultiImageCreativeStudio />
      ) : creationType === "VIDEO" || creationType === "YOUTUBE_SHORT" ? (
        <ShortVideoStudio />
      ) : creationType === "REPURPOSE" ? (
        <div className="bg-[#151618] border border-white/[0.08] rounded-2xl p-8 text-center space-y-4">
          <Repeat className="w-8 h-8 text-[#D4AF37] mx-auto" />
          <h3 className="text-lg font-bold text-[#F5F4F0]">Repurpose Existing Content</h3>
          <p className="text-xs text-[#9E9D98] max-w-md mx-auto">
            Transform high-performing posts, long-form videos, or articles into platform-optimized shorts and carousels.
          </p>
          <Link
            href="/repurpose"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#0B0C0E] font-bold text-xs hover:opacity-95 transition-all"
          >
            <span>Open Repurpose Engine</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        /* 4. MAIN CREATE WORKSPACE (Two-Column Layout) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL — CREATE (~55% = 7 cols on 12-col grid) */}
          <div className="lg:col-span-7 bg-[#151618] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-6">
            {/* Title & Idea Textarea */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#F5F4F0]">
                What do you want to create?
              </label>
              <textarea
                value={ideaPrompt}
                onChange={(e) => setIdeaPrompt(e.target.value)}
                placeholder="Describe your idea... e.g. Create a 30-second Instagram Reel about the future of AI..."
                rows={4}
                className="w-full bg-[#0B0C0E] border border-white/[0.08] rounded-xl p-3.5 text-xs text-[#F5F4F0] placeholder-[#9E9D98]/50 outline-none focus:border-[#D4AF37]/50 transition-colors resize-none font-sans"
              />
            </div>

            {/* Platform Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#9E9D98] uppercase tracking-wider">
                Platform
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {PLATFORMS.map((p) => {
                  const isSel = selectedPlatform === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPlatform(p.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                        isSel
                          ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 font-bold"
                          : "bg-[#0B0C0E] text-[#9E9D98] border border-white/[0.08] hover:text-[#F5F4F0]"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#9E9D98] uppercase tracking-wider">
                Format
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {availableFormats.map((f) => {
                  const isSel = selectedFormat === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSelectedFormat(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                        isSel
                          ? "bg-white/10 text-[#F5F4F0] border border-white/20 font-semibold"
                          : "bg-[#0B0C0E] text-[#9E9D98] border border-white/[0.08] hover:text-[#F5F4F0]"
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Settings (Compact Grid) */}
            <div className="space-y-2 border-t border-white/[0.08] pt-4">
              <label className="block text-xs font-semibold text-[#9E9D98] uppercase tracking-wider">
                Content Settings
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Tone */}
                <div>
                  <span className="block text-[11px] text-[#9E9D98] mb-1">Tone</span>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-[#0B0C0E] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-[#F5F4F0] outline-none focus:border-[#D4AF37]/50"
                  >
                    <option value="Professional">Professional</option>
                    <option value="Casual">Casual</option>
                    <option value="Punchy">Punchy</option>
                    <option value="Editorial">Editorial</option>
                    <option value="Educational">Educational</option>
                    <option value="Luxury">Luxury</option>
                  </select>
                </div>

                {/* Audience */}
                <div>
                  <span className="block text-[11px] text-[#9E9D98] mb-1">Audience</span>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full bg-[#0B0C0E] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-[#F5F4F0] outline-none focus:border-[#D4AF37]/50"
                  >
                    <option value="Creators">Creators</option>
                    <option value="Founders">Founders</option>
                    <option value="Developers">Developers</option>
                    <option value="Executives">Executives</option>
                    <option value="General">General</option>
                  </select>
                </div>

                {/* Language */}
                <div>
                  <span className="block text-[11px] text-[#9E9D98] mb-1">Language</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-[#0B0C0E] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-[#F5F4F0] outline-none focus:border-[#D4AF37]/50"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Japanese">Japanese</option>
                  </select>
                </div>

                {/* Length */}
                <div>
                  <span className="block text-[11px] text-[#9E9D98] mb-1">Length</span>
                  <select
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="w-full bg-[#0B0C0E] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-[#F5F4F0] outline-none focus:border-[#D4AF37]/50"
                  >
                    <option value="15 seconds">15 seconds</option>
                    <option value="30 seconds">30 seconds</option>
                    <option value="60 seconds">60 seconds</option>
                    <option value="3 minutes">3 minutes</option>
                    <option value="Long-form">Long-form</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Brand / Persona */}
            <div className="space-y-1.5 border-t border-white/[0.08] pt-4">
              <label className="block text-xs font-semibold text-[#9E9D98] uppercase tracking-wider">
                Brand Voice
              </label>
              <select
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
                className="w-full bg-[#0B0C0E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#F5F4F0] outline-none focus:border-[#D4AF37]/50"
              >
                <option value="Default Brand Voice">
                  {activeBrand?.name ? `${activeBrand.name} Brand Voice` : "Default Brand Voice"}
                </option>
                <option value="Casual Founder">Casual Founder</option>
                <option value="Technical Authority">Technical Authority</option>
                <option value="Luxury Editorial">Luxury Editorial</option>
              </select>
              <p className="text-[11px] text-[#9E9D98]/70">
                Use your workspace brand voice for consistent content across channels.
              </p>
            </div>

            {/* AI Provider Status Panel */}
            <div className="bg-[#0B0C0E] border border-white/[0.08] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F5F4F0] uppercase tracking-wider">
                  AI Provider Status
                </span>
                <Link
                  href="/settings"
                  className="text-[11px] text-[#D4AF37] hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Connect Provider</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {isLoadingProviders ? (
                <div className="flex items-center gap-2 text-xs text-[#9E9D98]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                  <span>Checking provider connections...</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {/* OpenAI */}
                  <div className="p-2 rounded-lg bg-[#151618] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-[10px] text-[#9E9D98] uppercase">OpenAI</span>
                    <span
                      className={`font-semibold text-[11px] flex items-center gap-1 ${
                        providersStatus.openai ? "text-emerald-400" : "text-[#9E9D98]"
                      }`}
                    >
                      {providersStatus.openai ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Connected</span>
                        </>
                      ) : (
                        "Not connected"
                      )}
                    </span>
                  </div>

                  {/* Runway */}
                  <div className="p-2 rounded-lg bg-[#151618] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-[10px] text-[#9E9D98] uppercase">Runway</span>
                    <span
                      className={`font-semibold text-[11px] flex items-center gap-1 ${
                        providersStatus.runway ? "text-emerald-400" : "text-[#9E9D98]"
                      }`}
                    >
                      {providersStatus.runway ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Connected</span>
                        </>
                      ) : (
                        "Not connected"
                      )}
                    </span>
                  </div>

                  {/* Luma */}
                  <div className="p-2 rounded-lg bg-[#151618] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-[10px] text-[#9E9D98] uppercase">Luma</span>
                    <span
                      className={`font-semibold text-[11px] flex items-center gap-1 ${
                        providersStatus.luma ? "text-emerald-400" : "text-[#9E9D98]"
                      }`}
                    >
                      {providersStatus.luma ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Connected</span>
                        </>
                      ) : (
                        "Not connected"
                      )}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-[#9E9D98]/70 leading-relaxed">
                Users own their provider API credentials. AI Social Media Studio orchestrates the workflow. Configure keys in Connections / Settings.
              </p>
            </div>

            {/* Bottom Generate Button & Secondary Action */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleGenerateContent}
                disabled={isGenerating || !ideaPrompt.trim()}
                className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0B0C0E] font-bold text-xs shadow-md shadow-[#D4AF37]/15 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0B0C0E]" />
                    <span>Generating Content...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#0B0C0E]" />
                    <span>Generate Content</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-3 rounded-xl bg-[#0B0C0E] border border-white/[0.08] text-xs font-semibold text-[#F5F4F0] hover:bg-white/5 transition-colors"
              >
                Save Draft
              </button>
            </div>
          </div>

          {/* RIGHT PANEL — PREVIEW (~45% = 5 cols on 12-col grid) */}
          <div className="lg:col-span-5 bg-[#151618] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4 sticky top-20">
            {/* Header & Tabs */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="text-sm font-bold text-[#F5F4F0]">Preview</h3>
              </div>
              <div className="flex items-center gap-1 bg-[#0B0C0E] p-1 rounded-lg border border-white/[0.06] text-[10px] font-mono">
                {(["CONTENT", "VISUAL", "CAPTION", "METADATA"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPreviewTab(t)}
                    className={`px-2 py-1 rounded transition-colors ${
                      previewTab === t
                        ? "bg-[#D4AF37]/20 text-[#D4AF37] font-bold"
                        : "text-[#9E9D98] hover:text-[#F5F4F0]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Body */}
            <div className="min-h-[320px] bg-[#0B0C0E] border border-white/[0.08] rounded-xl p-4 flex flex-col justify-between">
              {generatedOutput ? (
                <div className="space-y-4 text-xs">
                  {previewTab === "CONTENT" && (
                    <>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-[#D4AF37] block mb-1">
                          Generated Headline
                        </span>
                        <h4 className="font-bold text-[#F5F4F0] text-sm leading-snug">
                          {generatedOutput.headline}
                        </h4>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-[#9E9D98] block mb-1">
                          Hook &amp; Script / Post Body
                        </span>
                        <p className="text-[#9E9D98] leading-relaxed whitespace-pre-line">
                          {generatedOutput.body}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-[#D4AF37] block mb-1">
                          Call To Action
                        </span>
                        <p className="text-[#F5F4F0] font-semibold">{generatedOutput.cta}</p>
                      </div>
                    </>
                  )}

                  {previewTab === "VISUAL" && (
                    <div className="space-y-3 text-center py-6">
                      <div className="w-full h-40 rounded-xl bg-gradient-to-br from-[#151618] to-[#0B0C0E] border border-white/[0.08] flex items-center justify-center relative overflow-hidden">
                        <img
                          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80"
                          alt="Generated Visual Preview"
                          className="w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-3">
                          <span className="text-xs font-bold text-white tracking-wider uppercase bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10">
                            {selectedPlatform} {selectedFormat}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] text-[#9E9D98]">
                        Visual asset styled for {selectedPlatform} ({selectedFormat} format)
                      </span>
                    </div>
                  )}

                  {previewTab === "CAPTION" && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-mono text-[#9E9D98] block">
                        Social Caption &amp; Hashtags
                      </span>
                      <div className="bg-[#151618] p-3 rounded-lg border border-white/[0.06] text-[#9E9D98]">
                        <p>{generatedOutput.body}</p>
                        <p className="mt-2 text-[#D4AF37]">
                          {generatedOutput.hashtags.join(" ")}
                        </p>
                      </div>
                    </div>
                  )}

                  {previewTab === "METADATA" && (
                    <div className="space-y-2 font-mono text-[11px]">
                      <div className="flex justify-between py-1 border-b border-white/[0.06]">
                        <span className="text-[#9E9D98]">Target Platform</span>
                        <span className="text-[#F5F4F0]">{selectedPlatform}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.06]">
                        <span className="text-[#9E9D98]">Format</span>
                        <span className="text-[#F5F4F0]">{selectedFormat}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.06]">
                        <span className="text-[#9E9D98]">Tone</span>
                        <span className="text-[#F5F4F0]">{tone}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.06]">
                        <span className="text-[#9E9D98]">Audience</span>
                        <span className="text-[#F5F4F0]">{audience}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.06]">
                        <span className="text-[#9E9D98]">Language</span>
                        <span className="text-[#F5F4F0]">{language}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-[#9E9D98]">Length</span>
                        <span className="text-[#F5F4F0]">{length}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty Preview State */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 my-auto">
                  <div className="w-12 h-12 rounded-xl bg-[#151618] border border-white/[0.08] flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-[#9E9D98]/60" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#F5F4F0]">
                      Your preview will appear here
                    </h4>
                    <p className="text-[11px] text-[#9E9D98] mt-1 max-w-[240px]">
                      Describe what you want to create and click &quot;Generate Content&quot; to preview output.
                    </p>
                  </div>
                </div>
              )}

              {/* Dynamic Live Metadata Footnote */}
              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#9E9D98]">
                <span>
                  Target: <strong className="text-[#F5F4F0]">{selectedPlatform}</strong>
                </span>
                <span>
                  Format: <strong className="text-[#D4AF37]">{selectedFormat}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. QUICK TEMPLATES ("Start Faster") */}
      <div className="space-y-3 border-t border-white/[0.08] pt-6">
        <div>
          <h3 className="text-sm font-bold text-[#F5F4F0] tracking-tight">Start faster</h3>
          <p className="text-xs text-[#9E9D98] mt-0.5">
            Click a template to populate your creation workflow.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => handleApplyTemplate(tmpl)}
              className="p-3.5 rounded-xl bg-[#151618] border border-white/[0.08] hover:border-[#D4AF37]/40 text-left transition-all group flex flex-col justify-between space-y-2"
            >
              <div>
                <span className="text-xs font-bold text-[#F5F4F0] group-hover:text-[#D4AF37] transition-colors block">
                  {tmpl.title}
                </span>
                <span className="text-[11px] text-[#9E9D98] line-clamp-2 mt-0.5 block leading-tight">
                  {tmpl.desc}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#D4AF37] font-semibold block">
                Use Template →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
