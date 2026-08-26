"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  X,
  Sparkles,
  ArrowRight,
  Share2,
  Copy,
  Check,
  Film,
  Image as ImageIcon,
  Layers,
  FileText,
  Video,
  ExternalLink,
  Edit3,
  Trash2,
  Play,
  RotateCcw,
  Ban,
  Calendar as CalendarIcon,
  User,
  Tv,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Send,
  Eye,
  Sliders,
} from "lucide-react";
import { getAuthHeader } from "@/lib/api-client";

interface ApprovalItem {
  id: string;
  workspaceId: string;
  contentTitle: string;
  caption: string;
  platform: string;
  previewUrl?: string;
  status: "IN_REVIEW" | "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
  submittedById?: string;
  clientToken?: string;
  clientApprovalUrl?: string;
  contentPlanItemId?: string;
  createdAt: string;
  updatedAt?: string;
  auditLogs?: Array<{
    id: string;
    action: string;
    actorName: string;
    comment?: string;
    createdAt: string;
  }>;
}

interface ScheduledPostItem {
  id: string;
  userId?: string;
  workspaceId?: string;
  contentPlanItemId?: string;
  platform: string;
  scheduledAt: string;
  status: "SCHEDULED" | "READY" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "CANCELLED";
  errorMessage?: string;
  publishedUrl?: string;
  contentPlanItem?: {
    id: string;
    topic: string;
    hook: string;
    contentType: string;
    cta?: string;
  };
  createdAt?: string;
}

type MainTab = "APPROVALS" | "QUEUE" | "PUBLISHED";
type InspectorTab = "CONTENT" | "VISUAL" | "CAPTION" | "METADATA";

