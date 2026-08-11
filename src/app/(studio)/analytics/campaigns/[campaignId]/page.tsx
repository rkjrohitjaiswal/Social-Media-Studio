"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";

interface CampaignAnalyticsInfo {
  campaignId: string;
  totalPosts: number;
  totalReach: number;
  totalImpressions: number;
  avgEngagementRate: number;
}

export default function CampaignAnalyticsDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = use(params);
  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState<CampaignAnalyticsInfo | null>(null);

  useEffect(() => {
    async function loadCampaign() {
      try {
        const res = await fetch(`/api/analytics/campaigns`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const found = json.data.find((c: CampaignAnalyticsInfo) => c.campaignId === campaignId);
          setCampaignData(found || null);
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    loadCampaign();
  }, [campaignId]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono text-[#9e9d98]">Loading campaign analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <Link
          href="/analytics"
          className="inline-flex items-center gap-2 text-xs font-mono text-[#9e9d98] hover:text-[#c5a059] transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Analytics
        </Link>
        <span className="text-xs font-mono text-[#c5a059] font-bold uppercase tracking-wider">
          Campaign Performance Detail
        </span>
      </div>

      {!campaignData ? (
        <div className="glass-card p-8 rounded-3xl text-center space-y-3 border border-white/10">
          <Layers className="w-8 h-8 text-[#6b6a65] mx-auto" />
          <h3 className="text-sm font-bold text-[#f5f4f0]">No Campaign Performance Records Found</h3>
          <p className="text-xs text-[#9e9d98]">
            No published posts or metrics have been recorded for Campaign ID: {campaignId}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
            <h2 className="font-serif-luxury text-2xl font-bold text-[#f5f4f0]">
              Campaign Aggregated Insights
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#14161a] border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-[#9e9d98] uppercase">Total Posts</span>
                <div className="text-2xl font-bold font-serif-luxury text-[#f5f4f0]">
                  {campaignData.totalPosts}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#14161a] border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-[#9e9d98] uppercase">Total Reach</span>
                <div className="text-2xl font-bold font-serif-luxury text-[#f5f4f0]">
                  {campaignData.totalReach.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#14161a] border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-[#9e9d98] uppercase">Avg Eng. Rate</span>
                <div className="text-2xl font-bold font-serif-luxury text-[#c5a059]">
                  {campaignData.avgEngagementRate}%
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#14161a] border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-[#9e9d98] uppercase">Total Impressions</span>
                <div className="text-2xl font-bold font-serif-luxury text-[#f5f4f0]">
                  {campaignData.totalImpressions.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
