"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  BarChart3,
  TrendingUp,
  Eye,
} from "lucide-react";
import { InstagramIcon as Instagram } from "@/components/icons/InstagramIcon";
import { ScheduledState } from "@/lib/queue-types";

interface TopPostItem {
  publicationId: string;
  caption: string;
  metrics: {
    reach: number;
    engagementRate: number;
    saves: number;
  };
}

export default function StudioDashboardPage() {
  const [upcomingSchedules, setUpcomingSchedules] = useState<ScheduledState[]>([]);
  const [analyticsReach, setAnalyticsReach] = useState<number | null>(null);
  const [analyticsEngRate, setAnalyticsEngRate] = useState<number | null>(null);
  const [topPost, setTopPost] = useState<TopPostItem | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadUpcoming() {
      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/campaigns/demo-campaign-1/schedule");
        const json = await res.json();
        if (isMounted && json.success && json.schedules) {
          setUpcomingSchedules(json.schedules);
        }
      } catch {
        // Ignore load error
      }
    }

    async function loadAnalytics() {
      try {
        const resOverview = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/analytics/overview");
        const jsonOverview = await resOverview.json();
        if (isMounted && jsonOverview.success && jsonOverview.data?.hasData) {
          setAnalyticsReach(jsonOverview.data.kpis?.reach?.current || 0);
          setAnalyticsEngRate(jsonOverview.data.kpis?.engagementRate?.current || 0);
        }

        const resMedia = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/analytics/media?sort=engagementRate&limit=1");
        const jsonMedia = await resMedia.json();
        if (isMounted && jsonMedia.success && jsonMedia.data?.items?.length > 0) {
          setTopPost(jsonMedia.data.items[0]);
        }
      } catch {
        // Ignore analytics load error
      }
    }

    loadUpcoming();
    loadAnalytics();

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
            <span>Maison Lumière Studio</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
            Creative &amp; Performance Overview
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/analytics"
            className="px-4 py-2.5 rounded-2xl bg-[#14161a] border border-white/10 text-[#c5a059] font-bold text-xs hover:bg-[#1c1f26] transition-all flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4 text-[#c5a059]" />
            <span>View Analytics</span>
          </Link>

          <Link
            href="/create"
            className="px-5 py-2.5 rounded-2xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 shadow-lg w-fit"
          >
            <Layers className="w-4 h-4 text-black" />
            <span>New Campaign</span>
          </Link>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="glass-card p-6 rounded-3xl space-y-2 border-[#c5a059]/30">
          <div className="text-xs uppercase tracking-wider font-semibold text-[#9e9d98] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#c5a059]" /> Scheduled Posts
          </div>
          <div className="font-serif-luxury text-3xl font-bold text-[#f5f4f0]">
            {upcomingSchedules.filter((s) => s.status === "SCHEDULED").length}
          </div>
          <div className="text-[11px] text-[#c5a059]">Active in queue</div>
        </div>

        <div className="glass-card p-6 rounded-3xl space-y-2 border-[#c5a059]/30">
          <div className="text-xs uppercase tracking-wider font-semibold text-[#9e9d98] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#c5a059]" /> Next Scheduled
          </div>
          <div className="font-serif-luxury text-xl font-bold text-[#f5f4f0] truncate">
            {upcomingSchedules.length > 0
              ? new Date(upcomingSchedules[0].scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "None"}
          </div>
          <div className="text-[11px] text-[#9e9d98]">Automated publishing</div>
        </div>

        {/* REAL STORED ANALYTICS METRICS */}
        <div className="glass-card p-6 rounded-3xl space-y-2 border-[#c5a059]/30">
          <div className="text-xs uppercase tracking-wider font-semibold text-[#9e9d98] flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#c5a059]" /> Total Reach
          </div>
          <div className="font-serif-luxury text-3xl font-bold text-[#f5f4f0]">
            {analyticsReach !== null ? analyticsReach.toLocaleString() : "0"}
          </div>
          <div className="text-[11px] text-[#9e9d98]">Synchronized audience</div>
        </div>

        <div className="glass-card p-6 rounded-3xl space-y-2 border-[#c5a059]/30">
          <div className="text-xs uppercase tracking-wider font-semibold text-[#9e9d98] flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#c5a059]" /> Engagement Rate
          </div>
          <div className="font-serif-luxury text-3xl font-bold text-[#c5a059]">
            {analyticsEngRate !== null ? `${analyticsEngRate}%` : "0.00%"}
          </div>
          <div className="text-[11px] text-[#4e8765]">Measured performance</div>
        </div>

        <div className="glass-card p-6 rounded-3xl space-y-2 border-[#c5a059]/30">
          <div className="text-xs uppercase tracking-wider font-semibold text-[#9e9d98] flex items-center gap-1.5">
            <Instagram className="w-3.5 h-3.5 text-[#c5a059]" /> Channel State
          </div>
          <div className="font-mono text-sm font-bold text-[#c5a059]">@maisonlumiere</div>
          <div className="text-[11px] text-[#4e8765] flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[#4e8765]" /> Professional Account
          </div>
        </div>
      </div>

      {/* TOP PERFORMING POST SECTION */}
      {topPost && (
        <div className="glass-card p-6 rounded-3xl border border-[#c5a059]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-[#c5a059] uppercase tracking-wider">
              Top Performing Publication
            </span>
            <p className="text-sm font-bold text-[#f5f4f0] line-clamp-1">{topPost.caption}</p>
            <div className="flex items-center gap-4 text-xs font-mono text-[#9e9d98]">
              <span>Reach: <strong className="text-[#f5f4f0]">{topPost.metrics.reach.toLocaleString()}</strong></span>
              <span>Eng Rate: <strong className="text-[#c5a059]">{topPost.metrics.engagementRate}%</strong></span>
              <span>Saves: <strong className="text-[#f5f4f0]">{topPost.metrics.saves}</strong></span>
            </div>
          </div>
          <Link
            href={`/analytics/media/${topPost.publicationId}`}
            className="px-4 py-2 rounded-xl bg-[#c5a059]/20 text-[#c5a059] text-xs font-mono font-bold hover:bg-[#c5a059]/30 transition-all shrink-0"
          >
            View Post Analytics &rarr;
          </Link>
        </div>
      )}

      {/* UPCOMING POSTS COMPONENT */}
      <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base font-bold text-[#f5f4f0] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#c5a059]" /> Upcoming Scheduled Posts
            </h2>
            <p className="text-xs text-[#9e9d98] mt-0.5">Automated queue executing via BullMQ scheduler</p>
          </div>

          <Link href="/calendar" className="text-xs font-semibold text-[#c5a059] flex items-center gap-1 hover:underline">
            View Full Calendar <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {upcomingSchedules.length > 0 ? (
          <div className="space-y-4">
            {upcomingSchedules.slice(0, 5).map((sched) => (
              <div key={sched.id} className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-[#14161a]">
                    <Image
                      src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=300&auto=format&fit=crop"
                      alt="Upcoming Thumbnail"
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-[#f5f4f0] line-clamp-1">{sched.captionSnapshot}</div>
                    <div className="text-[11px] text-[#9e9d98] flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[#c5a059]">@maisonlumiere_official</span>
                      <span>•</span>
                      <span>{new Date(sched.scheduledFor).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/40">
                  {sched.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-[#9e9d98]">No upcoming posts scheduled.</div>
        )}
      </div>
    </div>
  );
}