export default function PublishedWorkspacePage() {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<MainTab>("APPROVALS");

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [contentTypeFilter, setContentTypeFilter] = useState("ALL");
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Loading & Data State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPostItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Inspector Drawer State
  const [inspectItem, setInspectItem] = useState<{
    type: "APPROVAL" | "SCHEDULED";
    data: any;
  } | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("CONTENT");

  // Action Modals
  const [rejectingApprovalId, setRejectingApprovalId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const [reschedulingPost, setReschedulingPost] = useState<ScheduledPostItem | null>(null);
  const [rescheduleDateStr, setRescheduleDateStr] = useState("");
  const [rescheduleTimeStr, setRescheduleTimeStr] = useState("10:00");
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  const [isExecutingPublish, setIsExecutingPublish] = useState(false);

  // Timezone Name
  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    } catch {
      return "Asia/Kolkata";
    }
  }, []);

  // Load Data
  const loadWorkspaceData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const [apprRes, schedRes] = await Promise.all([
        fetch(`${apiBase}/api/approvals`, { headers: { ...authHeader } }),
        fetch(`${apiBase}/api/calendar/scheduled`, { headers: { ...authHeader } }),
      ]);

      const apprJson = await apprRes.json();
      const schedJson = await schedRes.json();

      if (apprJson.success && Array.isArray(apprJson.data)) {
        setApprovals(apprJson.data);
      } else {
        setApprovals([]);
      }

      if (schedJson.success && Array.isArray(schedJson.data)) {
        setScheduledPosts(schedJson.data);
      } else {
        setScheduledPosts([]);
      }
    } catch {
      setErrorMsg("Unable to load publishing workspace data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, []);

  // Summary Counters (Derived from real backend data)
  const counters = useMemo(() => {
    const pendingReview = approvals.filter(
      (a) => a.status === "IN_REVIEW" || a.status === "PENDING"
    ).length;
    const scheduled = scheduledPosts.filter((s) => s.status === "SCHEDULED").length;
    const publishing = scheduledPosts.filter(
      (s) => s.status === "PUBLISHING" || s.status === "READY"
    ).length;
    const published = scheduledPosts.filter((s) => s.status === "PUBLISHED").length;
    const failed = scheduledPosts.filter((s) => s.status === "FAILED").length;

    return { pendingReview, scheduled, publishing, published, failed };
  }, [approvals, scheduledPosts]);

  // Active Filter Count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (platformFilter !== "ALL") count++;
    if (statusFilter !== "ALL") count++;
    if (contentTypeFilter !== "ALL") count++;
    return count;
  }, [platformFilter, statusFilter, contentTypeFilter]);

  // Filtered Approvals
  const filteredApprovals = useMemo(() => {
    return approvals.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mTitle = item.contentTitle?.toLowerCase().includes(q);
        const mCap = item.caption?.toLowerCase().includes(q);
        const mPlat = item.platform?.toLowerCase().includes(q);
        if (!mTitle && !mCap && !mPlat) return false;
      }
      if (platformFilter !== "ALL" && item.platform?.toUpperCase() !== platformFilter.toUpperCase()) {
        return false;
      }
      if (statusFilter !== "ALL" && item.status?.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      return true;
    });
  }, [approvals, searchQuery, platformFilter, statusFilter]);

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return scheduledPosts.filter((item) => {
      // Queue includes SCHEDULED, READY, PUBLISHING, FAILED, CANCELLED
      if (item.status === "PUBLISHED") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const topic = item.contentPlanItem?.topic || "";
        const mTopic = topic.toLowerCase().includes(q);
        const mPlat = item.platform?.toLowerCase().includes(q);
        if (!mTopic && !mPlat) return false;
      }
      if (platformFilter !== "ALL" && item.platform?.toUpperCase() !== platformFilter.toUpperCase()) {
        return false;
      }
      if (statusFilter !== "ALL" && item.status?.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      if (
        contentTypeFilter !== "ALL" &&
        item.contentPlanItem?.contentType?.toLowerCase() !== contentTypeFilter.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [scheduledPosts, searchQuery, platformFilter, statusFilter, contentTypeFilter]);

  // Filtered Published Posts
  const filteredPublished = useMemo(() => {
    return scheduledPosts.filter((item) => {
      if (item.status !== "PUBLISHED") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const topic = item.contentPlanItem?.topic || "";
        const mTopic = topic.toLowerCase().includes(q);
        const mPlat = item.platform?.toLowerCase().includes(q);
        if (!mTopic && !mPlat) return false;
      }
      if (platformFilter !== "ALL" && item.platform?.toUpperCase() !== platformFilter.toUpperCase()) {
        return false;
      }
      return true;
    });
  }, [scheduledPosts, searchQuery, platformFilter]);

  // Action: Approve Request
  const handleApprove = async (approvalId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${apiBase}/api/approvals/${approvalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ comment: "Approved by reviewer" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Approval failed.");
      }
      setSuccessMsg("Content approved successfully!");
      if (inspectItem?.data?.id === approvalId) {
        setInspectItem(null);
      }
      await loadWorkspaceData(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Approval failed");
    }
  };

  // Action: Reject / Request Changes
  const handleConfirmReject = async () => {
    if (!rejectingApprovalId) return;
    setIsSubmittingReject(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${apiBase}/api/approvals/${rejectingApprovalId}/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ comment: rejectComment || "Changes requested by reviewer" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Request changes action failed.");
      }
      setSuccessMsg("Changes requested and feedback saved.");
      setRejectingApprovalId(null);
      setRejectComment("");
      if (inspectItem?.data?.id === rejectingApprovalId) {
        setInspectItem(null);
      }
      await loadWorkspaceData(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to request changes");
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Action: Trigger Publish Now
  const handlePublishNow = async () => {
    setIsExecutingPublish(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${apiBase}/api/publishing/execute-due`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Publishing execution failed.");
      }
      setSuccessMsg("Publishing queue processed successfully!");
      await loadWorkspaceData(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Publishing execution error");
    } finally {
      setIsExecutingPublish(false);
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
    if (s === "IN_REVIEW" || s === "PENDING") {
      return (
        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
          PENDING REVIEW
        </span>
      );
    }
    if (s === "CHANGES_REQUESTED" || s === "REJECTED") {
      return (
        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          NEEDS CHANGES
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
        {s}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#F5F4F0] p-4 sm:p-6 lg:p-8 space-y-6 font-sans selection:bg-[#D4AF37]/30">
      {/* 1. PAGE HEADER */}
      <header className="border-b border-white/[0.08] pb-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20">
                AI SOCIAL MEDIA STUDIO
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F4F0]">
              Publishing Workspace
            </h1>
            <p className="text-xs sm:text-sm text-[#9E9D98] mt-0.5">
              Review, approve and manage everything ready to publish.
            </p>
          </div>

          {/* Right Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9E9D98] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workspace..."
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

            {/* Refresh Button */}
            <button
              onClick={() => loadWorkspaceData(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-[#151618] border border-white/[0.08] text-[#9E9D98] hover:text-[#F5F4F0] transition-colors disabled:opacity-50"
              title="Refresh Workspace Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#D4AF37]" : ""}`} />
            </button>

            {/* Workspace Account Indicator */}
            <div className="px-3 py-1.5 rounded-xl bg-[#151618] border border-white/[0.08] text-xs font-mono text-[#9E9D98] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-[#F5F4F0]">Demo Workspace</span>
            </div>
          </div>
        </div>

        {/* WORKFLOW STATUS STEP BAR */}
        <div className="bg-[#151618] border border-white/[0.08] p-2.5 rounded-2xl flex items-center justify-between overflow-x-auto text-[11px] font-mono no-scrollbar">
          {[
            { step: "01", name: "CREATE" },
            { step: "02", name: "EDIT" },
            { step: "03", name: "REPURPOSE" },
            { step: "04", name: "SCHEDULE" },
            { step: "05", name: "PUBLISH", active: true },
            { step: "06", name: "ANALYZE" },
          ].map((s, idx) => (
            <React.Fragment key={s.step}>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl shrink-0 ${
                  s.active
                    ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 font-bold"
                    : "text-[#9E9D98]"
                }`}
              >
                <span>{s.step}</span>
                <span>{s.name}</span>
              </div>
              {idx < 5 && <span className="text-white/10 text-xs shrink-0 font-bold">→</span>}
            </React.Fragment>
          ))}
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

      {/* 2. TOP STATUS SUMMARY COUNTERS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Pending Review", value: counters.pendingReview, color: "text-amber-400" },
          { label: "Scheduled", value: counters.scheduled, color: "text-[#D4AF37]" },
          { label: "Publishing", value: counters.publishing, color: "text-blue-400" },
          { label: "Published", value: counters.published, color: "text-emerald-400" },
          { label: "Failed", value: counters.failed, color: "text-rose-400" },
        ].map((c) => (
          <div key={c.label} className="bg-[#151618] border border-white/[0.08] p-3.5 rounded-2xl space-y-1">
            <span className="text-[10px] font-mono text-[#9E9D98] uppercase block">{c.label}</span>
            <span className={`text-xl font-mono font-bold ${c.color}`}>{c.value}</span>
          </div>
        ))}
      </div>

      {/* 3. PRIMARY TABS & WORKSPACE TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {(["APPROVALS", "QUEUE", "PUBLISHED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl font-bold transition-all relative ${
                activeTab === tab
                  ? "bg-[#151618] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm shadow-[#D4AF37]/10"
                  : "text-[#9E9D98] hover:text-[#F5F4F0]"
              }`}
            >
              {tab === "QUEUE" ? "PUBLISH QUEUE" : tab}
              {tab === "APPROVALS" && counters.pendingReview > 0 && (
                <span className="ml-2 px-1.5 py-0.2 rounded-full bg-[#D4AF37] text-[#0B0C0E] text-[10px] font-bold">
                  {counters.pendingReview}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filter Popover Trigger */}
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

          {/* Filter Popover */}
          {showFilterPopover && (
            <div className="absolute right-0 mt-2 w-64 bg-[#151618] border border-white/10 rounded-2xl p-4 shadow-2xl z-40 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 font-mono font-bold text-[#F5F4F0]">
                <span>Filter Workspace</span>
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
                  <option value="IN_REVIEW">Pending Review</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. TAB 1: APPROVALS */}
      {activeTab === "APPROVALS" && (
        <div>
          {isLoading ? (
            <div className="py-24 text-center space-y-3 bg-[#151618] border border-white/[0.08] rounded-3xl">
              <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto" />
              <p className="text-xs font-mono text-[#9E9D98]">Loading Content Approvals...</p>
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-12 text-center space-y-3 max-w-md mx-auto my-8">
              <ShieldCheck className="w-12 h-12 text-[#9E9D98] mx-auto opacity-40" />
              <h3 className="text-base font-bold text-[#F5F4F0]">No items pending approval</h3>
              <p className="text-xs text-[#9E9D98] font-mono">
                Content ready for client or internal review will appear in this workspace tab.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApprovals.map((appr) => (
                <div
                  key={appr.id}
                  className="bg-[#151618] border border-white/[0.08] hover:border-[#D4AF37]/40 rounded-3xl p-5 space-y-4 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    {/* Media Preview or Placeholder */}
                    <div className="relative aspect-video rounded-2xl bg-[#0B0C0E] border border-white/[0.06] overflow-hidden flex items-center justify-center">
                      {appr.previewUrl ? (
                        <img
                          src={appr.previewUrl}
                          alt={appr.contentTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-center space-y-1 text-[#9E9D98]">
                          {renderPlatformIcon(appr.platform)}
                          <span className="text-[10px] font-mono block">Content Preview</span>
                        </div>
                      )}

                      <div className="absolute top-2 left-2">
                        <span className="text-[10px] font-mono font-bold text-[#D4AF37] bg-[#0B0C0E]/80 backdrop-blur-md px-2 py-0.5 rounded border border-[#D4AF37]/30 uppercase">
                          {appr.platform}
                        </span>
                      </div>

                      <div className="absolute top-2 right-2">
                        {renderStatusBadge(appr.status)}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#F5F4F0] line-clamp-1 group-hover:text-[#D4AF37] transition-colors">
                        {appr.contentTitle}
                      </h3>
                      <p className="text-xs text-[#9E9D98] italic font-serif line-clamp-2 mt-1">
                        &quot;{appr.caption}&quot;
                      </p>
                    </div>

                    <div className="text-[10px] font-mono text-[#9E9D98] flex items-center justify-between border-t border-white/[0.06] pt-2">
                      <span>Submitted: {new Date(appr.createdAt).toLocaleDateString()}</span>
                      <span>By: Content Creator</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                    <button
                      onClick={() =>
                        setInspectItem({ type: "APPROVAL", data: appr })
                      }
                      className="px-3 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs font-mono text-[#F5F4F0] hover:bg-white/5 transition-all flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Review</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setRejectingApprovalId(appr.id);
                          setRejectComment("");
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold hover:bg-rose-500/30 transition-all"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() => handleApprove(appr.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-mono font-bold hover:opacity-95 transition-all"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: PUBLISH QUEUE */}
      {activeTab === "QUEUE" && (
        <div>
          {isLoading ? (
            <div className="py-24 text-center space-y-3 bg-[#151618] border border-white/[0.08] rounded-3xl">
              <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto" />
              <p className="text-xs font-mono text-[#9E9D98]">Loading Publish Queue...</p>
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto my-8">
              <Clock className="w-12 h-12 text-[#9E9D98] mx-auto opacity-40" />
              <h3 className="text-base font-bold text-[#F5F4F0]">No content scheduled yet.</h3>
              <p className="text-xs text-[#9E9D98] font-mono">
                Build your scheduled queue from the Content Calendar or Creation Studio.
              </p>
              <button
                onClick={() => router.push("/calendar/ai")}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold font-mono hover:opacity-95 inline-flex items-center gap-1.5"
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Schedule Content</span>
              </button>
            </div>
          ) : (
            <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-4 sm:p-6 space-y-3">
              {/* Queue Controls Bar */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 text-xs font-mono">
                <span className="text-[#9E9D98]">Queue Items ({filteredQueue.length})</span>
                <button
                  onClick={handlePublishNow}
                  disabled={isExecutingPublish}
                  className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] text-[#0B0C0E] font-bold text-xs hover:opacity-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isExecutingPublish ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Publish Due Posts Now</span>
                </button>
              </div>

              {/* Queue Items Table / List */}
              <div className="space-y-2.5">
                {filteredQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#0B0C0E] border border-white/[0.08] hover:border-[#D4AF37]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-10 h-10 rounded-xl bg-[#151618] border border-white/10 flex items-center justify-center shrink-0">
                        {renderPlatformIcon(item.platform)}
                      </div>

                      <div className="truncate space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase">
                            {item.platform}
                          </span>
                          {renderStatusBadge(item.status)}
                        </div>
                        <h4 className="text-xs font-bold text-[#F5F4F0] truncate">
                          {item.contentPlanItem?.topic || "Scheduled Post"}
                        </h4>
                        <p className="text-[10px] text-[#9E9D98] font-mono truncate">
                          Scheduled: {new Date(item.scheduledAt).toLocaleDateString()} @{" "}
                          {new Date(item.scheduledAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          ({userTimezone})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 justify-end">
                      <button
                        onClick={() =>
                          setInspectItem({ type: "SCHEDULED", data: item })
                        }
                        className="px-3 py-1.5 rounded-xl bg-[#151618] border border-white/10 text-xs font-mono text-[#F5F4F0] hover:bg-white/5"
                      >
                        Details
                      </button>

                      {item.status === "FAILED" && (
                        <button
                          onClick={handlePublishNow}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 3: PUBLISHED */}
      {activeTab === "PUBLISHED" && (
        <div>
          {isLoading ? (
            <div className="py-24 text-center space-y-3 bg-[#151618] border border-white/[0.08] rounded-3xl">
              <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto" />
              <p className="text-xs font-mono text-[#9E9D98]">Loading Published Posts...</p>
            </div>
          ) : filteredPublished.length === 0 ? (
            <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto my-8">
              <CheckCircle2 className="w-12 h-12 text-[#9E9D98] mx-auto opacity-40" />
              <h3 className="text-base font-bold text-[#F5F4F0]">No content has been published yet.</h3>
              <p className="text-xs text-[#9E9D98] font-mono">
                Successfully deployed social posts will appear in this archive gallery.
              </p>
              <button
                onClick={() => router.push("/create")}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold font-mono hover:opacity-95 inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create Content</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPublished.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#151618] border border-white/[0.08] rounded-3xl p-5 space-y-3 hover:border-[#D4AF37]/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="flex items-center gap-1.5 text-[#D4AF37] font-bold">
                        {renderPlatformIcon(item.platform)}
                        <span>{item.platform}</span>
                      </span>
                      {renderStatusBadge(item.status)}
                    </div>

                    <h3 className="text-sm font-bold text-[#F5F4F0] line-clamp-2">
                      {item.contentPlanItem?.topic || "Published Post"}
                    </h3>

                    <p className="text-[10px] text-[#9E9D98] font-mono">
                      Published: {new Date(item.scheduledAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <button
                      onClick={() =>
                        setInspectItem({ type: "SCHEDULED", data: item })
                      }
                      className="text-xs font-mono text-[#D4AF37] hover:underline flex items-center gap-1"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    {item.publishedUrl && (
                      <a
                        href={item.publishedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs font-mono text-[#F5F4F0] hover:bg-white/5 flex items-center gap-1"
                      >
                        <span>Open Post</span>
                        <ExternalLink className="w-3 h-3 text-[#D4AF37]" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. REVIEW / INSPECTOR DRAWER */}
      {inspectItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-end">
          <div className="bg-[#151618] border-l border-white/[0.08] w-full max-w-xl h-full p-6 space-y-5 overflow-y-auto relative flex flex-col justify-between">
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20">
                    {inspectItem.data.platform}
                  </span>
                  {renderStatusBadge(inspectItem.data.status)}
                </div>
                <button
                  onClick={() => setInspectItem(null)}
                  className="text-[#9E9D98] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title */}
              <h2 className="text-lg font-bold text-[#F5F4F0]">
                {inspectItem.type === "APPROVAL"
                  ? inspectItem.data.contentTitle
                  : inspectItem.data.contentPlanItem?.topic || "Scheduled Item"}
              </h2>

              {/* Inspector Sub-Tabs */}
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2 font-mono text-xs">
                {(["CONTENT", "VISUAL", "CAPTION", "METADATA"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setInspectorTab(tab)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      inspectorTab === tab
                        ? "bg-[#D4AF37] text-[#0B0C0E]"
                        : "text-[#9E9D98] hover:text-[#F5F4F0]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Drawer Tab Contents */}
              {inspectorTab === "CONTENT" && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-[#0B0C0E] rounded-2xl border border-white/[0.06] space-y-2">
                    <span className="text-[10px] font-mono text-[#9E9D98] uppercase block">Caption / Hook</span>
                    <p className="text-[#F5F4F0] italic font-serif">
                      &quot;
                      {inspectItem.type === "APPROVAL"
                        ? inspectItem.data.caption
                        : inspectItem.data.contentPlanItem?.hook || "No hook provided"}
                      &quot;
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#0B0C0E] rounded-2xl border border-white/[0.06] space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#9E9D98]">Platform:</span>
                      <span className="text-[#D4AF37] font-bold">{inspectItem.data.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9E9D98]">Target Account:</span>
                      <span className="text-[#F5F4F0]">Workspace Connected Account</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9E9D98]">Timezone:</span>
                      <span className="text-[#F5F4F0]">{userTimezone}</span>
                    </div>
                  </div>
                </div>
              )}

              {inspectorTab === "VISUAL" && (
                <div className="space-y-3">
                  <div className="aspect-video rounded-2xl bg-[#0B0C0E] border border-white/[0.06] overflow-hidden flex items-center justify-center">
                    {inspectItem.data.previewUrl ? (
                      <img
                        src={inspectItem.data.previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center space-y-2 text-[#9E9D98]">
                        <Video className="w-8 h-8 text-[#D4AF37] mx-auto" />
                        <span className="text-xs font-mono block">Video / Image Media Asset</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {inspectorTab === "CAPTION" && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 bg-[#0B0C0E] rounded-2xl border border-white/[0.06] space-y-2">
                    <span className="text-[10px] font-mono text-[#9E9D98] uppercase block">Full Copy Text</span>
                    <p className="text-[#F5F4F0] whitespace-pre-wrap">
                      {inspectItem.type === "APPROVAL"
                        ? inspectItem.data.caption
                        : inspectItem.data.contentPlanItem?.hook}
                    </p>
                  </div>
                </div>
              )}

              {inspectorTab === "METADATA" && (
                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3.5 bg-[#0B0C0E] rounded-2xl border border-white/[0.06] space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#9E9D98]">ID:</span>
                      <span className="text-[#F5F4F0]">{inspectItem.data.id}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#9E9D98]">Created At:</span>
                      <span className="text-[#F5F4F0]">
                        {new Date(inspectItem.data.createdAt || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#9E9D98]">Status:</span>
                      <span className="text-[#D4AF37] font-bold">{inspectItem.data.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions inside Drawer */}
            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
              {inspectItem.type === "APPROVAL" && (
                <>
                  <button
                    onClick={() => {
                      setRejectingApprovalId(inspectItem.data.id);
                      setRejectComment("");
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold hover:bg-rose-500/30"
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() => handleApprove(inspectItem.data.id)}
                    className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-mono font-bold hover:opacity-95"
                  >
                    Approve Content
                  </button>
                </>
              )}
              {inspectItem.type === "SCHEDULED" && (
                <button
                  onClick={handlePublishNow}
                  className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-mono font-bold hover:opacity-95"
                >
                  Publish Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT / REVISION DIALOG MODAL */}
      {rejectingApprovalId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-[#F5F4F0]">Request Changes / Reject</h3>
              <button
                onClick={() => setRejectingApprovalId(null)}
                className="text-[#9E9D98] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-[10px] font-mono text-[#9E9D98]">
                Reviewer Feedback / Revision Comments
              </label>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Explain required changes for the content creator..."
                rows={4}
                className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl p-3 text-xs text-[#F5F4F0] focus:border-rose-500/50 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setRejectingApprovalId(null)}
                className="px-4 py-2 rounded-xl bg-[#0B0C0E] text-xs font-semibold text-[#9E9D98]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isSubmittingReject}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingReject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Feedback</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
