"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  Sparkles,
  Users,
  Target,
  Layers,
  BarChart3,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  Calendar,
} from "lucide-react";
import { GeneratedStrategyOutput } from "@ai-social/shared";
import { getAuthHeader } from "@/lib/api-client";

export default function StrategyPage() {
  const [primaryGoal, setPrimaryGoal] = useState("GENERATE_LEADS");
  const [targetAudience, setTargetAudience] = useState("High-growth SaaS founders & marketing leaders");
  const [industry, setIndustry] = useState("B2B SaaS & Tech Solutions");
  const [brandName, setBrandName] = useState("Haute AI Studio");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["INSTAGRAM", "LINKEDIN"]);
  const [postingFrequency, setPostingFrequency] = useState("3-4 posts per week");
  const [contentPreferences, setContentPreferences] = useState("Focus on high-value carousel teardowns and text-based thought leadership");
  const [campaignInfo, setCampaignInfo] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [strategyOutput, setStrategyOutput] = useState<GeneratedStrategyOutput | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadStrategy() {
      setIsFetching(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const authHeader = await getAuthHeader();
        const res = await fetch(`${apiBase}/api/strategy`, { headers: { ...authHeader } });
        const json = await res.json();
        if (isSubscribed && json.success && json.data) {
          setStrategyOutput(json.data.strategyJson);
        }
      } catch {
        // Fallback
      } finally {
        if (isSubscribed) setIsFetching(false);
      }
    }

    loadStrategy();
    return () => {
      isSubscribed = false;
    };
  }, []);

  const togglePlatform = (plat: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(plat) ? prev.filter((p) => p !== plat) : [...prev, plat]
    );
  };

  const handleGenerateStrategy = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      const res = await fetch(`${apiBase}/api/strategy/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          primaryGoal,
          targetAudience,
          industry,
          brandName,
          platforms: selectedPlatforms.length > 0 ? selectedPlatforms : ["INSTAGRAM"],
          postingFrequency,
          contentPreferences,
          campaignInfo,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        if (json.code === "USAGE_LIMIT_REACHED") {
          setErrorMsg("Your free usage credits have been finished. Upgrade your plan in Settings to continue.");
        } else {
          setErrorMsg(json.error || "Failed to generate strategy.");
        }
        setIsLoading(false);
        return;
      }

      setStrategyOutput(json.data.strategyJson);
    } catch {
      setErrorMsg("An error occurred while generating your AI strategy.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-semibold uppercase tracking-widest">
            <Compass className="w-3.5 h-3.5" />
            <span>AI Content Strategy Engine</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-5xl font-bold text-[#f5f4f0]">
            Social Media Content Strategy
          </h1>
          <p className="text-xs md:text-sm text-[#9e9d98] max-w-3xl">
            Answer the core question: <strong className="text-[#f5f4f0]">&quot;What should I post, for whom, on which platform, and why?&quot;</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/strategy/pillars"
            className="px-4 py-2.5 rounded-xl bg-[#1c1f26] border border-white/10 hover:border-white/20 text-xs font-semibold text-[#f5f4f0] flex items-center gap-2 transition-all"
          >
            <Layers className="w-4 h-4 text-[#c5a059]" />
            <span>Content Pillars</span>
          </Link>
          <Link
            href="/calendar/ai"
            className="px-4 py-2.5 rounded-xl bg-[#c5a059] text-black font-bold text-xs flex items-center gap-2 hover:brightness-110 transition-all shadow-lg"
          >
            <Calendar className="w-4 h-4" />
            <span>Open AI Calendar</span>
          </Link>
        </div>
      </div>

      {/* STRATEGY GENERATOR FORM */}
      <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6 border-t-2 border-t-[#c5a059]">
        <h2 className="font-serif-luxury text-2xl font-bold text-[#f5f4f0] flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#c5a059]" />
          <span>Configure Your Strategy Inputs</span>
        </h2>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-[#a84b4b]/20 border border-[#a84b4b]/50 text-xs text-[#f5f4f0] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#a84b4b] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Primary Strategic Goal</label>
            <select
              value={primaryGoal}
              onChange={(e) => setPrimaryGoal(e.target.value)}
              className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
            >
              <option value="GENERATE_LEADS">Generate Qualified Leads & Conversions</option>
              <option value="GROW_AUDIENCE">Grow Organic Audience & Discoverability</option>
              <option value="INCREASE_ENGAGEMENT">Boost Comments, Saves & Engagement</option>
              <option value="BUILD_PERSONAL_BRAND">Build Authority & Personal Brand</option>
              <option value="SELL_PRODUCTS">Sell Products & SaaS Subscriptions</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Brand / Company Name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
              placeholder="e.g. Haute AI Studio"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Target Audience</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
              placeholder="e.g. Agency owners, E-commerce founders..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Industry / Niche</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
              placeholder="e.g. Luxury Goods, B2B SaaS, Health & Wellness..."
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-semibold text-[#9e9d98]">Target Channels</label>
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
          onClick={handleGenerateStrategy}
          disabled={isLoading}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-sm shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>Generating AI Strategy (1 Credit)...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-black" />
              <span>Generate AI Social Content Strategy</span>
            </>
          )}
        </button>
      </div>

      {/* STRATEGY OUTPUT DASHBOARD */}
      {isFetching ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#c5a059] mx-auto" />
          <p className="text-xs text-[#9e9d98]">Loading your strategy recommendations...</p>
        </div>
      ) : strategyOutput ? (
        <div className="space-y-8 animate-in fade-in">
          {/* SECTION A & B: AUDIENCE & POSITIONING */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2 text-[#c5a059] text-xs font-bold uppercase tracking-wider">
                <Users className="w-4 h-4" />
                <span>Audience Analysis</span>
              </div>
              <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0]">{strategyOutput.audience.targetAudience}</h3>

              <div className="space-y-2">
                <span className="text-[10px] font-mono text-[#9e9d98] uppercase">Core Pain Points:</span>
                {strategyOutput.audience.painPoints.map((pt, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#14161a] border border-white/5 text-xs text-[#f5f4f0]">
                    {pt}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Target className="w-4 h-4" />
                <span>Brand Positioning & Angle</span>
              </div>
              <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0]">{strategyOutput.positioning.brandAngle}</h3>
              <p className="text-xs text-[#9e9d98] leading-relaxed">{strategyOutput.positioning.valueProposition}</p>
              <div className="p-3 rounded-2xl bg-[#14161a] border border-white/10 text-xs text-[#c5a059] font-mono">
                Key Differentiator: {strategyOutput.positioning.differentiation}
              </div>
            </div>
          </div>

          {/* SECTION C & D: CONTENT PILLARS & CONTENT MIX */}
          <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-[#c5a059] text-xs font-bold uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                <span>Recommended Content Pillars & Allocation</span>
              </div>
              <Link href="/strategy/pillars" className="text-xs font-bold text-[#c5a059] hover:underline flex items-center gap-1">
                Manage Pillars <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {strategyOutput.contentPillars.map((p, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-[#14161a] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#c5a059]/20 text-[#c5a059] text-[10px] font-mono font-bold">
                      {p.recommendedPercentage}% Allocation
                    </span>
                  </div>
                  <h4 className="font-serif-luxury text-lg font-bold text-[#f5f4f0]">{p.name}</h4>
                  <p className="text-xs text-[#9e9d98] leading-relaxed">{p.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION E: PLATFORM STRATEGY */}
          <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <BarChart3 className="w-4 h-4" />
              <span>Platform-Specific Strategy</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {strategyOutput.platformStrategy.map((ps) => (
                <div key={ps.platform} className="p-6 rounded-2xl bg-[#14161a] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif-luxury text-xl font-bold text-[#c5a059]">{ps.platform}</h4>
                    <span className="text-xs text-[#9e9d98] font-mono">{ps.frequency}</span>
                  </div>
                  <p className="text-xs text-[#f5f4f0]">{ps.contentStyle}</p>
                  <div className="flex gap-2 flex-wrap">
                    {ps.recommendedFormats.map((fmt) => (
                      <span key={fmt} className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-[#9e9d98]">
                        {fmt}
                      </span>
                    ))}
                  </div>
                  <div className="p-3 rounded-xl bg-[#1c1f26] text-[11px] text-[#9e9d98]">
                    <strong className="text-[#f5f4f0]">CTA Strategy:</strong> {ps.ctaStrategy}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION F: EXPLAINABLE AI RECOMMENDATIONS */}
          <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6 border-l-4 border-l-[#c5a059]">
            <div className="flex items-center gap-2 text-[#c5a059] text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Explainable AI Recommendations</span>
            </div>

            <div className="space-y-4">
              {strategyOutput.recommendations.map((rec, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-[#14161a] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#f5f4f0]">{rec.what}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono uppercase font-bold">
                      Confidence: {rec.confidence}
                    </span>
                  </div>
                  <p className="text-xs text-[#9e9d98] leading-relaxed">{rec.why}</p>
                  <div className="text-[10px] text-[#6b6a65] font-mono">Data basis: {rec.dataBasis.join(" · ")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
