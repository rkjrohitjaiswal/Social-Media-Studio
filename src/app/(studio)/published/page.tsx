"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Sparkles,
  Calendar,
  Tag,
  MessageSquare,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { InstagramIcon as Instagram } from "@/components/icons/InstagramIcon";
import { PublicationState } from "@/lib/queue/instagram-worker";

interface MediaMetricInfo {
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  engagementRate: number;
}

export default function PublishedPage() {
  const [publications, setPublications] = useState<PublicationState[]>([]);
  const [mediaAnalyticsMap, setMediaAnalyticsMap] = useState<Record<string, MediaMetricInfo>>({});

  useEffect(() => {
    let isMounted = true;
    async function loadPublications() {
      try {
        const res = await fetch("/api/campaigns/demo-campaign-1/publish");
        const json = await res.json();
        if (isMounted && json.success && json.publications) {
          setPublications(json.publications);
        }

        const resMedia = await fetch("/api/analytics/media?limit=50");
        const jsonMedia = await resMedia.json();
        if (isMounted && jsonMedia.success && jsonMedia.data?.items) {
          const map: Record<string, MediaMetricInfo> = {};
          for (const item of jsonMedia.data.items) {
            map[item.publicationId] = item.metrics;
          }
          setMediaAnalyticsMap(map);
        }
      } catch {
        // Ignore load error
      }
    }

    loadPublications();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8 pb-16">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Published Assets Archive</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
            Instagram Publications Gallery
          </h1>
          <p className="text-xs text-[#9e9d98] mt-1">
            Historical record of published campaign assets with real-time performance insights.
          </p>
        </div>

        <Link
          href="/analytics"
          className="px-4 py-2 rounded-xl bg-[#14161a] border border-white/10 text-xs font-mono font-bold text-[#c5a059] hover:bg-[#1c1f26] transition-all flex items-center gap-2 w-fit"
        >
          <BarChart3 className="w-4 h-4 text-[#c5a059]" />
          <span>Full Analytics Command Center</span>
        </Link>
      </div>

      {/* PUBLICATIONS GRID */}
      {publications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publications.map((pub) => {
            const metrics = mediaAnalyticsMap[pub.id];
            return (
              <div key={pub.id} className="glass-card p-6 rounded-3xl space-y-4 border-[#c5a059]/30">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#c5a059]">
                    <Instagram className="w-4 h-4 text-[#c5a059]" />
                    <span>@maisonlumiere_official</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#4e8765]/20 text-[#4e8765] border border-[#4e8765]/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {pub.status}
                  </span>
                </div>

                {/* IMAGE PREVIEW */}
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-[#0b0c0e]">
                  <Image
                    src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop"
                    alt="Published Image"
                    fill
                    className="object-cover"
                  />
                </div>

                {/* PERFORMANCE METRICS OVERLAY IF AVAILABLE */}
                {metrics && (
                  <div className="p-3 rounded-2xl bg-[#0b0c0e] border border-white/10 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div>
                      <span className="text-[9px] text-[#9e9d98] block">Reach</span>
                      <strong className="text-[#f5f4f0]">{metrics.reach.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#9e9d98] block">Saves</span>
                      <strong className="text-[#f5f4f0]">{metrics.saves}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#9e9d98] block">Eng. Rate</span>
                      <strong className="text-[#c5a059]">{metrics.engagementRate}%</strong>
                    </div>
                  </div>
                )}

                {/* CAPTION SNAPSHOT */}
                <div className="space-y-2 text-xs">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9e9d98] flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-[#c5a059]" /> Caption Snapshot
                  </span>
                  <p className="text-[#f5f4f0] bg-[#0b0c0e] p-3 rounded-xl border border-white/10 text-[11px] leading-relaxed line-clamp-3">
                    {pub.captionSnapshot}
                  </p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {pub.hashtagsSnapshot.map((tag, idx) => (
                      <span key={idx} className="text-[10px] font-mono text-[#c5a059] bg-[#1c1f26] px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-0.5">
                        <Tag className="w-2.5 h-2.5" /> #{tag.replace(/^#/, "")}
                      </span>
                    ))}
                  </div>
                </div>

                {/* MEDIA ID & VIEW ANALYTICS BUTTON */}
                <div className="border-t border-white/10 pt-3 flex items-center justify-between text-[11px] text-[#9e9d98]">
                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <Calendar className="w-3 h-3 text-[#c5a059]" />
                    {pub.publishedAt ? new Date(pub.publishedAt).toLocaleDateString() : "Just now"}
                  </span>

                  <Link
                    href={`/analytics/media/${pub.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#c5a059] hover:underline"
                  >
                    View Analytics <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card p-12 rounded-3xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1c1f26] border border-white/10 flex items-center justify-center mx-auto text-[#c5a059]">
            <Instagram className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-[#f5f4f0]">No Published Assets Yet</h2>
          <p className="text-xs text-[#9e9d98] max-w-md mx-auto">
            Once campaign assets are evaluated, copy refined, and approved by the Creative Director, they will appear here after manual publishing.
          </p>
        </div>
      )}
    </div>
  );
}
