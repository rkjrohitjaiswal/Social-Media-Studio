"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Layers,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Share2,
  FolderKanban,
  Check,
  ShoppingBag,
  Award,
  BookOpen,
  Briefcase,
  User,
  Megaphone,
  Globe,
} from "lucide-react";
import { useStudio } from "@/lib/studio-context";
import { generatePlatformContent } from "@/lib/social-engine/platform-content-generator";
import { SocialPlatform, ContentType, SocialAccountData } from "@/lib/social-engine/types";
import { socialAccountService } from "@/lib/social-engine/account-service";

const CONTENT_TYPES: { id: ContentType; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "AFFILIATE_PRODUCT", label: "Affiliate Product", icon: <ShoppingBag className="w-4 h-4 text-[#c5a059]" />, desc: "Promote products with verified specs & affiliate disclosure" },
  { id: "CERTIFICATION", label: "Certification", icon: <Award className="w-4 h-4 text-[#c5a059]" />, desc: "Share achievements, skills learned & credentials" },
  { id: "TEACHING", label: "Teaching", icon: <BookOpen className="w-4 h-4 text-[#c5a059]" />, desc: "Educational lessons, masterclasses & technical guides" },
  { id: "PROJECT", label: "Project / Portfolio", icon: <Briefcase className="w-4 h-4 text-[#c5a059]" />, desc: "Showcase portfolio work & client case studies" },
  { id: "PERSONAL_BRAND", label: "Personal Brand", icon: <User className="w-4 h-4 text-[#c5a059]" />, desc: "Thought leadership & personal stories" },
  { id: "ANNOUNCEMENT", label: "Announcement", icon: <Megaphone className="w-4 h-4 text-[#c5a059]" />, desc: "Product launches & company updates" },
  { id: "GENERAL", label: "General Social Post", icon: <Globe className="w-4 h-4 text-[#c5a059]" />, desc: "Standard multi-platform post" },
];

const TARGET_PLATFORMS: { id: SocialPlatform; label: string }[] = [
  { id: "INSTAGRAM", label: "Instagram" },
  { id: "LINKEDIN", label: "LinkedIn" },
  { id: "THREADS", label: "Threads" },
  { id: "PINTEREST", label: "Pinterest" },
  { id: "FACEBOOK", label: "Facebook" },
  { id: "TIKTOK", label: "TikTok" },
  { id: "YOUTUBE", label: "YouTube" },
  { id: "X", label: "X (Twitter)" },
  { id: "REDDIT", label: "Reddit" },
  { id: "TELEGRAM", label: "Telegram" },
  { id: "BLUESKY", label: "Bluesky" },
];

