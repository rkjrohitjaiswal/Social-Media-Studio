"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Sparkles,
  Trophy,
  Target,
  Layers,
  Clock,
  Zap,
  Loader2,
  X,
  ArrowRight,
  RefreshCw,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  Tv,
  Image as ImageIcon,
  Video,
  FileText,
  Share2,
  Bell,
  HelpCircle,
  User,
  Building2,
  ExternalLink,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertCircle,
  Flame,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import {
  DetailedPerformanceAnalysis,
  DetectedContentPattern,
  BestPostingTimeReport,
  AiNextContentRecommendation,
} from "@ai-social/shared";
import { getAuthHeader } from "@/lib/api-client";

interface AnalyticsOverviewData {
  publishedCount: number;
  totalImpressions: number;
  totalReach: number;
  totalEngagements: number;
  averageEngagementRate: number;
  followerGrowth: number;
  topPerformingPlatform: string;
  platformBreakdown: Record<string, number>;
  recentPublishingActivity: Array<{
    id: string;
    platform: string;
    publishedAt: string;
    externalPostId?: string;
    permalink?: string;
  }>;
}

interface TopContentItem {
  id: string;
  title: string;
  topic: string;
  format: string;
  contentType: string;
  platform: string;
  pillarName: string;
  hook: string;
  cta: string;
  metrics: {
    engagementRate: number;
    reach: number;
    saves: number;
    shares: number;
    impressions?: number;
    likes?: number;
    comments?: number;
  };
}

interface MediaAnalyticsItem {
  id: string;
  platform: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  engagementRate: number;
  publishedAt: string;
  permalink?: string;
  hasSnapshotData?: boolean;
}

interface TimeseriesPoint {
  date: string;
  impressions: number;
  engagements: number;
}

type ChartMetric = "views" | "reach" | "engagement" | "followers" | "watchTime";

