"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Globe,
  Trash2,
  TrendingUp,
  Filter,
  CheckSquare,
} from "lucide-react";
import { SocialPlatform } from "@/lib/social-engine/types";
import { ScheduledState } from "@/lib/queue/instagram-scheduler-worker";

interface MediaMetricInfo {
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
}

const PLATFORM_FILTERS: (SocialPlatform | "ALL")[] = [
  "ALL",
  "INSTAGRAM",
  "LINKEDIN",
  "THREADS",
  "PINTEREST",
  "FACEBOOK",
  "TIKTOK",
  "YOUTUBE",
  "X",
  "REDDIT",
  "TELEGRAM",
  "BLUESKY",
];

const MOCK_ACCOUNTS = [
  { id: "all", name: "All Workspace Accounts" },
  { id: "acc-1", name: "Instagram (@tech_account)" },
  { id: "acc-2", name: "Instagram (@affiliate_account)" },
  { id: "acc-3", name: "LinkedIn (Personal Profile)" },
  { id: "acc-4", name: "YouTube (Tech Education)" },
  { id: "acc-5", name: "Pinterest (Tech Board)" },
];

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<"MONTH" | "WEEK" | "LIST">("MONTH");
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | "ALL">("ALL");
  const [selectedAccount, setSelectedAccount] = useState("all");

  const [schedules, setSchedules] = useState<ScheduledState[]>([]);
  const [mediaAnalyticsMap, setMediaAnalyticsMap] = useState<Record<string, MediaMetricInfo>>({});
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledState | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Bulk Scheduling State
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Modal / Form state
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("14:00");
  const [formTimezone, setFormTimezone] = useState("Asia/Kolkata");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadSchedules() {
      try {
        const res = await fetch("/api/campaigns/demo-campaign-1/schedule");
        const json = await res.json();
        if (isMounted && json.success && json.schedules) {
          setSchedules(json.schedules);
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

    loadSchedules();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateSchedule = async () => {
    if (!formDate) return;
    setIsSubmitting(true);
    try {
      const dateTimeStr = `${formDate}T${formTime}:00`;
      const scheduledForUtc = new Date(dateTimeStr).toISOString();

      const res = await fetch("/api/campaigns/demo-campaign-1/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledFor: scheduledForUtc,
          timezone: formTimezone,
          caption: "Luxury Mediterranean Resort Haute Couture",
          hashtags: ["maisonlumiere", "resort2026"],
          cta: "Discover the Mediterranean story.",
        }),
      });

      const json = await res.json();
      if (json.success && json.schedule) {
        setSchedules((prev) => [...prev, json.schedule]);
        setShowScheduleModal(false);
      }
    } catch {
      // Ignore error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSchedule = () => {
    alert(`Bulk scheduling ${selectedBulkIds.length} approved posts with batch spacing!`);
    setSelectedBulkIds([]);
    setShowBulkModal(false);
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    try {
      const res = await fetch(`/api/campaigns/demo-campaign-1/schedule/${scheduleId}/cancel`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success && json.schedule) {
        setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? json.schedule : s)));
        setSelectedSchedule(null);
      }
    } catch {
      // Ignore error
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Universal Social Engine</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
            Multi-Platform Content Calendar
          </h1>
          <p className="text-xs text-[#9e9d98] mt-1">
            Schedule approved multi-platform assets across Instagram, LinkedIn, Pinterest, Threads, YouTube & more.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* VIEW SWITCHER */}
          <div className="bg-[#0b0c0e] border border-white/10 p-1 rounded-2xl flex items-center gap-1">
            {(["MONTH", "WEEK", "LIST"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  viewMode === mode
                    ? "bg-[#c5a059] text-black"
                    : "text-[#9e9d98] hover:text-[#f5f4f0]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#1c1f26] border border-[#c5a059]/40 text-[#c5a059] font-bold text-xs hover:bg-[#c5a059] hover:text-black transition-all flex items-center gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Bulk Schedule</span>
          </button>

          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>Schedule Post</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="glass-card p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#f5f4f0]">
            <Filter className="w-4 h-4 text-[#c5a059]" />
            <span>Calendar Filters</span>
          </div>

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#f5f4f0]"
          >
            {MOCK_ACCOUNTS.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {PLATFORM_FILTERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPlatform(p)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                selectedPlatform === p
                  ? "bg-[#c5a059] text-black"
                  : "bg-[#0b0c0e] text-[#9e9d98] hover:text-[#f5f4f0]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* CALENDAR DISPLAY */}
      {viewMode === "LIST" ? (
        <div className="space-y-4">
          {schedules.map((sched) => (
            <div
              key={sched.id}
              onClick={() => setSelectedSchedule(sched)}
              className="glass-card p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 border-[#c5a059]/30 hover:border-[#c5a059] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-[#0b0c0e]">
                  <Image
                    src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=300&auto=format&fit=crop"
                    alt="Scheduled"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono text-[#c5a059] font-bold">
                    INSTAGRAM • @tech_account
                  </div>
                  <div className="text-xs font-bold text-[#f5f4f0] line-clamp-1">{sched.captionSnapshot}</div>
                  <div className="text-[11px] text-[#9e9d98] flex items-center gap-2">
                    <Clock className="w-3 h-3 text-[#c5a059]" />
                    {new Date(sched.scheduledFor).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/40">
                  {sched.status}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelSchedule(sched.id);
                  }}
                  className="p-2 rounded-xl bg-[#0b0c0e] border border-white/10 text-[#a84b4b]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-6 rounded-3xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 text-xs font-semibold text-[#f5f4f0]">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#c5a059]" />
              <span>August 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1 rounded-lg bg-[#0b0c0e] text-[#9e9d98]"><ChevronLeft className="w-4 h-4" /></button>
              <button className="p-1 rounded-lg bg-[#0b0c0e] text-[#9e9d98]"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-[#9e9d98]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-2 uppercase tracking-wider">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 28 }).map((_, i) => {
              const dayNum = i + 1;
              const daySchedule = schedules.find(
                (s) => new Date(s.scheduledFor).getDate() === dayNum
              );

              return (
                <div
                  key={i}
                  className={`min-h-[100px] p-2 rounded-2xl border transition-all ${
                    daySchedule
                      ? "bg-[#1c1f26] border-[#c5a059]/40 cursor-pointer"
                      : "bg-[#0b0c0e]/50 border-white/5"
                  }`}
                  onClick={() => daySchedule && setSelectedSchedule(daySchedule)}
                >
                  <div className="text-[10px] font-mono text-[#9e9d98] mb-1">{dayNum}</div>
                  {daySchedule && (
                    <div className="space-y-1">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-[#0b0c0e]">
                        <Image
                          src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=200&auto=format&fit=crop"
                          alt="Thumbnail"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="text-[9px] font-bold text-[#c5a059] truncate">
                        {new Date(daySchedule.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BULK SCHEDULING MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl border-[#c5a059]/40 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-[#f5f4f0] uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#c5a059]" />
                Bulk Schedule Approved Posts
              </h3>
              <button onClick={() => setShowBulkModal(false)} className="text-[#9e9d98]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#9e9d98]">
              Batch schedule selected approved posts with automated spacing across your connected channels. Only APPROVED posts will be scheduled.
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-[#0b0c0e] rounded-xl border border-white/10 flex justify-between">
                <span>12 Instagram Posts</span>
                <span className="text-[#4e8765] font-bold">APPROVED</span>
              </div>
              <div className="p-3 bg-[#0b0c0e] rounded-xl border border-white/10 flex justify-between">
                <span>12 LinkedIn Posts</span>
                <span className="text-[#4e8765] font-bold">APPROVED</span>
              </div>
              <div className="p-3 bg-[#0b0c0e] rounded-xl border border-white/10 flex justify-between">
                <span>12 Pinterest Pins</span>
                <span className="text-[#4e8765] font-bold">APPROVED</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 rounded-xl bg-[#1c1f26] text-xs text-[#9e9d98]">
                Cancel
              </button>
              <button onClick={handleBulkSchedule} className="px-5 py-2 rounded-xl bg-[#c5a059] text-black font-bold text-xs">
                Schedule Batch (36 Posts)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE POST MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl border-[#c5a059]/40 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-[#f5f4f0] uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#c5a059]" />
                Schedule Approved Post
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-[#9e9d98]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9e9d98] text-[10px] uppercase mb-1">Select Future Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0]"
                />
              </div>
              <div>
                <label className="block text-[#9e9d98] text-[10px] uppercase mb-1">Select Time</label>
                <input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 rounded-xl bg-[#1c1f26] text-xs text-[#9e9d98]">
                Cancel
              </button>
              <button
                disabled={isSubmitting || !formDate}
                onClick={handleCreateSchedule}
                className="px-5 py-2 rounded-xl bg-[#c5a059] text-black font-bold text-xs disabled:opacity-40"
              >
                {isSubmitting ? "Scheduling..." : "Schedule Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
