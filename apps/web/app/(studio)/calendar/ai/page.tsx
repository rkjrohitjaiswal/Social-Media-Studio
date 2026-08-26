"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Share2,
  Copy,
  Check,
  Film,
  Tv,
  Image as ImageIcon,
  Layers,
  FileText,
  Video,
  Send,
  MoreHorizontal,
  ExternalLink,
  Edit3,
  Trash2,
  Play,
  Globe,
} from "lucide-react";
import { CalendarEntryItem } from "@ai-social/shared";
import { getAuthHeader } from "@/lib/api-client";

interface ScheduledPostItem {
  id: string;
  userId?: string;
  workspaceId?: string;
  contentPlanItemId: string;
  platform: string;
  scheduledAt: string;
  status: string;
  createdAt?: string;
}

type ViewMode = "MONTH" | "WEEK" | "DAY" | "LIST";

export default function AiCalendarPage() {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Date Navigation State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("MONTH");

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [contentTypeFilter, setContentTypeFilter] = useState("ALL");
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Data Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [items, setItems] = useState<CalendarEntryItem[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPostItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected Item / Detail Drawer State
  const [selectedItem, setSelectedItem] = useState<CalendarEntryItem | null>(null);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editTopic, setEditTopic] = useState("");
  const [editPlatform, setEditPlatform] = useState("");
  const [editPostingTime, setEditPostingTime] = useState("");

  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [schedulePlatform, setSchedulePlatform] = useState("INSTAGRAM");
  const [scheduleDateStr, setScheduleDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [scheduleTimeStr, setScheduleTimeStr] = useState("10:00");
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // Day Overflow Modal State
  const [overflowDate, setOverflowDate] = useState<{ date: Date; items: CalendarEntryItem[] } | null>(null);

  // Approval Share Link State
  const [isSharingApproval, setIsSharingApproval] = useState(false);
  const [shareApprovalUrl, setShareApprovalUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Timezone Name
  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    } catch {
      return "Asia/Kolkata";
    }
  }, []);

  // Fetch Calendar Plan & Scheduled Posts
  const loadCalendarData = async () => {
    setIsLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const [planRes, schedRes] = await Promise.all([
        fetch(`${apiBase}/api/calendar/plan`, { headers: { ...authHeader } }),
        fetch(`${apiBase}/api/calendar/scheduled`, { headers: { ...authHeader } }),
      ]);
      const planJson = await planRes.json();
      const schedJson = await schedRes.json();

      if (planJson.success && planJson.data) {
        setItems(planJson.data.items || []);
      }
      if (schedJson.success && schedJson.data) {
        setScheduledPosts(schedJson.data || []);
      }
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, []);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (platformFilter !== "ALL") count++;
    if (statusFilter !== "ALL") count++;
    if (contentTypeFilter !== "ALL") count++;
    return count;
  }, [platformFilter, statusFilter, contentTypeFilter]);

  // Date Navigation Handlers
  const handlePrev = () => {
    const nextDate = new Date(currentDate);
    if (viewMode === "MONTH") nextDate.setMonth(nextDate.getMonth() - 1);
    else if (viewMode === "WEEK") nextDate.setDate(nextDate.getDate() - 7);
    else if (viewMode === "DAY") nextDate.setDate(nextDate.getDate() - 1);
    setCurrentDate(nextDate);
  };

  const handleNext = () => {
    const nextDate = new Date(currentDate);
    if (viewMode === "MONTH") nextDate.setMonth(nextDate.getMonth() + 1);
    else if (viewMode === "WEEK") nextDate.setDate(nextDate.getDate() + 7);
    else if (viewMode === "DAY") nextDate.setDate(nextDate.getDate() + 1);
    setCurrentDate(nextDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Dynamic Header Month/Year Text
  const currentMonthYearText = useMemo(() => {
    return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [currentDate]);

  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTopic = item.topic?.toLowerCase().includes(q);
        const matchesHook = item.hook?.toLowerCase().includes(q);
        const matchesPlatform = item.platform?.toLowerCase().includes(q);
        if (!matchesTopic && !matchesHook && !matchesPlatform) return false;
      }
      // Platform
      if (platformFilter !== "ALL" && item.platform?.toUpperCase() !== platformFilter.toUpperCase()) {
        return false;
      }
      // Status
      if (statusFilter !== "ALL" && item.status?.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      // Content Type
      if (contentTypeFilter !== "ALL" && item.contentType?.toLowerCase() !== contentTypeFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [items, searchQuery, platformFilter, statusFilter, contentTypeFilter]);

  // Month Grid Calculation (Sun–Sat)
  const monthGridCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      date: Date;
      dateNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      items: CalendarEntryItem[];
    }> = [];

    const todayStr = new Date().toISOString().split("T")[0];

    // Leading prev month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dNum = totalDaysInPrevMonth - i;
      const d = new Date(year, month - 1, dNum);
      cells.push({
        date: d,
        dateNum: dNum,
        isCurrentMonth: false,
        isToday: d.toISOString().split("T")[0] === todayStr,
        items: [],
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      const dStr = d.toISOString().split("T")[0];
      const dayItems = filteredItems.filter((item) => {
        if (!item.date) return false;
        const itemDStr = new Date(item.date).toISOString().split("T")[0];
        return itemDStr === dStr;
      });

      cells.push({
        date: d,
        dateNum: i,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        items: dayItems,
      });
    }

    // Trailing next month days (fill grid to 35 or 42)
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        dateNum: i,
        isCurrentMonth: false,
        isToday: d.toISOString().split("T")[0] === todayStr,
        items: [],
      });
    }

    return cells;
  }, [currentDate, filteredItems]);

  // Week Grid Calculation (Sun–Sat for active week)
  const weekGridDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay();
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);

    const days = [];
    const todayStr = new Date().toISOString().split("T")[0];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dStr = d.toISOString().split("T")[0];
      const dayItems = filteredItems.filter((item) => {
        if (!item.date) return false;
        return new Date(item.date).toISOString().split("T")[0] === dStr;
      });

      days.push({
        date: d,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dateStr: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isToday: dStr === todayStr,
        items: dayItems,
      });
    }
    return days;
  }, [currentDate, filteredItems]);

  // AI Plan Generation Trigger
  const handleGeneratePlan = async (planType: "SEVEN_DAY" | "THIRTY_DAY") => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${apiBase}/api/calendar/plan/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          planType,
          platforms: ["INSTAGRAM", "YOUTUBE", "LINKEDIN", "TIKTOK"],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to generate AI plan");
      }

      setItems(json.data.items || []);
      setSuccessMsg(`Generated ${planType === "SEVEN_DAY" ? "7-Day" : "30-Day"} AI Content Plan!`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Plan generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  // Schedule Post Action Handler
  const handleSchedulePost = async () => {
    if (!selectedItem || !selectedItem.id) return;
    setIsSubmittingSchedule(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const isoDateTime = new Date(`${scheduleDateStr}T${scheduleTimeStr}:00`).toISOString();

      const res = await fetch(`${apiBase}/api/calendar/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          contentPlanItemId: selectedItem.id,
          platform: schedulePlatform,
          scheduledAt: isoDateTime,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to schedule post.");
      }

      setSuccessMsg(`Post scheduled for ${schedulePlatform} on ${scheduleDateStr} at ${scheduleTimeStr}!`);
      setIsScheduleModalOpen(false);
      await loadCalendarData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Scheduling failed");
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  // Update Item (Status / Topic)
  const handleUpdateItem = async (newStatus?: string) => {
    if (!selectedItem || !selectedItem.id) return;
    try {
      const authHeader = await getAuthHeader();
      const payload: any = {};
      if (newStatus) payload.status = newStatus;
      if (editTopic) payload.topic = editTopic;
      if (editPlatform) payload.platform = editPlatform;
      if (editPostingTime) payload.suggestedPostingTime = editPostingTime;

      const res = await fetch(`${apiBase}/api/calendar/plan/item/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setItems((prev) =>
          prev.map((i) => (i.id === selectedItem.id ? { ...i, ...payload } : i))
        );
        setSelectedItem((prev) => (prev ? { ...prev, ...payload } : null));
        setIsEditingItem(false);
        setSuccessMsg("Calendar item updated.");
      }
    } catch {
      setErrorMsg("Failed to update item.");
    }
  };

  // Trigger Manual Publishing ("Publish Now")
  const handlePublishNow = async () => {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${apiBase}/api/publishing/execute-due`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg("Published due items successfully!");
        if (selectedItem) handleUpdateItem("PUBLISHED");
      }
    } catch {
      setErrorMsg("Publishing execution failed.");
    }
  };

  // Share Client Approval Link
  const handleShareApprovalLink = async (item: CalendarEntryItem) => {
    setIsSharingApproval(true);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${apiBase}/api/approvals/demo-workspace-1/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          workspaceId: "demo-workspace-1",
          contentTitle: item.topic,
          caption: item.hook,
          platform: item.platform || "INSTAGRAM",
          contentPlanItemId: item.id,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const fullUrl = `${window.location.origin}${json.data.clientApprovalUrl}`;
        setShareApprovalUrl(fullUrl);
      }
    } catch {
      // Fallback approval URL
      setShareApprovalUrl(`${window.location.origin}/approvals/demo-workspace-1`);
    } finally {
      setIsSharingApproval(false);
    }
  };

  // Helper Platform Icon Mapper
  const renderPlatformIcon = (platformStr: string) => {
    const p = platformStr.toUpperCase();
    if (p.includes("YOUTUBE")) return <Tv className="w-3.5 h-3.5 text-[#D4AF37]" />;
    if (p.includes("INSTAGRAM")) return <ImageIcon className="w-3.5 h-3.5 text-[#D4AF37]" />;
    if (p.includes("TIKTOK")) return <Video className="w-3.5 h-3.5 text-[#D4AF37]" />;
    if (p.includes("LINKEDIN")) return <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />;
    if (p.includes("X") || p.includes("TWITTER")) return <Share2 className="w-3.5 h-3.5 text-[#D4AF37]" />;
    return <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />;
  };

  // Helper Status Badge Mapper
  const renderStatusBadge = (statusStr: string) => {
    const s = statusStr.toUpperCase();
    if (s === "PUBLISHED") {
      return (
        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          PUBLISHED
        </span>
      );
    }
    if (s === "SCHEDULED") {
      return (
        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
          SCHEDULED
        </span>
      );
    }
    if (s === "APPROVED") {
      return (
        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          APPROVED
        </span>
      );
    }
    if (s === "FAILED") {
      return (
        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          FAILED
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white/10 text-[#9E9D98] border border-white/10">
        DRAFT
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#F5F4F0] p-4 sm:p-6 lg:p-8 space-y-6 font-sans selection:bg-[#D4AF37]/30">
      {/* 1. HEADER & TOP TOOLBAR */}
      <header className="border-b border-white/[0.08] pb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20">
              AI SOCIAL MEDIA STUDIO
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F4F0]">
            Content Calendar
          </h1>
          <p className="text-xs sm:text-sm text-[#9E9D98] mt-0.5">
            Plan, schedule and manage everything you publish.
          </p>
        </div>

        {/* Right Action Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9E9D98] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search content..."
              className="bg-[#151618] border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#F5F4F0] focus:border-[#D4AF37]/50 outline-none w-36 sm:w-48 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9E9D98] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Popover Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterPopover(!showFilterPopover)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors ${
                activeFilterCount > 0
                  ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]"
                  : "bg-[#151618] border-white/[0.08] text-[#9E9D98] hover:text-[#F5F4F0]"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#D4AF37] text-[#0B0C0E] text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter Popover Dropdown */}
            {showFilterPopover && (
              <div className="absolute right-0 mt-2 w-64 bg-[#151618] border border-white/10 rounded-2xl p-4 shadow-2xl z-40 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 font-mono font-bold text-[#F5F4F0]">
                  <span>Filter Calendar</span>
                  <button
                    onClick={() => {
                      setPlatformFilter("ALL");
                      setStatusFilter("ALL");
                      setContentTypeFilter("ALL");
                    }}
                    className="text-[10px] text-[#D4AF37] hover:underline"
                  >
                    Reset All
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#9E9D98] mb-1">Platform</label>
                  <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-[#F5F4F0] font-mono"
                  >
                    <option value="ALL">All Platforms</option>
                    <option value="YOUTUBE">YouTube</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="TIKTOK">TikTok</option>
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="X">X / Twitter</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="PINTEREST">Pinterest</option>
                    <option value="THREADS">Threads</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#9E9D98] mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-[#F5F4F0] font-mono"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="APPROVED">Approved</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#9E9D98] mb-1">Content Format</label>
                  <select
                    value={contentTypeFilter}
                    onChange={(e) => setContentTypeFilter(e.target.value)}
                    className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-[#F5F4F0] font-mono"
                  >
                    <option value="ALL">All Formats</option>
                    <option value="Video">Video</option>
                    <option value="Short">Short / Reel</option>
                    <option value="Carousel">Carousel</option>
                    <option value="Post">Post</option>
                    <option value="Thread">Thread</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Schedule Content CTA */}
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0B0C0E] font-bold text-xs hover:opacity-95 transition-all shadow-sm shadow-[#D4AF37]/10 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Schedule Content</span>
          </button>
        </div>
      </header>

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
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. CALENDAR CONTROL BAR (NAV + VIEW SWITCHER + PLANNER) */}
      <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Date Nav Controls + Dynamic Month Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#0B0C0E] border border-white/[0.08] p-1 rounded-xl">
            <button
              onClick={handlePrev}
              className="p-1 rounded-lg text-[#9E9D98] hover:text-[#F5F4F0] hover:bg-white/5 transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-[#D4AF37] hover:bg-white/5 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1 rounded-lg text-[#9E9D98] hover:text-[#F5F4F0] hover:bg-white/5 transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-bold font-mono text-[#F5F4F0] tracking-tight">
            {currentMonthYearText}
          </h2>
        </div>

        {/* Center: View Switcher */}
        <div className="flex items-center gap-1 bg-[#0B0C0E] border border-white/[0.08] p-1 rounded-xl font-mono text-xs">
          {(["MONTH", "WEEK", "DAY", "LIST"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                viewMode === mode
                  ? "bg-[#D4AF37] text-[#0B0C0E] shadow-sm shadow-[#D4AF37]/20"
                  : "text-[#9E9D98] hover:text-[#F5F4F0]"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Right: AI Plan Generator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleGeneratePlan("SEVEN_DAY")}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/[0.08] text-xs font-mono text-[#F5F4F0] hover:border-[#D4AF37]/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" /> : <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />}
            <span>Generate 7-Day Plan</span>
          </button>
        </div>
      </div>

      {/* 3. CALENDAR VIEWS CONTAINER */}
      {isLoading ? (
        <div className="py-24 text-center space-y-3 bg-[#151618] border border-white/[0.08] rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto" />
          <p className="text-xs font-mono text-[#9E9D98]">Loading Content Calendar...</p>
        </div>
      ) : items.length === 0 && scheduledPosts.length === 0 ? (
        /* Empty State */
        <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto my-8">
          <CalendarIcon className="w-12 h-12 text-[#9E9D98] mx-auto opacity-40" />
          <h3 className="text-base font-bold text-[#F5F4F0]">No content scheduled</h3>
          <p className="text-xs text-[#9E9D98] font-mono">
            Schedule your first piece of content to start building your publishing calendar.
          </p>
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold font-mono hover:opacity-95 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Schedule Content</span>
          </button>
        </div>
      ) : (
        /* VIEW 1: MONTH VIEW (7-COLUMN GRID) */
        viewMode === "MONTH" && (
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-3 sm:p-4 space-y-2 overflow-x-auto no-scrollbar">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] font-bold text-[#9E9D98] pb-2 border-b border-white/[0.06] min-w-[700px]">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* 35/42 Grid Cells */}
            <div className="grid grid-cols-7 gap-1.5 min-w-[700px]">
              {monthGridCells.map((cell, idx) => (
                <div
                  key={idx}
                  className={`min-h-[110px] p-1.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    cell.isCurrentMonth
                      ? cell.isToday
                        ? "bg-[#D4AF37]/10 border-[#D4AF37] shadow-sm shadow-[#D4AF37]/5"
                        : "bg-[#0B0C0E] border-white/[0.06] hover:border-white/20"
                      : "bg-[#0B0C0E]/40 border-white/[0.03] opacity-40"
                  }`}
                >
                  {/* Cell Header */}
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        cell.isToday
                          ? "bg-[#D4AF37] text-[#0B0C0E]"
                          : cell.isCurrentMonth
                          ? "text-[#F5F4F0]"
                          : "text-[#9E9D98]"
                      }`}
                    >
                      {cell.dateNum}
                    </span>
                    {cell.items.length > 0 && (
                      <span className="text-[9px] text-[#9E9D98]">{cell.items.length} item{cell.items.length > 1 ? "s" : ""}</span>
                    )}
                  </div>

                  {/* Item Cards inside cell */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {cell.items.slice(0, 2).map((item) => (
                      <div
                        key={item.id || item.topic}
                        onClick={() => setSelectedItem(item)}
                        className="p-1.5 rounded-xl bg-[#151618] border border-white/[0.08] hover:border-[#D4AF37]/50 transition-all cursor-pointer truncate space-y-0.5 group"
                      >
                        <div className="flex items-center justify-between text-[9px] font-mono">
                          <span className="flex items-center gap-1 text-[#D4AF37] font-bold truncate">
                            {renderPlatformIcon(item.platform)}
                            <span className="truncate">{item.suggestedPostingTime || "10:00"}</span>
                          </span>
                          {renderStatusBadge(item.status)}
                        </div>
                        <p className="text-[10px] font-bold text-[#F5F4F0] truncate group-hover:text-[#D4AF37]">
                          {item.topic}
                        </p>
                      </div>
                    ))}

                    {cell.items.length > 2 && (
                      <button
                        onClick={() => setOverflowDate({ date: cell.date, items: cell.items })}
                        className="w-full text-center text-[10px] font-mono text-[#D4AF37] hover:underline font-bold py-0.5"
                      >
                        +{cell.items.length - 2} more
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* VIEW 2: WEEK VIEW */}
      {viewMode === "WEEK" && !isLoading && (
        <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-4 space-y-3 overflow-x-auto no-scrollbar">
          <div className="grid grid-cols-7 gap-2 min-w-[800px]">
            {weekGridDays.map((day, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl border min-h-[300px] flex flex-col justify-between ${
                  day.isToday
                    ? "bg-[#D4AF37]/10 border-[#D4AF37]"
                    : "bg-[#0B0C0E] border-white/[0.06]"
                }`}
              >
                <div className="border-b border-white/[0.06] pb-2 mb-2 text-center">
                  <span className="text-[10px] font-mono text-[#9E9D98] uppercase block">{day.dayName}</span>
                  <span className={`text-xs font-mono font-bold ${day.isToday ? "text-[#D4AF37]" : "text-[#F5F4F0]"}`}>
                    {day.dateStr}
                  </span>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto">
                  {day.items.length === 0 ? (
                    <p className="text-[10px] font-mono text-[#9E9D98]/40 text-center py-4">No posts</p>
                  ) : (
                    day.items.map((item) => (
                      <div
                        key={item.id || item.topic}
                        onClick={() => setSelectedItem(item)}
                        className="p-2 rounded-xl bg-[#151618] border border-white/[0.08] hover:border-[#D4AF37]/50 transition-all cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between text-[9px] font-mono">
                          <span className="text-[#D4AF37] font-bold">{item.platform}</span>
                          {renderStatusBadge(item.status)}
                        </div>
                        <h4 className="text-xs font-bold text-[#F5F4F0] line-clamp-2">{item.topic}</h4>
                        <p className="text-[10px] text-[#9E9D98] font-mono">{item.suggestedPostingTime || "10:00 AM"}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: DAY VIEW */}
      {viewMode === "DAY" && !isLoading && (
        <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-bold font-mono text-[#D4AF37]">
              Day Schedule: {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
            </h3>
            <span className="text-xs font-mono text-[#9E9D98]">Timezone: {userTimezone}</span>
          </div>

          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <p className="text-xs font-mono text-[#9E9D98] text-center py-8">No content items scheduled for this day view.</p>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id || item.topic}
                  onClick={() => setSelectedItem(item)}
                  className="p-4 rounded-2xl bg-[#0B0C0E] border border-white/[0.08] hover:border-[#D4AF37]/50 transition-all cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#151618] border border-white/10 flex items-center justify-center text-[#D4AF37]">
                      {renderPlatformIcon(item.platform)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase">{item.platform}</span>
                        <span className="text-[10px] font-mono text-[#9E9D98]">• {item.suggestedPostingTime || "10:00 AM"}</span>
                      </div>
                      <h4 className="text-xs font-bold text-[#F5F4F0]">{item.topic}</h4>
                    </div>
                  </div>
                  {renderStatusBadge(item.status)}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: LIST VIEW */}
      {viewMode === "LIST" && !isLoading && (
        <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 text-xs font-mono font-bold text-[#9E9D98]">
            <span>CONTENT TITLE / TOPIC</span>
            <span>PLATFORM & TIME</span>
            <span>STATUS</span>
          </div>

          <div className="space-y-2">
            {filteredItems.map((item) => (
              <div
                key={item.id || item.topic}
                onClick={() => setSelectedItem(item)}
                className="p-3.5 rounded-2xl bg-[#0B0C0E] border border-white/[0.08] hover:border-[#D4AF37]/50 transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 truncate">
                  {renderPlatformIcon(item.platform)}
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-[#F5F4F0] truncate">{item.topic}</h4>
                    <p className="text-[10px] text-[#9E9D98] font-mono">{item.hook}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-[#9E9D98] shrink-0">
                  <span>{item.platform} • {item.suggestedPostingTime || "10:00 AM"}</span>
                  {renderStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAIL MODAL / INSPECTOR DRAWER */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-xl w-full space-y-5 max-h-[85vh] overflow-y-auto relative">
            <button
              onClick={() => {
                setSelectedItem(null);
                setIsEditingItem(false);
              }}
              className="absolute top-6 right-6 text-[#9E9D98] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20">
                  {selectedItem.platform} • {selectedItem.contentType}
                </span>
                {renderStatusBadge(selectedItem.status)}
              </div>
              <h3 className="text-lg font-bold text-[#F5F4F0]">{selectedItem.topic}</h3>
            </div>

            {/* Editing mode or detail view */}
            {isEditingItem ? (
              <div className="space-y-3 bg-[#0B0C0E] p-4 rounded-2xl border border-white/[0.08]">
                <h4 className="text-xs font-mono font-bold text-[#D4AF37]">Edit Calendar Item</h4>
                <div>
                  <label className="text-[10px] font-mono text-[#9E9D98]">Topic / Title</label>
                  <input
                    type="text"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    className="w-full bg-[#151618] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#F5F4F0]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-[#9E9D98]">Platform</label>
                    <input
                      type="text"
                      value={editPlatform}
                      onChange={(e) => setEditPlatform(e.target.value)}
                      className="w-full bg-[#151618] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#F5F4F0]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-[#9E9D98]">Posting Time</label>
                    <input
                      type="text"
                      value={editPostingTime}
                      onChange={(e) => setEditPostingTime(e.target.value)}
                      className="w-full bg-[#151618] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#F5F4F0]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsEditingItem(false)}
                    className="px-3 py-1.5 rounded-xl bg-[#151618] text-xs text-[#9E9D98]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateItem()}
                    className="px-3 py-1.5 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 bg-[#0B0C0E] rounded-2xl border border-white/[0.06] font-mono text-[11px]">
                  <div>
                    <span className="text-[#9E9D98]">Scheduled Date: </span>
                    <span className="text-[#F5F4F0] font-bold">
                      {selectedItem.date ? new Date(selectedItem.date).toLocaleDateString() : "TBD"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#9E9D98]">Posting Time: </span>
                    <span className="text-[#F5F4F0] font-bold">{selectedItem.suggestedPostingTime || "10:00 AM"}</span>
                  </div>
                  <div>
                    <span className="text-[#9E9D98]">Timezone: </span>
                    <span className="text-[#F5F4F0] font-bold">{userTimezone}</span>
                  </div>
                  <div>
                    <span className="text-[#9E9D98]">Pillar: </span>
                    <span className="text-[#D4AF37] font-bold">{selectedItem.pillarName || "Core Strategy"}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-[#9E9D98] uppercase">Hook Framework</span>
                  <p className="text-xs text-[#F5F4F0] italic font-serif p-3 bg-[#0B0C0E] rounded-2xl border border-white/[0.06]">
                    &quot;{selectedItem.hook}&quot;
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-[#9E9D98] uppercase">Strategic CTA</span>
                  <p className="text-xs font-bold text-[#D4AF37] p-3 bg-[#0B0C0E] rounded-2xl border border-white/[0.06]">
                    {selectedItem.cta}
                  </p>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setEditTopic(selectedItem.topic);
                    setEditPlatform(selectedItem.platform);
                    setEditPostingTime(selectedItem.suggestedPostingTime || "10:00 AM");
                    setIsEditingItem(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs font-semibold text-[#F5F4F0] hover:bg-white/5 flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#D4AF37]" /> Edit
                </button>

                {selectedItem.status !== "APPROVED" && (
                  <button
                    onClick={() => handleUpdateItem("APPROVED")}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold"
                  >
                    Approve
                  </button>
                )}

                <button
                  onClick={() => handlePublishNow()}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold"
                >
                  Publish Now
                </button>
              </div>

              <button
                onClick={() =>
                  router.push(
                    `/create?topic=${encodeURIComponent(selectedItem.topic)}&platform=${encodeURIComponent(
                      selectedItem.platform
                    )}`
                  )
                }
                className="px-4 py-1.5 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold hover:opacity-95 flex items-center gap-1.5"
              >
                <span>Generate in Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE CONTENT MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-[#F5F4F0]">Schedule Content</h3>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-[#9E9D98] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-[#9E9D98] mb-1">Target Platform</label>
                <select
                  value={schedulePlatform}
                  onChange={(e) => setSchedulePlatform(e.target.value)}
                  className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] font-mono"
                >
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="YOUTUBE">YouTube</option>
                  <option value="TIKTOK">TikTok</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="X">X / Twitter</option>
                  <option value="FACEBOOK">Facebook</option>
                  <option value="PINTEREST">Pinterest</option>
                  <option value="THREADS">Threads</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-[#9E9D98] mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduleDateStr}
                    onChange={(e) => setScheduleDateStr(e.target.value)}
                    className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#9E9D98] mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduleTimeStr}
                    onChange={(e) => setScheduleTimeStr(e.target.value)}
                    className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] font-mono"
                  />
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-mono text-[#9E9D98] mb-1">Active Timezone</span>
                <div className="p-2 rounded-xl bg-[#0B0C0E] border border-white/[0.06] font-mono text-[11px] text-[#D4AF37]">
                  {userTimezone}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0B0C0E] text-xs font-semibold text-[#9E9D98]"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedulePost}
                disabled={isSubmittingSchedule}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                <span>Confirm Schedule</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DAY OVERFLOW POPOVER MODAL */}
      {overflowDate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <h3 className="text-sm font-bold text-[#F5F4F0] font-mono">
                {overflowDate.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} Items
              </h3>
              <button onClick={() => setOverflowDate(null)} className="text-[#9E9D98] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {overflowDate.items.map((item) => (
                <div
                  key={item.id || item.topic}
                  onClick={() => {
                    setSelectedItem(item);
                    setOverflowDate(null);
                  }}
                  className="p-3 rounded-2xl bg-[#0B0C0E] border border-white/[0.08] hover:border-[#D4AF37] transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-[#F5F4F0]">{item.topic}</h4>
                    <p className="text-[10px] font-mono text-[#9E9D98]">{item.platform} • {item.suggestedPostingTime || "10:00 AM"}</p>
                  </div>
                  {renderStatusBadge(item.status)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