export default function CreateContentPage() {
  const router = useRouter();
  const { activeBrand } = useStudio();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedContentType, setSelectedContentType] = useState<ContentType>("AFFILIATE_PRODUCT");
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([
    "INSTAGRAM",
    "LINKEDIN",
    "PINTEREST",
    "X",
  ]);

  // Affiliate Fields
  const [productName, setProductName] = useState("Lumière Sculpting Camera Lens");
  const [productUrl, setProductUrl] = useState("https://example.com/products/lens-85mm");
  const [affiliateUrl, setAffiliateUrl] = useState("https://example.com/aff/lens-85mm?ref=studio");
  const [category, setCategory] = useState("Photography Gear");
  const [keyFeatures, setKeyFeatures] = useState("F/1.2 ultra-fast aperture, Nano AR Coating II, Dual XD Linear Motors");

  // Certification Fields
  const [certName, setCertName] = useState("AWS Certified AI & ML Specialist");
  const [issuingOrg, setIssuingOrg] = useState("Amazon Web Services");
  const [skillsLearned, setSkillsLearned] = useState("Deep Learning, LLM Fine-Tuning, MLOps Pipelines");

  // Teaching Fields
  const [topic, setTopic] = useState("Multi-Platform AI Content Architecture");
  const [learningObjective, setLearningObjective] = useState("Build extensible provider abstractions for social platforms");
  const [keyPoints, setKeyPoints] = useState("Interface isolation, Capabilities registry, Platform-specific AI prompts");

  // Image Media Asset
  const [imageMediaUrl, setImageMediaUrl] = useState(
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop"
  );

  const togglePlatform = (p: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const handleGenerateAll = () => {
    // Generate tailored content for each selected platform
    selectedPlatforms.forEach((platform) => {
      generatePlatformContent({
        platform,
        contentType: selectedContentType,
        sourceData: {
          affiliate: {
            productName,
            productUrl,
            affiliateUrl,
            category,
            keyFeatures: keyFeatures.split(",").map((s) => s.trim()),
            disclosure: "Disclosure: This post contains affiliate links. #ad #affiliate",
          },
          certification: {
            certificationName: certName,
            issuingOrganization: issuingOrg,
            skillsLearned: skillsLearned.split(",").map((s) => s.trim()),
          },
          teaching: {
            topic,
            learningObjective,
            keyPoints: keyPoints.split(",").map((s) => s.trim()),
          },
        },
        brand: {
          name: activeBrand?.name || "Maison Lumière",
          toneVoice: activeBrand?.toneVoice || "Editorial",
          defaultCta: "Discover more online",
        },
        assetUrl: imageMediaUrl,
      });
    });

    router.push("/content-review");
  };

  return (
    <div className="space-y-10 pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Platform AI Engine</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
            Create Multi-Platform Content
          </h1>
          <p className="text-xs text-[#9e9d98] mt-1">
            Transform 1 source input into tailored, platform-specific AI content for all your social accounts.
          </p>
        </div>

        {/* STEP PROGRESS */}
        <div className="flex items-center gap-2 bg-[#1c1f26] p-1.5 rounded-2xl border border-white/10">
          {[
            { step: 1 as const, label: "01 Content Type" },
            { step: 2 as const, label: "02 Details" },
            { step: 3 as const, label: "03 Destinations" },
            { step: 4 as const, label: "04 Preview" },
          ].map((st) => (
            <button
              key={st.step}
              onClick={() => setCurrentStep(st.step)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentStep === st.step
                  ? "bg-[#c5a059] text-black shadow-lg"
                  : currentStep > st.step
                  ? "bg-white/10 text-[#c5a059]"
                  : "text-[#9e9d98] hover:text-[#f5f4f0]"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: CONTENT TYPE */}
      {currentStep === 1 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6 max-w-4xl">
          <h2 className="text-sm font-semibold text-[#f5f4f0] uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
            <FolderKanban className="w-4 h-4 text-[#c5a059]" />
            Step 01 — Choose Content Archetype
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONTENT_TYPES.map((ct) => (
              <button
                key={ct.id}
                type="button"
                onClick={() => setSelectedContentType(ct.id)}
                className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-3 ${
                  selectedContentType === ct.id
                    ? "bg-[#c5a059]/10 border-[#c5a059] gold-glow"
                    : "bg-[#0b0c0e] border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-[#1c1f26] border border-white/10">{ct.icon}</div>
                  {selectedContentType === ct.id && <CheckCircle2 className="w-5 h-5 text-[#c5a059]" />}
                </div>
                <div>
                  <div className="text-sm font-bold text-[#f5f4f0]">{ct.label}</div>
                  <div className="text-xs text-[#9e9d98] mt-1">{ct.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 rounded-xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2"
            >
              <span>Next: Input Content Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DETAILS */}
      {currentStep === 2 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6 max-w-3xl">
          <h2 className="text-sm font-semibold text-[#f5f4f0] uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
            <Layers className="w-4 h-4 text-[#c5a059]" />
            Step 02 — Provide Source Information ({selectedContentType.replace("_", " ")})
          </h2>

          {selectedContentType === "AFFILIATE_PRODUCT" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#9e9d98] mb-1">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#9e9d98] mb-1">Product Page URL</label>
                  <input
                    type="text"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9e9d98] mb-1">Affiliate Destination URL</label>
                  <input
                    type="text"
                    value={affiliateUrl}
                    onChange={(e) => setAffiliateUrl(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#9e9d98] mb-1">Key Product Features (Comma Separated)</label>
                <input
                  type="text"
                  value={keyFeatures}
                  onChange={(e) => setKeyFeatures(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0]"
                />
              </div>
              <p className="text-[11px] text-[#c5a059]/80 bg-[#c5a059]/10 p-3 rounded-xl border border-[#c5a059]/20">
                🔒 Safe AI Guardrail: Price and product claims will be extracted strictly from supplied information. AI will not fabricate unverified product claims.
              </p>
            </div>
          )}

          {selectedContentType === "CERTIFICATION" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#9e9d98] mb-1">Certification Name</label>
                <input
                  type="text"
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9e9d98] mb-1">Issuing Organization</label>
                <input
                  type="text"
                  value={issuingOrg}
                  onChange={(e) => setIssuingOrg(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9e9d98] mb-1">Skills Mastered (Comma Separated)</label>
                <input
                  type="text"
                  value={skillsLearned}
                  onChange={(e) => setSkillsLearned(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0]"
                />
              </div>
            </div>
          )}

          {selectedContentType === "TEACHING" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#9e9d98] mb-1">Topic / Lesson Title</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9e9d98] mb-1">Learning Objective</label>
                <input
                  type="text"
                  value={learningObjective}
                  onChange={(e) => setLearningObjective(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9e9d98] mb-1">Key Takeaways (Comma Separated)</label>
                <input
                  type="text"
                  value={keyPoints}
                  onChange={(e) => setKeyPoints(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0]"
                />
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 rounded-xl bg-[#1c1f26] border border-white/10 text-xs font-semibold text-[#9e9d98] flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-6 py-3 rounded-xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 flex items-center gap-2"
            >
              <span>Next: Target Social Accounts</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DESTINATIONS */}
      {currentStep === 3 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6 max-w-3xl">
          <h2 className="text-sm font-semibold text-[#f5f4f0] uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
            <Share2 className="w-4 h-4 text-[#c5a059]" />
            Step 03 — Select Target Social Platforms & Accounts
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {TARGET_PLATFORMS.map((p) => {
              const isSelected = selectedPlatforms.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? "bg-[#c5a059]/20 border-[#c5a059] text-[#f5f4f0]"
                      : "bg-[#0b0c0e] border-white/10 text-[#9e9d98] hover:border-white/20"
                  }`}
                >
                  <span className="text-xs font-bold">{p.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-[#c5a059]" />}
                </button>
              );
            })}
          </div>

          <div className="pt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-xl bg-[#1c1f26] border border-white/10 text-xs font-semibold text-[#9e9d98] flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-6 py-3 rounded-xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 flex items-center gap-2"
            >
              <span>Next: Preview & Generate</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PREVIEW & GENERATE */}
      {currentStep === 4 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6 max-w-3xl border-[#c5a059]/40 gold-glow">
          <h2 className="text-sm font-semibold text-[#f5f4f0] uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
            <Sparkles className="w-4 h-4 text-[#c5a059]" />
            Step 04 — Review & Trigger Multi-Platform AI Generation
          </h2>

          <div className="space-y-4 text-xs text-[#9e9d98]">
            <div className="flex items-center justify-between bg-[#0b0c0e] p-4 rounded-2xl border border-white/10">
              <span>Selected Content Type:</span>
              <span className="font-bold text-[#c5a059]">{selectedContentType}</span>
            </div>
            <div className="flex items-center justify-between bg-[#0b0c0e] p-4 rounded-2xl border border-white/10">
              <span>Selected Target Platforms ({selectedPlatforms.length}):</span>
              <span className="font-bold text-[#f5f4f0]">{selectedPlatforms.join(", ")}</span>
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-xl bg-[#1c1f26] border border-white/10 text-xs font-semibold text-[#9e9d98] flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleGenerateAll}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-xs shadow-xl hover:brightness-110 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>Generate Dedicated AI Content for All {selectedPlatforms.length} Platforms</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
