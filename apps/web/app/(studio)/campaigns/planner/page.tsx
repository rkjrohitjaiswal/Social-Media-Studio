"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { AiCampaignOutput, CampaignTopicOpportunity } from "@ai-social/shared";
import { getAuthHeader } from "@/lib/api-client";

export default function CampaignPlannerPage() {
  const router = useRouter();
  const [name, setName] = useState("Q3 Product Launch Campaign");
  const [objective, setObjective] = useState("Drive qualified B2B SaaS trial signups");
  const [productService, setProductService] = useState("Haute AI Social Studio");
  const [targetAudience, setTargetAudience] = useState("Founders & Agency Owners");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["INSTAGRAM", "LINKEDIN"]);
  const [cta, setCta] = useState("Start 14-Day Free Trial");
  const [offer, setOffer] = useState("50% Off First Month with code HAUTE50");

  const [isLoading, setIsLoading] = useState(false);
  const [campaignResult, setCampaignResult] = useState<AiCampaignOutput | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const togglePlatform = (plat: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(plat) ? prev.filter((p) => p !== plat) : [...prev, plat]
    );
  };

  const handleGenerateCampaign = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      const res = await fetch(`${apiBase}/api/campaigns/planner/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          name,
          objective,
          productService,
          targetAudience,
          platforms: selectedPlatforms.length > 0 ? selectedPlatforms : ["INSTAGRAM"],
          cta,
          offer,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        if (json.code === "USAGE_LIMIT_REACHED") {
          setErrorMsg("Your free usage credits have been finished. Upgrade your plan in Settings to continue.");
        } else {
          setErrorMsg(json.error || "Failed to generate campaign strategy.");
        }
        setIsLoading(false);
        return;
      }

      setCampaignResult(json.data.output);
    } catch {
      setErrorMsg("An error occurred while generating your campaign.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOpportunityToStudio = (topic: CampaignTopicOpportunity) => {
    router.push(
      `/create?topic=${encodeURIComponent(topic.topic)}&platform=${encodeURIComponent(
        topic.recommendedPlatform
      )}&contentType=${encodeURIComponent(topic.recommendedFormat)}`
    );
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-16">
      {/* HEADER */}
      <div className="space-y-2 border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-semibold uppercase tracking-widest">
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Strategic AI Campaign Architecture</span>
        </div>
        <h1 className="font-serif-luxury text-3xl md:text-5xl font-bold text-[#f5f4f0]">
          AI Campaign Planner
        </h1>
        <p className="text-xs md:text-sm text-[#9e9d98] max-w-3xl">
          Plan end-to-end multi-channel social campaigns. AI structures your campaign positioning, 5 phases, topics pipeline, and platform adaptations.
        </p>
      </div>

      {/* FORM WIZARD */}
      <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6 border-t-2 border-t-[#c5a059]">
        <h2 className="font-serif-luxury text-2xl font-bold text-[#f5f4f0] flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#c5a059]" />
          <span>Campaign Blueprint Parameters</span>
        </h2>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-[#a84b4b]/20 border border-[#a84b4b]/50 text-xs text-[#f5f4f0] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#a84b4b] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Core Objective</label>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Product / Service</label>
            <input
              type="text"
              value={productService}
              onChange={(e) => setProductService(e.target.value)}
              className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Target Audience</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Primary CTA</label>
            <input
              type="text"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Promotional Offer (Optional)</label>
            <input
              type="text"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-semibold text-[#9e9d98]">Campaign Channels</label>
            <div className="flex gap-2 flex-wrap">
              {["INSTAGRAM", "LINKEDIN", "X", "FACEBOOK", "THREADS", "YOUTUBE", "TIKTOK"].map((p) => {
                const active = selectedPlatforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      active
                        ? "bg-[#c5a059] text-black border-[#c5a059]"
                        : "bg-[#14161a] text-[#9e9d98] border-white/10 hover:border-white/20"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerateCampaign}
          disabled={isLoading}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-sm shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>Generating AI Campaign Blueprint (1 Credit)...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-black" />
              <span>Generate AI Campaign Strategy</span>
            </>
          )}
        </button>
      </div>

      {/* CAMPAIGN OUTPUT RESULT */}
      {campaignResult && (
        <div className="space-y-8 animate-in fade-in">
          {/* POSITIONING & CORE MESSAGE */}
          <div className="glass-card p-6 md:p-8 rounded-3xl space-y-4">
            <h3 className="font-serif-luxury text-2xl font-bold text-[#f5f4f0]">{campaignResult.name} Blueprint</h3>
            <p className="text-xs text-[#c5a059] font-mono">{campaignResult.positioning}</p>
            <div className="p-4 rounded-2xl bg-[#14161a] border border-white/10 text-xs text-[#f5f4f0]">
              <strong className="text-[#c5a059]">Core Campaign Message:</strong> &quot;{campaignResult.coreMessage}&quot;
            </div>
          </div>

          {/* 5 CAMPAIGN PHASES */}
          <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
            <h4 className="text-xs font-bold text-[#c5a059] uppercase tracking-wider">5 Strategic Campaign Phases</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {campaignResult.phases.map((phase) => (
                <div key={phase.phaseNumber} className="p-4 rounded-2xl bg-[#14161a] border border-white/10 space-y-2">
                  <div className="text-[10px] text-[#c5a059] font-mono font-bold uppercase">
                    Phase {phase.phaseNumber} · {phase.duration}
                  </div>
                  <h5 className="font-serif-luxury text-base font-bold text-[#f5f4f0]">{phase.name}</h5>
                  <p className="text-xs text-[#9e9d98] leading-relaxed">{phase.focus}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CONTENT TOPIC OPPORTUNITIES */}
          <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
            <h4 className="text-xs font-bold text-[#c5a059] uppercase tracking-wider">Campaign Content Opportunities</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaignResult.topics.map((topic, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-[#14161a] border border-white/10 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-[#c5a059]">
                        {topic.recommendedPlatform} · {topic.recommendedFormat}
                      </span>
                      <span className="text-[10px] font-mono text-[#9e9d98]">{topic.pillar}</span>
                    </div>
                    <h5 className="font-serif-luxury text-lg font-bold text-[#f5f4f0]">{topic.topic}</h5>
                    <p className="text-xs text-[#9e9d98] italic font-serif">&quot;{topic.hook}&quot;</p>
                  </div>

                  <button
                    onClick={() => handleSendOpportunityToStudio(topic)}
                    className="w-full py-2.5 rounded-xl bg-[#1c1f26] border border-white/10 hover:border-[#c5a059] text-xs font-bold text-[#f5f4f0] hover:text-[#c5a059] transition-all flex items-center justify-center gap-2"
                  >
                    <span>Generate Content in Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