export default function AnalyticsDashboardPage() {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Filter & Toolbar Controls State
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>("ALL");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("30D");
  const [selectedSortMetric, setSelectedSortMetric] = useState<
    "engagement" | "reach" | "impressions" | "clicks" | "likes" | "comments" | "shares" | "saves" | "views"
  >("engagement");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("views");

  // Data Loading & State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overview, setOverview] = useState<AnalyticsOverviewData | null>(null);
  const [topItems, setTopItems] = useState<TopContentItem[]>([]);
  const [mediaList, setMediaList] = useState<MediaAnalyticsItem[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [patterns, setPatterns] = useState<DetectedContentPattern[]>([]);
  const [bestTime, setBestTime] = useState<BestPostingTimeReport | null>(null);
  const [nextContentRecs, setNextContentRecs] = useState<AiNextContentRecommendation[]>([]);
  const [providersStatus, setProvidersStatus] = useState<Record<string, { ready: boolean; name: string }>>({});

  // Analysis Modal State
  const [analysisModalItem, setAnalysisModalItem] = useState<TopContentItem | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<DetailedPerformanceAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Timezone Name
  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    } catch {
      return "Asia/Kolkata";
    }
  }, []);

  // Fetch Workspace Analytics Data
  const loadAnalyticsData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const authHeader = await getAuthHeader();

      const [
        overviewRes,
        topRes,
        mediaRes,
        tsRes,
        patRes,
        timeRes,
        nextRes,
        provRes,
      ] = await Promise.all([
        fetch(`${apiBase}/api/analytics/overview`, { headers: { ...authHeader } }),
        fetch(
          `${apiBase}/api/analytics/top-performing?sortBy=${selectedSortMetric}&platform=${selectedPlatformFilter}`,
          { headers: { ...authHeader } }
        ),
        fetch(`${apiBase}/api/analytics/media`, { headers: { ...authHeader } }),
        fetch(`${apiBase}/api/analytics/timeseries`, { headers: { ...authHeader } }),
        fetch(`${apiBase}/api/analytics/patterns`, { headers: { ...authHeader } }),
        fetch(`${apiBase}/api/analytics/best-posting-time`, { headers: { ...authHeader } }),
        fetch(`${apiBase}/api/analytics/next-content`, { headers: { ...authHeader } }),
        fetch(`${apiBase}/api/integrations/providers/status`, { headers: { ...authHeader } }),
      ]);

      const [
        overviewJson,
        topJson,
        mediaJson,
        tsJson,
        patJson,
        timeJson,
        nextJson,
        provJson,
      ] = await Promise.all([
        overviewRes.json(),
        topRes.json(),
        mediaRes.json(),
        tsRes.json(),
        patRes.json(),
        timeRes.json(),
        nextRes.json(),
        provRes.json(),
      ]);

      if (overviewJson.success && overviewJson.data) setOverview(overviewJson.data);
      if (topJson.success && topJson.data) setTopItems(topJson.data.items || []);
      if (mediaJson.success && mediaJson.data) setMediaList(mediaJson.data || []);
      if (tsJson.success && Array.isArray(tsJson.data)) setTimeseries(tsJson.data || []);
      if (patJson.success && patJson.data) setPatterns(patJson.data || []);
      if (timeJson.success && timeJson.data) setBestTime(timeJson.data || null);
      if (nextJson.success && nextJson.data) setNextContentRecs(nextJson.data || []);
      if (provJson.success && provJson.data) setProvidersStatus(provJson.data || {});
    } catch {
      setErrorMsg("Failed to load analytics data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedSortMetric, selectedPlatformFilter, selectedDateRange]);

  // Determine if workspace has connected analytics data
  const hasAnalyticsData = useMemo(() => {
    if (!overview) return false;
    return (
      overview.publishedCount > 0 ||
      overview.totalImpressions > 0 ||
      overview.totalEngagements > 0 ||
      mediaList.length > 0 ||
      topItems.length > 0
    );
  }, [overview, mediaList, topItems]);

  // Content Format Breakdown (Calculated from real backend media data)
  const formatBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; avgEngRate: number }> = {
      Video: { count: 0, avgEngRate: 0 },
      Image: { count: 0, avgEngRate: 0 },
      Carousel: { count: 0, avgEngRate: 0 },
      Text: { count: 0, avgEngRate: 0 },
      Short: { count: 0, avgEngRate: 0 },
    };

    if (mediaList.length > 0) {
      for (const item of mediaList) {
        const plat = item.platform?.toUpperCase() || "";
        const fmt = plat.includes("YOUTUBE")
          ? "Video"
          : plat.includes("INSTAGRAM")
          ? "Image"
          : plat.includes("TIKTOK")
          ? "Short"
          : plat.includes("LINKEDIN")
          ? "Text"
          : "Carousel";

        if (counts[fmt]) {
          counts[fmt].count += 1;
          counts[fmt].avgEngRate = Math.max(counts[fmt].avgEngRate, item.engagementRate || 0);
        }
      }
    }

    return counts;
  }, [mediaList]);

  // Export Analytics Data as JSON
  const handleExportData = () => {
    try {
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        workspace: "Demo Workspace",
        timezone: userTimezone,
        overview,
        topContent: topItems,
        publishedMedia: mediaList,
        timeseries,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-social-analytics-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setErrorMsg("Failed to export analytics data.");
    }
  };

  // Helper Platform Icon Mapper
  const renderPlatformIcon = (platformStr: string) => {
    const p = platformStr.toUpperCase();
    if (p.includes("YOUTUBE")) return <Tv className="w-4 h-4 text-[#D4AF37]" />;
    if (p.includes("INSTAGRAM")) return <ImageIcon className="w-4 h-4 text-[#D4AF37]" />;
    if (p.includes("TIKTOK")) return <Video className="w-4 h-4 text-[#D4AF37]" />;
    if (p.includes("LINKEDIN")) return <FileText className="w-4 h-4 text-[#D4AF37]" />;
    if (p.includes("X") || p.includes("TWITTER")) return <Share2 className="w-4 h-4 text-[#D4AF37]" />;
    return <Layers className="w-4 h-4 text-[#D4AF37]" />;
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#F5F4F0] p-4 sm:p-6 lg:p-8 space-y-6 font-sans selection:bg-[#D4AF37]/30">
      {/* 1. TOP HEADER */}
      <header className="border-b border-white/[0.08] pb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20">
              AI SOCIAL MEDIA STUDIO
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F4F0]">
            Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#9E9D98] mt-0.5">
            Understand what is working across your connected channels.
          </p>
        </div>

        {/* Right Header Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 font-mono text-xs">
          {/* Workspace Selector */}
          <div className="px-3 py-1.5 rounded-xl bg-[#151618] border border-white/[0.08] text-[#F5F4F0] flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="font-bold">Demo Workspace</span>
          </div>

          {/* Help Link */}
          <Link
            href="/help"
            className="p-2 rounded-xl bg-[#151618] border border-white/[0.08] text-[#9E9D98] hover:text-[#F5F4F0] transition-colors"
            title="Help & Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </Link>

          {/* Account Menu Button */}
          <Link
            href="/settings/profile"
            className="px-3 py-1.5 rounded-xl bg-[#151618] border border-white/[0.08] text-[#F5F4F0] hover:border-[#D4AF37]/40 transition-all flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Account</span>
          </Link>
        </div>
      </header>

      {/* 2. ANALYTICS TOOLBAR */}
      <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 font-mono text-xs">
        {/* Left: Platform & Date Range Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Platform Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#9E9D98] uppercase">Platform:</span>
            <select
              value={selectedPlatformFilter}
              onChange={(e) => setSelectedPlatformFilter(e.target.value)}
              className="bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#F5F4F0] focus:border-[#D4AF37]/50 outline-none"
            >
              <option value="ALL">All Platforms</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="TIKTOK">TikTok</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="LINKEDIN">LinkedIn</option>
              <option value="X">X / Twitter</option>
              <option value="THREADS">Threads</option>
              <option value="PINTEREST">Pinterest</option>
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1 bg-[#0B0C0E] border border-white/[0.08] p-1 rounded-xl">
            {[
              { id: "7D", label: "7 Days" },
              { id: "30D", label: "30 Days" },
              { id: "90D", label: "90 Days" },
              { id: "CUSTOM", label: "Custom" },
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => setSelectedDateRange(range.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedDateRange === range.id
                    ? "bg-[#D4AF37] text-[#0B0C0E]"
                    : "text-[#9E9D98] hover:text-[#F5F4F0]"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions (Refresh & Export) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => loadAnalyticsData(true)}
            disabled={isRefreshing}
            className="px-3.5 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-[#F5F4F0] hover:border-[#D4AF37]/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportData}
            className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] text-[#0B0C0E] font-bold hover:opacity-95 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. EMPTY / UNCONNECTED WORKSPACE STATE */}
      {!isLoading && !hasAnalyticsData && (
        <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto my-6">
          <BarChart3 className="w-12 h-12 text-[#9E9D98] mx-auto opacity-40" />
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#F5F4F0]">No analytics data yet</h2>
            <p className="text-xs text-[#9E9D98] font-mono">
              Connect your social channels to start tracking performance across your content.
            </p>
          </div>
          <Link
            href="/settings/social-accounts"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0B0C0E] font-bold text-xs hover:opacity-95 transition-all inline-flex items-center gap-2"
          >
            <Globe className="w-4 h-4" />
            <span>Connect Channels</span>
          </Link>
        </div>
      )}

      {/* 4. AI PERFORMANCE INSIGHTS SECTION */}
      <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#D4AF37]">
          <Sparkles className="w-4 h-4" />
          <span>AI PERFORMANCE INSIGHTS</span>
        </div>

        {hasAnalyticsData && (patterns.length > 0 || nextContentRecs.length > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {patterns.slice(0, 2).map((pat, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-[#0B0C0E] border border-white/[0.06] space-y-1 text-xs">
                <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase">{pat.dimension}</span>
                <p className="text-[#F5F4F0] font-semibold">{pat.patternObservation}</p>
                <p className="text-[11px] text-[#9E9D98] italic font-serif">
                  Confidence: {pat.confidence} ({pat.performanceMultiplier}x performance)
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#9E9D98] font-mono italic">
            Connect your social channels to unlock AI-powered performance insights.
          </p>
        )}
      </div>

      {/* 5. KPI OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          {
            label: "Total Reach / Views",
            value: overview && overview.totalReach > 0 ? overview.totalReach.toLocaleString() : "No data yet",
          },
          {
            label: "Engagement",
            value: overview && overview.totalEngagements > 0 ? overview.totalEngagements.toLocaleString() : "No data yet",
          },
          {
            label: "Engagement Rate",
            value: overview && overview.averageEngagementRate > 0 ? `${overview.averageEngagementRate}%` : "No data yet",
          },
          {
            label: "Followers",
            value: overview && overview.followerGrowth > 0 ? overview.followerGrowth.toLocaleString() : "No data yet",
          },
          {
            label: "Published",
            value: overview ? overview.publishedCount.toString() : "No data yet",
          },
          {
            label: "Scheduled",
            value: hasAnalyticsData ? "Active" : "No data yet",
          },
          {
            label: "Watch Time",
            value: "No data yet",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#151618] border border-white/[0.08] p-3.5 rounded-2xl space-y-1">
            <span className="text-[10px] font-mono text-[#9E9D98] uppercase block">{kpi.label}</span>
            <span className="text-sm sm:text-base font-mono font-bold text-[#F5F4F0] block truncate">
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

      {/* 6. PERFORMANCE OVER TIME CHART */}
      <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div>
            <h3 className="text-sm font-bold font-mono text-[#F5F4F0]">Performance Over Time</h3>
            <p className="text-[11px] text-[#9E9D98] font-mono">Real-time performance trend metrics</p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex items-center gap-1 bg-[#0B0C0E] border border-white/[0.08] p-1 rounded-xl font-mono text-xs">
            {(["views", "reach", "engagement", "followers", "watchTime"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setChartMetric(m)}
                className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-all ${
                  chartMetric === m
                    ? "bg-[#D4AF37] text-[#0B0C0E]"
                    : "text-[#9E9D98] hover:text-[#F5F4F0]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Chart View Representation */}
        {timeseries.length > 0 ? (
          <div className="h-48 flex items-end justify-between gap-2 pt-4 border-b border-white/[0.06]">
            {timeseries.map((pt, idx) => {
              const heightPct = Math.min(100, Math.max(15, (pt.impressions / 8000) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[24px] bg-[#D4AF37]/30 group-hover:bg-[#D4AF37] rounded-t-md transition-all"
                  />
                  <span className="text-[9px] font-mono text-[#9E9D98] truncate w-full text-center">
                    {pt.date.split("-").slice(1).join("/")}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-36 flex items-center justify-center border border-dashed border-white/[0.08] rounded-2xl text-xs font-mono text-[#9E9D98]">
            No timeseries chart snapshot data recorded yet.
          </div>
        )}
      </div>

      {/* 7. PLATFORM PERFORMANCE COMPARISON */}
      <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 space-y-4">
        <h3 className="text-sm font-bold font-mono text-[#F5F4F0]">Platform Performance</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: "youtube", name: "YouTube" },
            { id: "instagram", name: "Instagram" },
            { id: "tiktok", name: "TikTok" },
            { id: "linkedin", name: "LinkedIn" },
            { id: "x", name: "X (Twitter)" },
            { id: "facebook", name: "Facebook" },
            { id: "threads", name: "Threads" },
            { id: "pinterest", name: "Pinterest" },
          ].map((p) => {
            const isReady = providersStatus[p.id]?.ready || false;
            const count = overview?.platformBreakdown[p.name.toUpperCase()] || 0;

            return (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-[#0B0C0E] border border-white/[0.06] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {renderPlatformIcon(p.name)}
                  <div>
                    <h4 className="text-xs font-bold text-[#F5F4F0]">{p.name}</h4>
                    <p className="text-[10px] font-mono text-[#9E9D98]">
                      {count > 0 ? `${count} posts` : "No activity"}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                    isReady
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/5 text-[#9E9D98] border border-white/10"
                  }`}
                >
                  {isReady ? "CONNECTED" : "Not connected"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 8. TOP PERFORMING CONTENT & FORMAT ANALYSIS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performing Content (2 cols) */}
        <div className="lg:col-span-2 bg-[#151618] border border-white/[0.08] rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-bold font-mono text-[#F5F4F0]">Top Performing Content</h3>
            <span className="text-xs font-mono text-[#9E9D98]">{topItems.length} items</span>
          </div>

          {topItems.length === 0 ? (
            <p className="text-xs font-mono text-[#9E9D98] text-center py-8">
              No published performance data yet.
            </p>
          ) : (
            <div className="space-y-3">
              {topItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#0B0C0E] border border-white/[0.08] hover:border-[#D4AF37]/40 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 truncate">
                    {renderPlatformIcon(item.platform)}
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-[#F5F4F0] truncate">{item.title || item.topic}</h4>
                      <p className="text-[10px] text-[#9E9D98] font-mono">
                        {item.platform} • {item.contentType || item.format}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                    <span className="text-[#D4AF37] font-bold">{item.metrics.engagementRate}% Eng</span>
                    <button
                      onClick={() => setAnalysisModalItem(item)}
                      className="px-3 py-1 rounded-xl bg-[#151618] border border-white/10 text-xs text-[#F5F4F0] hover:bg-white/5"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Format Analysis (1 col) */}
        <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold font-mono text-[#F5F4F0]">Content Format Analysis</h3>

          <div className="space-y-3">
            {Object.entries(formatBreakdown).map(([fmt, data]) => (
              <div key={fmt} className="p-3.5 rounded-2xl bg-[#0B0C0E] border border-white/[0.06] space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="font-bold text-[#F5F4F0]">{fmt}</span>
                  <span className="text-[#D4AF37]">{data.count} published</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, data.count * 20)}%` }}
                    className="bg-[#D4AF37] h-full rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
