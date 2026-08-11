"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { InstagramIcon as Instagram } from "@/components/icons/InstagramIcon";

interface MediaDetailResponse {
  publication: {
    id: string;
    instagramMediaId?: string;
    captionSnapshot: string;
    ctaSnapshot?: string;
    hashtagsSnapshot?: string[];
    publishedAt?: string;
  };
  latestMetrics?: {
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    engagements: number;
    engagementRate: number;
  };
  qualityAssessment?: {
    overallScore: number;
    brandConsistencyScore: number;
    compositionScore: number;
    lightingScore: number;
    productFidelityScore: number;
    technicalQualityScore: number;
    referenceSimilarityScore: number;
  };
}

export default function MediaAnalyticsDetailPage({
  params,
}: {
  params: Promise<{ mediaId: string }>;
}) {
  const { mediaId } = use(params);

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<MediaDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDetail() {
      try {
        const res = await fetch(`/api/analytics/media/${mediaId}`);
        const json = await res.json();
        if (json.success) {
          setDetail(json.data);
        } else {
          setError(json.error || "Failed to load media detail");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load media detail");
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [mediaId]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono text-[#9e9d98]">Loading media analytics detail...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="py-16 text-center space-y-4 glass-card p-8 rounded-3xl border border-white/10">
        <h3 className="text-lg font-bold text-[#f5f4f0]">Media Publication Not Found</h3>
        <p className="text-xs text-[#9e9d98] max-w-sm mx-auto">{error || "Invalid media publication ID"}</p>
        <Link
          href="/analytics"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#14161a] border border-white/10 text-xs font-mono font-bold text-[#c5a059] hover:bg-[#1c1f26] transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Analytics Command Center
        </Link>
      </div>
    );
  }

  const pub = detail.publication;
  const metrics = detail.latestMetrics || {
    reach: 0,
    impressions: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    engagements: 0,
    engagementRate: 0,
  };
  const quality = detail.qualityAssessment;

  return (
    <div className="space-y-8 pb-16">
      {/* NAVIGATION HEADER */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <Link
          href="/analytics"
          className="inline-flex items-center gap-2 text-xs font-mono text-[#9e9d98] hover:text-[#c5a059] transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Analytics Command Center
        </Link>
        <span className="text-xs font-mono text-[#c5a059] font-bold uppercase tracking-wider">
          Media Insight Detail
        </span>
      </div>

      {/* MAIN LAYOUT: MEDIA PREVIEW + KPI HIGHLIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: CAPTION & PUBLICATION SNAPSHOT */}
        <div className="glass-card p-6 rounded-3xl space-y-6 border border-white/10">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 rounded-xl bg-[#14161a] border border-white/10 flex items-center justify-center">
              <Instagram className="w-5 h-5 text-[#c5a059]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#f5f4f0]">Instagram Publication</p>
              <p className="text-[11px] font-mono text-[#9e9d98]">
                ID: {pub.instagramMediaId || pub.id}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-[#c5a059] block mb-1">
                Caption Snapshot
              </span>
              <p className="text-xs text-[#f5f4f0] bg-[#14161a] p-3 rounded-xl border border-white/5 whitespace-pre-wrap">
                {pub.captionSnapshot || "No caption snapshot"}
              </p>
            </div>

            {pub.ctaSnapshot && (
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-[#4e8765] block mb-1">
                  CTA Snapshot
                </span>
                <p className="text-xs text-[#f5f4f0] bg-[#14161a] p-3 rounded-xl border border-white/5">
                  {pub.ctaSnapshot}
                </p>
              </div>
            )}

            {pub.hashtagsSnapshot && pub.hashtagsSnapshot.length > 0 && (
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-[#9e9d98] block mb-1">
                  Hashtags
                </span>
                <div className="flex flex-wrap gap-1.5 bg-[#14161a] p-3 rounded-xl border border-white/5">
                  {pub.hashtagsSnapshot.map((tag: string, i: number) => (
                    <span key={i} className="text-[11px] font-mono text-[#c5a059]">
                      #{tag.replace(/^#/, "")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-[#9e9d98] block mb-1">
                Published At
              </span>
              <p className="text-xs font-mono text-[#f5f4f0]">
                {pub.publishedAt ? new Date(pub.publishedAt).toLocaleString() : "Recently"}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 7 KPI CARDS & QUALITY CORRELATION */}
        <div className="lg:col-span-2 space-y-6">
          {/* KPI CARDS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-semibold text-[#9e9d98] uppercase tracking-wider block">
                Reach
              </span>
              <div className="text-2xl font-serif-luxury font-bold text-[#f5f4f0]">
                {metrics.reach.toLocaleString()}
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-semibold text-[#9e9d98] uppercase tracking-wider block">
                Impressions
              </span>
              <div className="text-2xl font-serif-luxury font-bold text-[#f5f4f0]">
                {metrics.impressions.toLocaleString()}
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-semibold text-[#9e9d98] uppercase tracking-wider block">
                Eng. Rate
              </span>
              <div className="text-2xl font-serif-luxury font-bold text-[#c5a059]">
                {metrics.engagementRate}%
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-semibold text-[#9e9d98] uppercase tracking-wider block">
                Likes
              </span>
              <div className="text-2xl font-serif-luxury font-bold text-[#f5f4f0]">
                {metrics.likes.toLocaleString()}
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-semibold text-[#9e9d98] uppercase tracking-wider block">
                Comments
              </span>
              <div className="text-2xl font-serif-luxury font-bold text-[#f5f4f0]">
                {metrics.comments.toLocaleString()}
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-semibold text-[#9e9d98] uppercase tracking-wider block">
                Saves
              </span>
              <div className="text-2xl font-serif-luxury font-bold text-[#f5f4f0]">
                {metrics.saves.toLocaleString()}
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-semibold text-[#9e9d98] uppercase tracking-wider block">
                Shares
              </span>
              <div className="text-2xl font-serif-luxury font-bold text-[#f5f4f0]">
                {metrics.shares.toLocaleString()}
              </div>
            </div>
          </div>

          {/* AI QUALITY VS PERFORMANCE CORRELATION PANEL */}
          <div className="glass-card p-6 rounded-3xl space-y-4 border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#c5a059]" />
                <h3 className="font-serif-luxury text-lg font-bold text-[#f5f4f0]">
                  AI Quality Breakdown
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#c5a059]/20 text-[#c5a059] text-xs font-bold font-mono">
                Score: {quality?.overallScore || 0}%
              </span>
            </div>

            {quality ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {[
                  { label: "Brand Consistency", val: quality.brandConsistencyScore },
                  { label: "Composition", val: quality.compositionScore },
                  { label: "Lighting", val: quality.lightingScore },
                  { label: "Product Fidelity", val: quality.productFidelityScore },
                  { label: "Technical Quality", val: quality.technicalQualityScore },
                  { label: "Ref Similarity", val: quality.referenceSimilarityScore },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#14161a] border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-[#9e9d98] block">{item.label}</span>
                    <div className="text-sm font-mono font-bold text-[#f5f4f0]">{item.val}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#9e9d98] italic">No AI quality assessment recorded for this asset.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
