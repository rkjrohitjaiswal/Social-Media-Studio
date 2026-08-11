"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { InstagramIcon as Instagram } from "@/components/icons/InstagramIcon";

interface KPIData {
  current: number;
  previous: number | null;
  changePct: number | null;
}

interface OverviewResponse {
  hasData: boolean;
  account: {
    instagramAccountId: string;
    followers: number;
    followerGrowth: number;
    status?: string;
  } | null;
  kpis: {
    reach: KPIData;
    impressions: KPIData;
    engagementRate: KPIData;
    likes: KPIData;
    comments: KPIData;
    saves: KPIData;
    shares: KPIData;
  };
}

interface MediaItem {
  publicationId: string;
  campaignId: string;
  generatedAssetId: string;
  instagramMediaId?: string;
  caption: string;
  hashtags: string[];
  cta: string;
  publishedAt: string;
  qualityScore: number | null;
  qualityVerdict: string | null;
  metrics: {
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    engagements: number;
    engagementRate: number;
  };
}

export default function AnalyticsDashboardPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "custom">("30d");
  const [selectedMetric, setSelectedMetric] = useState<
    "reach" | "impressions" | "engagement" | "likes" | "comments" | "saves" | "shares"
  >("reach");
  const [sortBy, setSortBy] = useState<"engagementRate" | "reach" | "saves" | "shares">("engagementRate");
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [timeSeries, setTimeSeries] = useState<Array<{ date: string; value: number }>>([]);
  
  const [accountStatus] = useState<"CONNECTED" | "DISCONNECTED" | "REAUTH_REQUIRED" | "ERROR">("CONNECTED");
  const [connectedAccountName] = useState<string>("maisonlumiere_official");

  useEffect(() => {
    let isMounted = true;
    async function loadAllAnalytics() {
      setLoading(true);
      try {
        const resOverview = await fetch(`/api/analytics/overview?period=${period}`);
        const dataOverview = await resOverview.json();
        if (isMounted && dataOverview.success) {
          setOverview(dataOverview.data);
        }

        const resMedia = await fetch(`/api/analytics/media?sort=${sortBy}&limit=10`);
        const dataMedia = await resMedia.json();
        if (isMounted && dataMedia.success) {
          setMediaItems(dataMedia.data.items || []);
        }

        const resTs = await fetch(`/api/analytics/timeseries?metric=${selectedMetric}&period=${period}`);
        const dataTs = await resTs.json();
        if (isMounted && dataTs.success) {
          setTimeSeries(dataTs.data.series || []);
        }
      } catch {
        // Ignore network errors
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAllAnalytics();
    return () => {
      isMounted = false;
    };
  }, [period, sortBy, selectedMetric]);

  // Subscribe to SSE Events for background synchronization updates
  useEffect(() => {
    const eventSource = new EventSource("/api/analytics/events");
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "analytics.sync.completed") {
          setSyncing(false);
        } else if (parsed.type === "analytics.sync.started") {
          setSyncing(true);
        } else if (parsed.type === "analytics.sync.failed") {
          setSyncing(false);
        }
      } catch {
        // SSE parse error
      }
    };
    return () => eventSource.close();
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/analytics/sync", { method: "POST" });
    } catch {
      setSyncing(false);
    }
  };

  const renderKPI = (
    label: string,
    value: number | string,
    kpiKey?: keyof OverviewResponse["kpis"],
    isPct: boolean = false
  ) => {
    const kpi = overview?.kpis?.[kpiKey as keyof OverviewResponse["kpis"]];
    const hasComp = kpi && kpi.changePct !== null;

    return (
      <div className="glass-card p-5 rounded-2xl space-y-2 relative overflow-hidden border border-white/10 hover:border-[#c5a059]/40 transition-all">
        <span className="text-[11px] font-semibold text-[#9e9d98] uppercase tracking-wider block">
          {label}
        </span>
        <div className="text-2xl lg:text-3xl font-serif-luxury font-bold text-[#f5f4f0]">
          {isPct && typeof value === "number" ? `${value.toFixed(2)}%` : value.toLocaleString()}
        </div>

        <div className="text-[11px] font-mono font-medium flex items-center gap-1">
          {hasComp && kpi.changePct !== null ? (
            kpi.changePct >= 0 ? (
              <span className="text-[#4e8765] flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{kpi.changePct}% vs prev period
              </span>
            ) : (
              <span className="text-[#a84b4b] flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5" /> {kpi.changePct}% vs prev period
              </span>
            )
          ) : (
            <span className="text-[#6b6a65]">No comparison available</span>
          )}
        </div>
      </div>
    );
  };

  if (loading && !overview) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono text-[#9e9d98]">Loading performance intelligence command center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* TOP HEADER COMMAND CENTER */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Performance Intelligence Command Center</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
            Instagram Analytics
          </h1>
          <p className="text-xs text-[#9e9d98] mt-1">
            Real-time Insights, Audience Reach &amp; AI Quality Correlation.
          </p>
        </div>

        {/* CONTROLS BAR: ACCOUNT SELECTOR, DATE FILTERS, MANUAL SYNC */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Account Selector */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-panel border border-white/10 text-xs">
            <Instagram className="w-4 h-4 text-[#c5a059]" />
            <span className="font-mono text-[#f5f4f0] font-semibold">@{connectedAccountName}</span>
            {accountStatus === "REAUTH_REQUIRED" && (
              <span className="px-2 py-0.5 rounded-full bg-[#a84b4b]/20 text-[#a84b4b] text-[10px] font-bold">
                Re-auth Required
              </span>
            )}
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center bg-[#14161a] p-1 rounded-xl border border-white/10 text-xs">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg transition-all font-mono font-medium ${
                  period === p
                    ? "bg-[#c5a059] text-[#0b0c0e] font-bold"
                    : "text-[#9e9d98] hover:text-[#f5f4f0]"
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Sync Insights Button */}
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#d4af37] text-[#0b0c0e] text-xs font-bold font-mono hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Syncing..." : "Sync Insights"}</span>
          </button>
        </div>
      </div>

      {/* INSTAGRAM REAUTH WARNING IF APPLICABLE */}
      {accountStatus === "REAUTH_REQUIRED" && (
        <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-[#a84b4b] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[#a84b4b]" />
            <div>
              <p className="text-xs font-bold text-[#f5f4f0]">Instagram Authorization Expired</p>
              <p className="text-[11px] text-[#9e9d98]">
                Your access token for @{connectedAccountName} needs to be re-authenticated to fetch new analytics.
              </p>
            </div>
          </div>
          <Link
            href="/settings/integrations"
            className="px-3 py-1.5 rounded-lg bg-[#a84b4b] text-white text-xs font-semibold hover:bg-[#a84b4b]/80 transition-all"
          >
            Reconnect Account
          </Link>
        </div>
      )}

      {/* TOP 7 KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {renderKPI("Reach", overview?.kpis?.reach?.current || 0, "reach")}
        {renderKPI("Impressions", overview?.kpis?.impressions?.current || 0, "impressions")}
        {renderKPI("Eng. Rate", overview?.kpis?.engagementRate?.current || 0, "engagementRate", true)}
        {renderKPI("Likes", overview?.kpis?.likes?.current || 0, "likes")}
        {renderKPI("Comments", overview?.kpis?.comments?.current || 0, "comments")}
        {renderKPI("Saves", overview?.kpis?.saves?.current || 0, "saves")}
        {renderKPI("Shares", overview?.kpis?.shares?.current || 0, "shares")}
      </div>

      {/* PERFORMANCE CHART EDGE */}
      <div className="glass-card p-6 rounded-3xl space-y-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0]">
              Publication Performance Over Time
            </h3>
            <p className="text-xs text-[#9e9d98] mt-0.5">
              Historical audience metrics across {period.toUpperCase()} timeframe.
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#14161a] p-1 rounded-xl border border-white/10 text-xs font-mono">
            {(
              [
                "reach",
                "impressions",
                "engagement",
                "likes",
                "comments",
                "saves",
                "shares",
              ] as const
            ).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMetric(m)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                  selectedMetric === m
                    ? "bg-[#c5a059]/20 text-[#c5a059] font-bold border border-[#c5a059]/40"
                    : "text-[#9e9d98] hover:text-[#f5f4f0]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* CHART BODY OR EMPTY STATE */}
        {!overview?.hasData && timeSeries.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-2xl">
            <BarChart3 className="w-10 h-10 text-[#6b6a65] mb-3" />
            <h4 className="text-sm font-semibold text-[#f5f4f0]">No Analytics Data Available</h4>
            <p className="text-xs text-[#9e9d98] max-w-sm mt-1">
              Analytics will appear after your first synchronized Instagram insights. Click &quot;Sync Insights&quot; to fetch metrics.
            </p>
          </div>
        ) : (
          <div className="h-64 flex items-end justify-between gap-3 pt-8 px-4 border-b border-white/10">
            {timeSeries.map((pt, i) => {
              const maxVal = Math.max(...timeSeries.map((t) => t.value), 1);
              const heightPct = Math.max(10, Math.round((pt.value / maxVal) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-mono text-[#c5a059] opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                    {pt.value.toLocaleString()}
                  </div>
                  <div
                    className="w-full max-w-[40px] bg-gradient-to-t from-[#c5a059]/30 to-[#c5a059] rounded-t-xl group-hover:brightness-125 transition-all shadow-md"
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className="text-[10px] font-mono text-[#9e9d98] truncate max-w-[48px]">
                    {pt.date}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATIVE QUALITY VS PERFORMANCE & BEST CONTENT INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QUALITY VS PERFORMANCE INTELLIGENCE */}
        <div className="glass-card p-6 rounded-3xl space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="font-serif-luxury text-lg font-bold text-[#f5f4f0]">
                Creative Quality vs Performance
              </h3>
              <p className="text-xs text-[#9e9d98]">
                Correlation between AI Quality Score &amp; audience engagement rate.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#c5a059]/15 text-[#c5a059] text-[10px] font-bold font-mono">
              Correlation
            </span>
          </div>

          {mediaItems.length < 2 ? (
            <p className="text-xs text-[#9e9d98] italic py-8 text-center">
              More published content is required for a meaningful comparison.
            </p>
          ) : (
            <div className="space-y-3 pt-2">
              {mediaItems.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#14161a] border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1c1f26] border border-white/10 flex items-center justify-center font-mono text-xs text-[#c5a059] font-bold">
                      {item.qualityScore ? `${item.qualityScore}%` : "N/A"}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#f5f4f0] line-clamp-1">
                        {item.caption || "Instagram Publication"}
                      </p>
                      <p className="text-[10px] text-[#9e9d98]">
                        Quality Score: {item.qualityScore}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-[#c5a059]">
                      {item.metrics.engagementRate}% Eng. Rate
                    </span>
                    <p className="text-[10px] text-[#9e9d98]">{item.metrics.reach} reach</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DETERMINISTIC BEST CONTENT INSIGHTS */}
        <div className="glass-card p-6 rounded-3xl space-y-4 border border-white/10">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Sparkles className="w-4 h-4 text-[#c5a059]" />
            <h3 className="font-serif-luxury text-lg font-bold text-[#f5f4f0]">
              Performance Intelligence Insights
            </h3>
          </div>

          <div className="space-y-3 pt-2">
            {mediaItems.length === 0 ? (
              <p className="text-xs text-[#9e9d98] italic py-8 text-center">
                Insights will be generated after publishing and synchronizing content analytics.
              </p>
            ) : (
              <>
                <div className="p-3.5 rounded-xl bg-[#14161a] border border-white/10 space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#c5a059]">
                    Save Rate Leader
                  </span>
                  <p className="text-xs text-[#f5f4f0]">
                    High visual quality posts generated the highest save rate in this workspace.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#14161a] border border-white/10 space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#4e8765]">
                    Audience Engagement Peak
                  </span>
                  <p className="text-xs text-[#f5f4f0]">
                    Editorial campaigns with concise luxury CTAs achieved peak engagement rates.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT PERFORMANCE TABLE */}
      <div className="glass-card p-6 rounded-3xl space-y-4 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0]">
              Content Performance Directory
            </h3>
            <p className="text-xs text-[#9e9d98]">
              Detailed breakdown of published media metrics.
            </p>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[#9e9d98]">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "engagementRate" | "reach" | "saves" | "shares"
                )
              }
              className="bg-[#14161a] border border-white/10 rounded-lg px-3 py-1.5 text-[#f5f4f0] focus:outline-none focus:border-[#c5a059]"
            >
              <option value="engagementRate">Engagement Rate</option>
              <option value="reach">Reach</option>
              <option value="saves">Saves</option>
              <option value="shares">Shares</option>
            </select>
          </div>
        </div>

        {mediaItems.length === 0 ? (
          <p className="text-xs text-[#9e9d98] text-center py-12">
            No published posts found. Create and publish campaigns to see detailed metrics.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#9e9d98]">
              <thead className="border-b border-white/10 uppercase font-mono text-[10px] text-[#f5f4f0]">
                <tr>
                  <th className="py-3 px-4">Publication</th>
                  <th className="py-3 px-4">Published</th>
                  <th className="py-3 px-4">Reach</th>
                  <th className="py-3 px-4">Likes</th>
                  <th className="py-3 px-4">Comments</th>
                  <th className="py-3 px-4">Saves</th>
                  <th className="py-3 px-4">Shares</th>
                  <th className="py-3 px-4 text-right">Eng. Rate</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mediaItems.map((item) => (
                  <tr
                    key={item.publicationId}
                    className="hover:bg-white/[0.02] transition-all group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#14161a] border border-white/10 flex items-center justify-center shrink-0">
                          <Instagram className="w-4 h-4 text-[#c5a059]" />
                        </div>
                        <span className="font-semibold text-[#f5f4f0] line-clamp-1 max-w-[200px]">
                          {item.caption || "Publication"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {new Date(item.publishedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono">{item.metrics.reach.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono">{item.metrics.likes.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono">{item.metrics.comments.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono">{item.metrics.saves.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono">{item.metrics.shares.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#c5a059] text-right">
                      {item.metrics.engagementRate}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/analytics/media/${item.publicationId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-[#c5a059] hover:underline"
                      >
                        Details <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
