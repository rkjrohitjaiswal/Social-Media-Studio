"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Calendar,
  Clock,
  PlusCircle,
  Video,
  ImageIcon,
  Share2,
  ArrowRight,
  Eye,
  TrendingUp,
  Send,
  FolderKanban,
  Key,
  Link2,
} from "lucide-react";
import { ScheduledState } from "@/lib/queue-types";
import { createClient } from "@/lib/supabase/client";

interface ProjectItem {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
  status: string;
  thumbnailUrl?: string;
}

export default function StudioDashboardPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [upcomingSchedules, setUpcomingSchedules] = useState<ScheduledState[]>([]);
  const [analyticsReach, setAnalyticsReach] = useState<number | null>(null);
  const [analyticsEngRate, setAnalyticsEngRate] = useState<number | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [publishedCount, setPublishedCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (isMounted) {
          if (user) {
            const name =
              user.user_metadata?.full_name ||
              user.user_metadata?.first_name ||
              user.email?.split("@")[0];
            setUserName(name || "User");
          } else {
            setUserName(null);
          }
          setIsLoadingUser(false);
        }
      } catch {
        if (isMounted) {
          setIsLoadingUser(false);
        }
      }
    }

    async function loadUpcoming() {
      try {
        const res = await fetch(
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
            "/api/campaigns/demo-campaign-1/schedule"
        );
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.schedules)) {
          setUpcomingSchedules(json.schedules);
        }
      } catch {
        // Ignore load error for dynamic data
      }
    }

    async function loadAnalytics() {
      try {
        const resOverview = await fetch(
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/analytics/overview"
        );
        const jsonOverview = await resOverview.json();
        if (isMounted && jsonOverview.success && jsonOverview.data?.hasData) {
          setAnalyticsReach(jsonOverview.data.kpis?.reach?.current || null);
          setAnalyticsEngRate(jsonOverview.data.kpis?.engagementRate?.current || null);
          setPublishedCount(jsonOverview.data.kpis?.publishedCount?.current || 0);
        }
      } catch {
        // Ignore analytics load error
      }
    }

    loadUser();
    loadUpcoming();
    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, []);

  const workflowSteps = [
    { num: "01", name: "CREATE", desc: "Generate ideas, scripts & post copy", href: "/create" },
    { num: "02", name: "EDIT", desc: "Refine media, captions & overlays", href: "/content-studio" },
    { num: "03", name: "REPURPOSE", desc: "Adapt across multiple platforms", href: "/repurpose" },
    { num: "04", name: "SCHEDULE", desc: "Set optimal publishing times", href: "/calendar/ai" },
    { num: "05", name: "PUBLISH", desc: "Direct social media deployment", href: "/published" },
    { num: "06", name: "ANALYZE", desc: "Track performance & audience reach", href: "/analytics" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 selection:bg-[#D4AF37]/30">
      {/* 1. TOP DASHBOARD COMMAND CENTER HEADER */}
      <div className="bg-[#151618] border border-white/[0.08] p-6 sm:p-8 rounded-2xl space-y-4 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>My Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F4F0] min-h-[36px] flex items-center">
              {isLoadingUser ? (
                <span className="inline-block w-48 h-8 bg-white/10 rounded-lg animate-pulse" />
              ) : (
                `Good morning, ${userName || "User"}`
              )}
            </h1>
            <p className="text-xs text-[#9E9D98]">
              Create, refine and publish your content from one workspace.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/create"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0B0C0E] font-semibold text-xs shadow-md shadow-[#D4AF37]/10 hover:opacity-95 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-[#0B0C0E]" />
              <span>+ Create Content</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. CONTENT WORKFLOW PIPELINE */}
      <div className="bg-[#151618] border border-white/[0.08] p-6 sm:p-8 rounded-2xl space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h2 className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider">
              CONTENT WORKFLOW
            </h2>
            <p className="text-xs text-[#9E9D98] mt-0.5">
              End-to-end publishing pipeline for your social media channels.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {workflowSteps.map((step) => (
            <Link
              key={step.num}
              href={step.href}
              className="p-3.5 rounded-xl bg-[#0B0C0E] border border-white/[0.08] hover:border-[#D4AF37]/40 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#D4AF37]">
                  {step.num}
                </span>
                <ArrowRight className="w-3 h-3 text-[#9E9D98] group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-xs font-bold text-[#F5F4F0] group-hover:text-[#D4AF37] transition-colors">
                {step.name}
              </div>
              <p className="text-[10px] text-[#9E9D98] leading-tight">
                {step.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. QUICK CREATE SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold text-[#9E9D98] uppercase tracking-wider">
            Create something new
          </h2>
          <Link href="/create" className="text-xs text-[#D4AF37] hover:underline font-medium">
            Start Creating →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "AI Content",
              desc: "Create content from an idea.",
              href: "/create",
              icon: Sparkles,
              action: "Start Creating",
            },
            {
              title: "Image",
              desc: "Generate social visuals.",
              href: "/create?type=image",
              icon: ImageIcon,
              action: "Create Image",
            },
            {
              title: "Video",
              desc: "Create short or long-form video.",
              href: "/create?type=video",
              icon: Video,
              action: "Create Video",
            },
            {
              title: "Repurpose",
              desc: "Turn existing content into multiple formats.",
              href: "/repurpose",
              icon: Share2,
              action: "Repurpose",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-[#151618] border border-white/[0.08] p-5 rounded-2xl space-y-4 flex flex-col justify-between hover:border-[#D4AF37]/30 transition-all group"
              >
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-[#0B0C0E] border border-white/[0.08] flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#F5F4F0]">{card.title}</h3>
                  <p className="text-xs text-[#9E9D98] leading-relaxed">{card.desc}</p>
                </div>

                <Link
                  href={card.href}
                  className="w-full py-2 px-3 rounded-xl bg-[#0B0C0E] border border-white/[0.08] text-xs font-semibold text-[#F5F4F0] group-hover:border-[#D4AF37]/40 group-hover:text-[#D4AF37] transition-all flex items-center justify-between"
                >
                  <span>{card.action}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#9E9D98] group-hover:text-[#D4AF37] transition-colors" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. ANALYTICS SNAPSHOT (DATA-AWARE) */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono font-bold text-[#9E9D98] uppercase tracking-wider">
          Analytics Snapshot
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* REACH */}
          <div className="bg-[#151618] border border-white/[0.08] p-5 rounded-2xl space-y-2">
            <div className="text-xs font-medium text-[#9E9D98] flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#D4AF37]" /> Reach
            </div>
            {analyticsReach !== null ? (
              <div className="text-2xl font-bold text-[#F5F4F0]">
                {analyticsReach.toLocaleString()}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-sm font-semibold text-[#9E9D98]">No data yet</div>
                <p className="text-[11px] text-[#9E9D98]/70">
                  Connect your channels to see performance.
                </p>
              </div>
            )}
          </div>

          {/* ENGAGEMENT */}
          <div className="bg-[#151618] border border-white/[0.08] p-5 rounded-2xl space-y-2">
            <div className="text-xs font-medium text-[#9E9D98] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" /> Engagement
            </div>
            {analyticsEngRate !== null ? (
              <div className="text-2xl font-bold text-[#D4AF37]">{analyticsEngRate}%</div>
            ) : (
              <div className="space-y-1">
                <div className="text-sm font-semibold text-[#9E9D98]">No data yet</div>
                <p className="text-[11px] text-[#9E9D98]/70">Track audience interactions.</p>
              </div>
            )}
          </div>

          {/* PUBLISHED */}
          <div className="bg-[#151618] border border-white/[0.08] p-5 rounded-2xl space-y-2">
            <div className="text-xs font-medium text-[#9E9D98] flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-[#D4AF37]" /> Published
            </div>
            <div className="text-2xl font-bold text-[#F5F4F0]">{publishedCount}</div>
            <p className="text-[11px] text-[#9E9D98]/70">Published content history.</p>
          </div>

          {/* SCHEDULED */}
          <div className="bg-[#151618] border border-white/[0.08] p-5 rounded-2xl space-y-2">
            <div className="text-xs font-medium text-[#9E9D98] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" /> Scheduled
            </div>
            <div className="text-2xl font-bold text-[#F5F4F0]">
              {upcomingSchedules.filter((s) => s.status === "SCHEDULED").length}
            </div>
            <p className="text-[11px] text-[#9E9D98]/70">Queued in your publishing pipeline.</p>
          </div>
        </div>
      </div>

      {/* 5. UPCOMING CONTENT & RECENT PROJECTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* UPCOMING CONTENT */}
        <div className="bg-[#151618] border border-white/[0.08] p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h2 className="text-sm font-bold text-[#F5F4F0] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#D4AF37]" /> Upcoming
            </h2>
            <Link href="/calendar/ai" className="text-xs text-[#D4AF37] hover:underline font-medium">
              View Calendar →
            </Link>
          </div>

          {upcomingSchedules.length > 0 ? (
            <div className="space-y-3">
              {upcomingSchedules.slice(0, 4).map((sched) => (
                <div
                  key={sched.id}
                  className="p-3.5 rounded-xl bg-[#0B0C0E] border border-white/[0.08] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 truncate">
                    <div className="font-bold text-[#F5F4F0] truncate">
                      {sched.captionSnapshot || "Untitled Post"}
                    </div>
                    <div className="text-[11px] text-[#9E9D98] flex items-center gap-2">
                      <span>
                        {new Date(sched.scheduledFor).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[#D4AF37]">YouTube / Social</span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] text-[10px] font-mono border border-[#D4AF37]/30 shrink-0">
                    {sched.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <Clock className="w-6 h-6 text-[#9E9D98]/50 mx-auto" />
              <div className="text-xs font-semibold text-[#9E9D98]">
                No upcoming content scheduled.
              </div>
              <Link
                href="/calendar/ai"
                className="inline-block px-3 py-1.5 rounded-lg bg-[#0B0C0E] border border-white/[0.08] text-xs text-[#D4AF37] hover:border-[#D4AF37]/40 font-medium"
              >
                Schedule Content
              </Link>
            </div>
          )}
        </div>

        {/* RECENT PROJECTS */}
        <div className="bg-[#151618] border border-white/[0.08] p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h2 className="text-sm font-bold text-[#F5F4F0] flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-[#D4AF37]" /> Recent Projects
            </h2>
            <Link href="/content-studio" className="text-xs text-[#D4AF37] hover:underline font-medium">
              View All Projects →
            </Link>
          </div>

          {projects.length > 0 ? (
            <div className="space-y-2.5">
              {projects.slice(0, 4).map((project) => (
                <Link
                  key={project.id}
                  href={`/content-studio?project=${project.id}`}
                  className="p-3 rounded-xl bg-[#0B0C0E] border border-white/[0.08] hover:border-[#D4AF37]/40 transition-colors flex items-center justify-between gap-3 text-xs group"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-8 h-8 rounded-lg bg-[#151618] border border-white/[0.08] flex items-center justify-center shrink-0">
                      {project.thumbnailUrl ? (
                        <Image
                          src={project.thumbnailUrl}
                          alt={project.name}
                          width={32}
                          height={32}
                          className="rounded-lg object-cover"
                        />
                      ) : (
                        <FolderKanban className="w-4 h-4 text-[#D4AF37]" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-[#F5F4F0] group-hover:text-[#D4AF37] transition-colors truncate">
                        {project.name}
                      </div>
                      <div className="text-[10px] text-[#9E9D98]">
                        {project.type} • {project.updatedAt}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#9E9D98] font-mono shrink-0">
                    {project.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <FolderKanban className="w-6 h-6 text-[#9E9D98]/50 mx-auto" />
              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#F5F4F0]">No projects yet.</div>
                <p className="text-[11px] text-[#9E9D98]">
                  Create your first project and start building your content workflow.
                </p>
              </div>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B0C0E] border border-white/[0.08] text-xs font-semibold text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create Project</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 6. BYOK PROVIDER CONNECTIONS POSITIONING PANEL */}
      <div className="bg-[#151618] border border-white/[0.08] p-6 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider">
            <Key className="w-4 h-4" />
            <span>Provider Connections &amp; Accounts</span>
          </div>
          <Link
            href="/settings/social-accounts"
            className="text-xs text-[#D4AF37] hover:underline font-medium flex items-center gap-1"
          >
            <span>Manage Connections</span>
            <Link2 className="w-3.5 h-3.5" />
          </Link>
        </div>

        <p className="text-xs text-[#9E9D98] leading-relaxed max-w-4xl">
          AI Social Media Studio orchestrates your creative workflow. Users connect their own AI provider credentials (OpenAI, Luma, Runway, etc.) and social platform accounts (YouTube, Instagram, LinkedIn, X, TikTok). All API usage and costs remain under your direct control.
        </p>
      </div>
    </div>
  );
}

