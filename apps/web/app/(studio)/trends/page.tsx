"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Search,
  Sparkles,
  Zap,
  Radio,
  Loader2,
  AlertCircle,
  Flame,
} from "lucide-react";
import { getAuthHeader } from "@/lib/api-client";
import { NormalizedTrend, TrendSourceState } from "@ai-social/shared";

export default function TrendIntelligenceDashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const [isLoading, setIsLoading] = useState(true);
  const [hasSource, setHasSource] = useState(false);
  const [sourceState, setSourceState] = useState<TrendSourceState | null>(null);
  const [trends, setTrends] = useState<NormalizedTrend[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadTrendsData() {
      setIsLoading(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const authHeader = await getAuthHeader();

        const params = new URLSearchParams();
        if (searchQuery) params.set("query", searchQuery);
        if (selectedPlatform !== "ALL") params.set("platform", selectedPlatform);
        if (selectedCategory !== "ALL") params.set("category", selectedCategory);
        if (selectedStatus !== "ALL") params.set("trendStatus", selectedStatus);

        const res = await fetch(`${apiBase}/api/trends?${params.toString()}`, {
          headers: { ...authHeader },
        });

        const json = await res.json();
        if (isSubscribed && json.success) {
          setHasSource(json.data.hasSource);
          setSourceState(json.data.sourceState || null);
          setTrends(json.data.trends || []);
        }
      } catch {
        // Fallback
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    loadTrendsData();
    return () => {
      isSubscribed = false;
    };
  }, [searchQuery, selectedPlatform, selectedCategory, selectedStatus]);

  const handleGenerateContent = async (trendId: string) => {
    setGeneratingId(trendId);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      const res = await fetch(`${apiBase}/api/trends/${trendId}/generate`, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (json.success && json.data?.studioUrl) {
        router.push(json.data.studioUrl);
      } else if (res.status === 402) {
        alert(json.error || "Your free usage credits have finished. Please upgrade.");
      } else {
        router.push(`/trends/${trendId}`);
      }
    } catch {
      router.push(`/trends/${trendId}`);
    } finally {
      setGeneratingId(null);
    }
  };

  const getLifecycleBadge = (lifecycle?: string) => {
    switch (lifecycle) {
      case "EMERGING":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>EMERGING</span>
          </span>
        );
      case "GROWING":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-[#c5a059]/20 text-[#c5a059] text-[10px] font-mono font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>GROWING</span>
          </span>
        );
      case "PEAK":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-mono font-bold">
            PEAK
          </span>
        );
      case "DECLINING":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
            DECLINING
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[#9e9d98] text-[10px] font-mono">
            UNKNOWN
          </span>
        );
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-[#c5a059] text-xs font-mono font-bold uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>Real-Source Trend Engine</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold tracking-tight text-[#f5f4f0]">
            Trend Intelligence
          </h1>
          <p className="text-sm text-[#9e9d98] max-w-2xl">
            Detect real-time industry topics, viral hooks, and niche momentum to generate strategy-aligned social media opportunities.
          </p>
        </div>

        {/* PROVIDER STATUS BADGE */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-[#14161a] border border-white/10 flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${hasSource ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="text-[#9e9d98] font-mono">Provider:</span>
            <span className="font-bold text-[#f5f4f0]">{sourceState?.providerName || "Unconnected"}</span>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="p-4 rounded-2xl bg-[#14161a] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9e9d98]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trend topics, keywords, or niches..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c1f26] border border-white/10 text-xs text-[#f5f4f0] placeholder-[#9e9d98] focus:outline-none focus:border-[#c5a059]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="bg-[#1c1f26] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:outline-none focus:border-[#c5a059]"
          >
            <option value="ALL">All Platforms</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="X">X (Twitter)</option>
            <option value="TIKTOK">TikTok</option>
            <option value="YOUTUBE">YouTube</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#1c1f26] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:outline-none focus:border-[#c5a059]"
          >
            <option value="ALL">All Categories</option>
            <option value="Technology">Technology</option>
            <option value="Business">Business</option>
            <option value="Marketing">Marketing</option>
            <option value="Design">Design</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#1c1f26] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:outline-none focus:border-[#c5a059]"
          >
            <option value="ALL">All Lifecycles</option>
            <option value="EMERGING">Emerging</option>
            <option value="GROWING">Growing</option>
            <option value="PEAK">Peak</option>
            <option value="DECLINING">Declining</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#c5a059] mx-auto" />
          <p className="text-xs text-[#9e9d98] font-mono">Querying trend intelligence service...</p>
        </div>
      ) : !hasSource && trends.length === 0 ? (
        <div className="p-8 md:p-12 rounded-3xl bg-[#14161a] border border-white/10 text-center space-y-6 max-w-3xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center mx-auto text-[#c5a059]">
            <Radio className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif-luxury text-2xl font-bold text-[#f5f4f0]">
              Live trend intelligence is not connected yet.
            </h2>
            <p className="text-xs text-[#9e9d98] max-w-xl mx-auto leading-relaxed">
              Connect a real-time data provider (such as Google Trends or BigQuery) to detect live industry trends.
            </p>
          </div>
        </div>
      ) : trends.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#14161a] border border-white/10 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-[#9e9d98] mx-auto" />
          <h3 className="font-serif-luxury text-lg font-bold text-[#f5f4f0]">No trends found</h3>
          <p className="text-xs text-[#9e9d98]">No active trend records match your search or filter criteria.</p>
        </div>
      ) : (
        /* TREND CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trends.map((t) => {
            const trendScore = t.trendScore || 75;
            const relevanceScore = t.relevanceScore || 65;
            const opportunityScore = t.opportunityScore || 80;

            return (
              <div
                key={t.id}
                className="p-6 rounded-2xl bg-[#14161a] border border-white/10 hover:border-[#c5a059]/40 transition-all flex flex-col justify-between space-y-6 group shadow-xl"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-[#c5a059] shrink-0" />
                    <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0] group-hover:text-[#c5a059] transition-colors truncate">
                      {t.title}
                    </h3>
                  </div>
                  <div className="text-xs text-[#9e9d98] font-mono flex items-center gap-1.5">
                    <span>{t.source === "GOOGLE_TRENDS" ? "Google Trends" : t.source}</span>
                    <span>·</span>
                    <span>{t.region || "Global"}</span>
                  </div>
                </div>

                {/* Score Stats Grid */}
                <div className="p-4 rounded-xl bg-[#1c1f26] border border-white/5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9e9d98]">Trend Score</span>
                    <span className="font-bold font-mono text-[#f5f4f0]">{trendScore}/100</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9e9d98]">Lifecycle</span>
                    <div>{getLifecycleBadge(t.lifecycle || t.trendStatus)}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9e9d98]">Brand Relevance</span>
                    <span className="font-bold font-mono text-[#c5a059]">{relevanceScore}/100</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-white/10 font-bold">
                    <span className="text-[#f5f4f0]">Opportunity</span>
                    <span className="font-mono text-emerald-400">{opportunityScore}/100</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <Link
                    href={`/trends/${t.id}`}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#1c1f26] border border-white/10 text-[#f5f4f0] text-center font-bold text-xs hover:border-[#c5a059] transition-all"
                  >
                    Analyze
                  </Link>
                  <button
                    onClick={() => handleGenerateContent(t.id)}
                    disabled={generatingId === t.id}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                  >
                    {generatingId === t.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Content</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
