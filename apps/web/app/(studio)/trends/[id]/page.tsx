"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Zap,
  ArrowLeft,
  Calendar,
  Bookmark,
  ExternalLink,
  Loader2,
  AlertCircle,
  Check,
  Flame,
  Layers,
} from "lucide-react";
import { getAuthHeader } from "@/lib/api-client";
import { DetailedTrendResponse } from "@ai-social/shared";

export default function TrendDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const trendId = resolvedParams.id;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DetailedTrendResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isAddingCalendar, setIsAddingCalendar] = useState(false);
  const [addedCalendarSuccess, setAddedCalendarSuccess] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    async function loadTrendDetail() {
      setIsLoading(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const authHeader = await getAuthHeader();

        const res = await fetch(`${apiBase}/api/trends/${trendId}`, {
          headers: { ...authHeader },
        });

        const json = await res.json();
        if (isSubscribed) {
          if (res.ok && json.success) {
            setData(json.data);
          } else {
            setErrorMsg(json.error || "Trend record not found");
          }
        }
      } catch {
        if (isSubscribed) setErrorMsg("Failed to load trend detail");
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    loadTrendDetail();
    return () => {
      isSubscribed = false;
    };
  }, [trendId]);

  const handleGenerateContent = async () => {
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      const res = await fetch(`${apiBase}/api/trends/${trendId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        if (json.code === "USAGE_LIMIT_REACHED") {
          setErrorMsg("Your free usage credits have been finished. Upgrade your plan to continue.");
        } else {
          setErrorMsg(json.error || "Failed to generate content opportunity.");
        }
        setIsGenerating(false);
        return;
      }

      router.push(json.data.studioUrl);
    } catch {
      setErrorMsg("Failed to connect to AI generation service.");
      setIsGenerating(false);
    }
  };

  const handleAddToCalendar = async () => {
    setIsAddingCalendar(true);
    setCalendarError(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      const res = await fetch(`${apiBase}/api/calendar/add-trend`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ trendId }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setCalendarError(json.error || "Failed to add trend to calendar.");
      } else {
        setAddedCalendarSuccess(true);
      }
    } catch {
      setCalendarError("Could not reach the API. Please check the server is running.");
    } finally {
      setIsAddingCalendar(false);
    }
  };

  const handleUseInCampaign = async () => {
    setIsCreatingCampaign(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      const res = await fetch(`${apiBase}/api/campaigns/planner/from-trend`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ trendId }),
      });

      const json = await res.json();
      if (json.success) {
        router.push("/campaigns");
      } else {
        router.push("/campaigns");
      }
    } catch {
      router.push("/campaigns");
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleSaveTrend = async () => {
    setIsSaved(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      await fetch(`${apiBase}/api/saved`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          itemType: "TREND_OPPORTUNITY",
          title: data?.trend.title || "Trend Opportunity",
          content: data?.opportunity?.recommendedAngle || "",
          metadata: data,
        }),
      });
    } catch {
      // Graceful save
    }
  };

  if (isLoading) {
    return (
      <div className="py-32 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#c5a059] mx-auto" />
        <p className="text-xs text-[#9e9d98] font-mono">Evaluating trend relevance &amp; AI opportunity...</p>
      </div>
    );
  }

  if (errorMsg && !data) {
    return (
      <div className="p-10 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <h2 className="font-serif-luxury text-2xl font-bold text-[#f5f4f0]">Trend Not Found</h2>
        <p className="text-xs text-[#9e9d98]">{errorMsg}</p>
        <Link
          href="/trends"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 text-[#f5f4f0] text-xs font-bold hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Trend Intelligence</span>
        </Link>
      </div>
    );
  }

  const { trend, opportunity } = data!;
  const trendScore = trend.trendScore || opportunity?.trendScore || 75;
  const lifecycle = trend.lifecycle || opportunity?.lifecycle || "UNKNOWN";
  const relevanceScore = opportunity?.relevanceScore || 65;
  const opportunityScore = opportunity?.opportunityScore || 80;

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto">
      {/* BACK NAVIGATION */}
      <Link
        href="/trends"
        className="inline-flex items-center gap-2 text-xs font-mono text-[#9e9d98] hover:text-[#c5a059] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Trend Intelligence</span>
      </Link>

      {/* ERROR ALERT IF PRESENT */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
          {errorMsg}
        </div>
      )}

      {/* TREND HEADER */}
      <div className="p-8 rounded-3xl bg-[#14161a] border border-white/10 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#c5a059]/20 text-[#c5a059] text-xs font-mono font-bold">
              {trend.source === "GOOGLE_TRENDS" ? "Google Trends" : trend.source} · {trend.region || "Global"}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase">
              {lifecycle}
            </span>
          </div>

          <span className="text-xs font-mono text-[#9e9d98]">Source: {trend.source}</span>
        </div>

        <div className="space-y-2">
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0] flex items-center gap-3">
            <Flame className="w-8 h-8 text-[#c5a059]" />
            <span>{trend.title}</span>
          </h1>
          <p className="text-sm text-[#9e9d98] leading-relaxed max-w-3xl">{trend.description}</p>
        </div>

        {/* METRICS SUMMARY STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#1c1f26] border border-white/5 text-xs">
          <div className="space-y-1">
            <span className="text-[#9e9d98] block text-[10px] font-mono uppercase">Trend Score</span>
            <span className="font-bold text-lg font-mono text-[#f5f4f0]">{trendScore}/100</span>
          </div>
          <div className="space-y-1">
            <span className="text-[#9e9d98] block text-[10px] font-mono uppercase">Lifecycle</span>
            <span className="font-bold text-sm font-mono text-emerald-400 uppercase">{lifecycle}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[#9e9d98] block text-[10px] font-mono uppercase">Brand Relevance</span>
            <span className="font-bold text-lg font-mono text-[#c5a059]">{relevanceScore}/100</span>
          </div>
          <div className="space-y-1">
            <span className="text-[#9e9d98] block text-[10px] font-mono uppercase">Opportunity</span>
            <span className="font-bold text-lg font-mono text-emerald-400">{opportunityScore}/100</span>
          </div>
        </div>

        {trend.sourceUrl && (
          <a
            href={trend.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-mono text-[#c5a059] hover:underline"
          >
            <span>View Original Source</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* AI RELEVANCE & OPPORTUNITY BREAKDOWN */}
      {opportunity && (
        <div className="p-8 rounded-3xl bg-[#14161a] border border-[#c5a059]/30 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-[#c5a059]">
            <Sparkles className="w-48 h-48" />
          </div>

          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="inline-flex items-center gap-2 text-[#c5a059] text-xs font-mono font-bold uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>Brand Relevance &amp; AI Content Opportunity</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#9e9d98]">Opportunity Score:</span>
              <span className="px-3 py-1 rounded-full bg-emerald-500 text-black font-mono font-bold text-xs">
                {opportunity.opportunityScore}/100
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-[#9e9d98] block">
                Recommended Content Angle
              </label>
              <p className="font-serif-luxury text-lg font-bold text-[#f5f4f0]">{opportunity.recommendedAngle}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-[#9e9d98] block">Platform</label>
                <p className="text-xs font-bold text-[#f5f4f0]">{opportunity.recommendedPlatform}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-[#9e9d98] block">Format</label>
                <p className="text-xs font-bold text-[#f5f4f0]">{opportunity.recommendedFormat}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-[#9e9d98] block">Pillar</label>
                <p className="text-xs font-bold text-[#c5a059] truncate">{opportunity.contentPillarName || "Brand Pillar"}</p>
              </div>
            </div>
          </div>

          {/* EXPLAINABLE AI SECTION */}
          <div className="p-5 rounded-2xl bg-[#1c1f26] border border-white/10 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#c5a059]">Explainable AI Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#9e9d98] block">WHAT</span>
                <p className="text-[#f5f4f0]">{opportunity.what}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#9e9d98] block">WHY</span>
                <p className="text-[#f5f4f0]">{opportunity.why}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#9e9d98] block">CONFIDENCE</span>
                <p className="font-bold text-emerald-400">{opportunity.confidence}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5">
              <span className="text-[10px] font-mono text-[#9e9d98] block mb-1">DATA BASIS</span>
              <ul className="space-y-1 text-xs text-[#9e9d98] list-disc list-inside">
                {opportunity.dataBasis.map((basis, idx) => (
                  <li key={idx}>{basis}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3 flex-wrap">
            <button
              onClick={handleGenerateContent}
              disabled={isGenerating}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-xs shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Launching Creation Studio (1 Credit)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>Generate Content</span>
                </>
              )}
            </button>

            <button
              onClick={handleAddToCalendar}
              disabled={isAddingCalendar}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-[#f5f4f0] font-bold text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              {isAddingCalendar ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" />
              ) : addedCalendarSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Added to Calendar</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 text-[#c5a059]" />
                  <span>Add to Calendar</span>
                </>
              )}
            </button>

            <button
              onClick={handleUseInCampaign}
              disabled={isCreatingCampaign}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-[#f5f4f0] font-bold text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              {isCreatingCampaign ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" />
              ) : (
                <>
                  <Layers className="w-4 h-4 text-[#c5a059]" />
                  <span>Use in Campaign</span>
                </>
              )}
            </button>

            <button
              onClick={handleSaveTrend}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-[#9e9d98] hover:text-[#f5f4f0] font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  <span>Save Trend</span>
                </>
              )}
            </button>
          </div>

          {/* CALENDAR ACTION ERROR */}
          {calendarError && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{calendarError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
