"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Layers,
  Wrench,
  Share2,
  Calendar,
  BarChart3,
  Key,
  ShieldCheck,
  CheckCircle2,
  Play,
  Zap,
  Check,
  Video,
  Image as ImageIcon,
  Globe,
  Users,
  Menu,
  X,
  ChevronRight,
  Clock,
  Tv,
  FolderKanban,
  Sliders,
  TrendingUp,
  Cpu,
  Target,
  FileText,
  Lock,
} from "lucide-react";

export default function PublicHomepage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<
    "command-center" | "image-studio" | "video-studio" | "media-editor" | "calendar" | "analytics"
  >("command-center");

  const workflowSteps = [
    { step: "01", name: "IDEA", desc: "Brainstorm topics & content pillars", icon: Target },
    { step: "02", name: "CREATE", desc: "Generate text, images, videos & scripts", icon: Sparkles },
    { step: "03", name: "EDIT", desc: "Timeline scenes, voiceover & captions", icon: Wrench },
    { step: "04", name: "REPURPOSE", desc: "Turn 1 video into Shorts, Reels & posts", icon: Share2 },
    { step: "05", name: "SCHEDULE", desc: "Interactive calendar & optimal posting", icon: Calendar },
    { step: "06", name: "PUBLISH", desc: "Automated background API publishing", icon: Zap },
    { step: "07", name: "ANALYZE", desc: "Performance tracking & metric insights", icon: BarChart3 },
  ];

  const coreCapabilities = [
    {
      id: "create",
      title: "AI Content Creation",
      desc: "Generate high-resolution image variants, vertical short videos, video scripts, captions, and structured multi-platform assets.",
      icon: Sparkles,
      items: ["DALL-E Multi-Image Generation", "Short Vertical & 16:9 Video", "AI Script & Caption Engine", "Style Presets & Aspect Ratios"],
    },
    {
      id: "edit",
      title: "Professional Media Editor",
      desc: "Comprehensive timeline scene editor for long-form tutorials, shorts, and reels with full audio and text controls.",
      icon: Wrench,
      items: ["Scene-by-Scene Timeline", "Voiceover & Music Controls", "Text Overlays & Captions", "Version History & AI Regeneration"],
    },
    {
      id: "repurpose",
      title: "Content Repurposing",
      desc: "Transform long videos or master topics into YouTube Shorts, Instagram Reels, TikToks, LinkedIn posts, and X threads.",
      icon: Share2,
      items: ["Long Video → Shorts & Reels", "Video → Multi-Slide Carousels", "Script → Social Thread Cards", "Platform-Specific Formatting"],
    },
    {
      id: "publish",
      title: "Social Publishing",
      desc: "Schedule and auto-publish content directly to connected accounts with background execution and idempotency safeguards.",
      icon: Calendar,
      items: ["Direct OAuth Social Publishing", "Interactive Calendar Grid", "Approval Review Workflow", "Automatic Background Worker"],
    },
    {
      id: "analytics",
      title: "Performance Analytics",
      desc: "Track reach, engagement rates, views, and content patterns across all connected social channels in one workspace.",
      icon: BarChart3,
      items: ["Cross-Platform View Ingestion", "Engagement Rate Metrics", "Top Content Pattern Detector", "Best Posting Time Reports"],
    },
    {
      id: "workspace",
      title: "Workspace & Collaboration",
      desc: "Organize campaigns, brand identities, team approval gates, and provider API keys in an isolated workspace environment.",
      icon: FolderKanban,
      items: ["Multiple Brand Personas", "Client Approval Links", "Encrypted BYOK Key Vault", "Workspace Credit Governance"],
    },
  ];

  const platforms = [
    { name: "YouTube", category: "Long-form & Shorts", desc: "Publish 16:9 videos & 9:16 Shorts with automated metadata." },
    { name: "Instagram", category: "Reels, Carousels & Feeds", desc: "Post high-end visual carousels, editorial imagery & Reels." },
    { name: "Facebook", category: "Pages & Video Feeds", desc: "Distribute page updates, video feeds & cross-posted assets." },
    { name: "TikTok", category: "Short Vertical Videos", desc: "Publish short vertical video content directly to your feed." },
    { name: "LinkedIn", category: "Articles & Visual Threads", desc: "Share thought leadership carousels and professional posts." },
    { name: "X (Twitter)", category: "Single Posts & Threads", desc: "Convert scripts into high-engagement text & visual threads." },
    { name: "Pinterest", category: "Visual Pins & Idea Pins", desc: "Design & publish high-intent visual product pins." },
    { name: "Threads", category: "Conversational Feeds", desc: "Cross-post engaging text updates & image carousels." },
  ];

  const howItWorksSteps = [
    {
      step: "01",
      title: "Connect",
      desc: "Connect your AI provider API keys (OpenAI, Runway, Luma) and your social media accounts via secure direct OAuth.",
      icon: Key,
    },
    {
      step: "02",
      title: "Create",
      desc: "Generate master content, image suites, scripts, or video scenes using goal-driven AI prompts and templates.",
      icon: Cpu,
    },
    {
      step: "03",
      title: "Refine",
      desc: "Edit scenes in the multi-track timeline, repurpose into 8 platform formats, and review in approval gates.",
      icon: Sliders,
    },
    {
      step: "04",
      title: "Publish",
      desc: "Schedule posts on the interactive calendar, publish automatically in the background, and track analytics.",
      icon: TrendingUp,
    },
  ];

  const showcaseTabs = [
    { id: "command-center", label: "Command Center" },
    { id: "image-studio", label: "AI Image Studio" },
    { id: "video-studio", label: "AI Video Studio" },
    { id: "media-editor", label: "Media Editor" },
    { id: "calendar", label: "Content Calendar" },
    { id: "analytics", label: "Analytics" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#f5f4f0] selection:bg-[#c5a059]/30 selection:text-[#f5f4f0]">
      {/* 1. NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0c0e]/85 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* LEFT: LOGO */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c5a059] via-[#d4af37] to-[#8a6d3b] p-[1px] flex items-center justify-center shadow-lg shadow-[#c5a059]/20 group-hover:scale-105 transition-all duration-300">
              <div className="w-full h-full bg-[#0b0c0e] rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#c5a059]" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-[#f5f4f0] block leading-none font-sans">
                AI SOCIAL <span className="text-[#c5a059] font-medium text-xs ml-1 tracking-widest uppercase">STUDIO</span>
              </span>
              <span className="text-[10px] text-[#9e9d98] tracking-widest uppercase block mt-1 font-mono">
                Unified Content Platform
              </span>
            </div>
          </Link>

          {/* CENTER: NAV LINKS */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9e9d98]">
            <a href="#features" className="hover:text-[#f5f4f0] transition-colors">
              Product
            </a>
            <a href="#capabilities" className="hover:text-[#f5f4f0] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#f5f4f0] transition-colors">
              How It Works
            </a>
            <a href="#platforms" className="hover:text-[#f5f4f0] transition-colors">
              Platforms
            </a>
            <a href="#byok" className="hover:text-[#f5f4f0] transition-colors">
              BYOK
            </a>
          </nav>

          {/* RIGHT: AUTH CONTROLS */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-[#f5f4f0] hover:text-[#c5a059] px-4 py-2 rounded-lg transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-gradient-to-r from-[#c5a059] to-[#d4af37] text-[#0b0c0e] hover:opacity-95 px-5 py-2.5 rounded-xl shadow-md shadow-[#c5a059]/20 transition-all flex items-center gap-2"
            >
              Sign Up <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* MOBILE MENU TOGGLE */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#9e9d98] hover:text-[#f5f4f0] p-2"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* MOBILE MENU DRAWER */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/10 bg-[#14161a] px-6 py-6 space-y-4">
            <nav className="flex flex-col space-y-3 text-sm text-[#9e9d98]">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#f5f4f0] py-1"
              >
                Product
              </a>
              <a
                href="#capabilities"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#f5f4f0] py-1"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#f5f4f0] py-1"
              >
                How It Works
              </a>
              <a
                href="#platforms"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#f5f4f0] py-1"
              >
                Platforms
              </a>
              <a
                href="#byok"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#f5f4f0] py-1"
              >
                BYOK Architecture
              </a>
            </nav>
            <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center text-sm font-medium text-[#f5f4f0] border border-white/10 py-2.5 rounded-xl bg-white/5"
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center text-sm font-semibold bg-gradient-to-r from-[#c5a059] to-[#d4af37] text-[#0b0c0e] py-2.5 rounded-xl"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-20 pb-24 px-6 max-w-7xl mx-auto text-center overflow-hidden">
        {/* Subtle Ambient Gold Glow Background */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-[#c5a059]/10 rounded-full blur-[150px] pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[#c5a059]/30 bg-[#c5a059]/10 text-[#c5a059] text-xs font-mono font-medium uppercase tracking-widest mb-8">
          <Sparkles className="w-3.5 h-3.5" /> Professional Creative Platform
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#f5f4f0] max-w-5xl mx-auto leading-[1.1]">
          Create once.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f5f4f0] via-[#c5a059] to-[#d4af37]">
            Publish everywhere.
          </span>
        </h1>

        {/* Supporting Copy 1 */}
        <p className="mt-8 text-lg sm:text-xl text-[#9e9d98] max-w-3xl mx-auto leading-relaxed">
          One workspace for creating, editing, repurposing, scheduling and publishing content across your social channels.
        </p>

        {/* Supporting Copy 2 */}
        <p className="mt-3 text-sm text-[#9e9d98]/80 max-w-2xl mx-auto font-mono">
          Bring your own AI and platform credentials. We provide the creative workflow and publishing infrastructure.
        </p>

        {/* Hero CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto text-base font-semibold bg-gradient-to-r from-[#c5a059] to-[#d4af37] text-[#0b0c0e] hover:opacity-95 px-8 py-4 rounded-xl shadow-lg shadow-[#c5a059]/20 transition-all flex items-center justify-center gap-3"
          >
            Start Creating <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto text-base font-medium bg-[#14161a] hover:bg-[#1c1f26] border border-white/10 text-[#f5f4f0] hover:border-[#c5a059]/40 px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Explore the Platform
          </a>
        </div>

        {/* HERO VISUAL — WORKFLOW STUDIO MOCKUP */}
        <div className="mt-16 relative mx-auto max-w-5xl rounded-2xl border border-white/10 bg-[#14161a]/95 backdrop-blur-2xl p-5 md:p-8 shadow-2xl text-left">
          {/* Top Window Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-[#9e9d98] ml-3 font-mono">
                studio.aisocial.io / orchestration-pipeline
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#c5a059] bg-[#c5a059]/10 border border-[#c5a059]/30 px-3 py-1 rounded-full font-mono">
              <Zap className="w-3.5 h-3.5 fill-[#c5a059]" /> Production Engine • Active
            </div>
          </div>

          {/* Workflow Sequence Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-[#0b0c0e] border border-[#c5a059]/30 relative overflow-hidden">
              <div className="flex items-center justify-between text-[11px] text-[#c5a059] font-mono mb-2">
                <span>01 IDEA</span>
                <Target className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-bold text-[#f5f4f0]">Master Topic</p>
              <p className="text-[11px] text-[#9e9d98] mt-1 line-clamp-2">"3 AI tools developers must master"</p>
              <span className="inline-block mt-3 text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-mono">
                ✓ Validated
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
              <div className="flex items-center justify-between text-[11px] text-[#9e9d98] font-mono mb-2">
                <span>02 CREATE</span>
                <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
              </div>
              <p className="text-xs font-bold text-[#f5f4f0]">AI Generation</p>
              <p className="text-[11px] text-[#9e9d98] mt-1">Multi-image & script generated</p>
              <span className="inline-block mt-3 text-[10px] text-[#c5a059] bg-[#c5a059]/10 px-2 py-0.5 rounded font-mono">
                DALL-E + GPT-4o
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
              <div className="flex items-center justify-between text-[11px] text-[#9e9d98] font-mono mb-2">
                <span>03 EDIT</span>
                <Wrench className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-xs font-bold text-[#f5f4f0]">Timeline Scene</p>
              <p className="text-[11px] text-[#9e9d98] mt-1">Voiceover + text overlays</p>
              <span className="inline-block mt-3 text-[10px] text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded font-mono">
                4 Scenes Ready
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
              <div className="flex items-center justify-between text-[11px] text-[#9e9d98] font-mono mb-2">
                <span>04 REPURPOSE</span>
                <Share2 className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <p className="text-xs font-bold text-[#f5f4f0]">Multi-Format</p>
              <p className="text-[11px] text-[#9e9d98] mt-1">Shorts, Reels, Thread & Carousel</p>
              <span className="inline-block mt-3 text-[10px] text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded font-mono">
                6 Formats
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
              <div className="flex items-center justify-between text-[11px] text-[#9e9d98] font-mono mb-2">
                <span>05 SCHEDULE</span>
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-xs font-bold text-[#f5f4f0]">Queue Calendar</p>
              <p className="text-[11px] text-[#9e9d98] mt-1">Optimal posting slots set</p>
              <span className="inline-block mt-3 text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded font-mono">
                Tomorrow 10:00 AM
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0c0e] border border-emerald-500/30">
              <div className="flex items-center justify-between text-[11px] text-emerald-400 font-mono mb-2">
                <span>06 PUBLISH</span>
                <Zap className="w-3.5 h-3.5 fill-emerald-400" />
              </div>
              <p className="text-xs font-bold text-[#f5f4f0]">Direct API Sync</p>
              <p className="text-[11px] text-[#9e9d98] mt-1">YouTube + Instagram + X</p>
              <span className="inline-block mt-3 text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-mono">
                Live Published
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION 2 — PLATFORM VALUE (HORIZONTAL WORKFLOW) */}
      <section id="features" className="py-20 border-t border-white/10 bg-[#0d0f12]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-medium text-[#c5a059] tracking-widest uppercase mb-3">
              Platform Workflow
            </h2>
            <h3 className="text-3xl sm:text-5xl font-bold text-[#f5f4f0]">
              From one idea to every channel.
            </h3>
            <p className="text-[#9e9d98] mt-4 text-base">
              A structured end-to-end publishing pipeline engineered for modern digital creators and teams.
            </p>
          </div>

          {/* Clean Horizontal Sequence Pipeline */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {workflowSteps.map((ws, i) => {
              const IconComp = ws.icon;
              return (
                <div
                  key={ws.step}
                  className="p-5 rounded-xl bg-[#14161a] border border-white/10 hover:border-[#c5a059]/40 transition-all text-center group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-[#0b0c0e] border border-white/10 flex items-center justify-center mx-auto text-[#c5a059] mb-3 group-hover:scale-110 transition-transform">
                      <IconComp className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[11px] font-mono text-[#c5a059] block font-bold">
                      {ws.step}
                    </span>
                    <h4 className="text-sm font-bold text-[#f5f4f0] mt-1 tracking-wide">
                      {ws.name}
                    </h4>
                  </div>
                  <p className="text-[11px] text-[#9e9d98] mt-3 leading-snug">
                    {ws.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. SECTION 3 — CORE CAPABILITIES (6 CARDS) */}
      <section id="capabilities" className="py-24 border-t border-white/10 bg-[#0b0c0e]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-medium text-[#c5a059] tracking-widest uppercase mb-3">
              Core Architecture
            </h2>
            <h3 className="text-3xl sm:text-5xl font-bold text-[#f5f4f0]">
              Built for high-output content operations.
            </h3>
            <p className="text-[#9e9d98] mt-4 text-base">
              Six core studio systems unified into one single creative workspace.
            </p>
          </div>

          {/* 6 Capabilities Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {coreCapabilities.map((cap) => {
              const IconComp = cap.icon;
              return (
                <div
                  key={cap.id}
                  className="p-8 rounded-2xl bg-[#14161a] border border-white/10 hover:border-[#c5a059]/40 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-[#0b0c0e] border border-[#c5a059]/30 flex items-center justify-center text-[#c5a059] mb-6 group-hover:scale-105 transition-transform">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <h4 className="text-xl font-bold text-[#f5f4f0]">
                      {cap.title}
                    </h4>
                    <p className="text-sm text-[#9e9d98] mt-3 leading-relaxed">
                      {cap.desc}
                    </p>
                  </div>

                  <ul className="mt-8 pt-6 border-t border-white/10 space-y-2.5 text-xs text-[#9e9d98] font-mono">
                    {cap.items.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. SECTION 4 — PLATFORMS */}
      <section id="platforms" className="py-24 border-t border-white/10 bg-[#0d0f12]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-medium text-[#c5a059] tracking-widest uppercase mb-3">
              Multi-Channel Distribution
            </h2>
            <h3 className="text-3xl sm:text-5xl font-bold text-[#f5f4f0]">
              One workflow. Multiple platforms.
            </h3>
            <p className="text-[#9e9d98] mt-4 text-base">
              Publish directly across major social networks and long-form video platforms.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {platforms.map((p, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[#14161a] border border-white/10 hover:border-[#c5a059]/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-[#f5f4f0]">{p.name}</span>
                    <Globe className="w-4 h-4 text-[#c5a059]" />
                  </div>
                  <span className="text-xs font-mono text-[#c5a059] block mb-2">{p.category}</span>
                  <p className="text-xs text-[#9e9d98] leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Platform Configuration Note */}
          <div className="mt-12 text-center">
            <p className="text-xs text-[#9e9d98] max-w-2xl mx-auto font-mono bg-[#14161a] border border-white/10 px-4 py-3 rounded-xl inline-block">
              * Connect the platforms and provider accounts you use. Availability depends on your account and API configuration.
            </p>
          </div>
        </div>
      </section>

      {/* 6. SECTION 5 — BRING YOUR OWN PROVIDERS (BYOK) */}
      <section id="byok" className="py-24 border-t border-white/10 bg-[#0b0c0e]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="p-8 md:p-14 rounded-3xl bg-gradient-to-br from-[#14161a] via-[#16181d] to-[#0b0c0e] border border-[#c5a059]/30 relative overflow-hidden">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/30 text-xs font-mono font-medium uppercase tracking-wider mb-6">
                <Key className="w-3.5 h-3.5" /> Bring Your Own Keys & Credentials
              </div>
              <h3 className="text-3xl sm:text-5xl font-bold text-[#f5f4f0] leading-tight">
                Your accounts. Your providers. Your workflow.
              </h3>
              <p className="text-[#9e9d98] text-base md:text-lg mt-6 leading-relaxed">
                AI Social Media Studio gives you one place to manage your creative workflow. Connect the AI providers and social platforms you use, then create and publish from one professional workspace.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/10">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#c5a059] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-[#f5f4f0]">Bring your own AI & API credentials</h4>
                    <p className="text-xs text-[#9e9d98] mt-1">Connect OpenAI, Runway, Luma, or ElevenLabs directly.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#c5a059] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-[#f5f4f0]">Connect your social accounts</h4>
                    <p className="text-xs text-[#9e9d98] mt-1">Secure OAuth 2.0 connection to YouTube, Meta & X.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#c5a059] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-[#f5f4f0]">Control provider usage</h4>
                    <p className="text-xs text-[#9e9d98] mt-1">Maintain full ownership of your API limits and usage costs.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#c5a059] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-[#f5f4f0]">Centralized workspace workflow</h4>
                    <p className="text-xs text-[#9e9d98] mt-1">Orchestrate creation, timeline editing & publishing in one place.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECTION 6 — HOW IT WORKS (4 STEPS) */}
      <section id="how-it-works" className="py-24 border-t border-white/10 bg-[#0d0f12]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-medium text-[#c5a059] tracking-widest uppercase mb-3">
              Simple Execution Process
            </h2>
            <h3 className="text-3xl sm:text-5xl font-bold text-[#f5f4f0]">
              How AI Social Media Studio works
            </h3>
            <p className="text-[#9e9d98] mt-4 text-base">
              Four linear steps from initial configuration to published social reach.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {howItWorksSteps.map((stepItem) => {
              const IconComp = stepItem.icon;
              return (
                <div
                  key={stepItem.step}
                  className="p-8 rounded-2xl bg-[#14161a] border border-white/10 hover:border-[#c5a059]/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="text-3xl font-extrabold text-[#c5a059] font-mono block">
                      {stepItem.step}
                    </span>
                    <h4 className="text-xl font-bold text-[#f5f4f0] mt-4 flex items-center gap-2">
                      <IconComp className="w-5 h-5 text-[#c5a059]" />
                      {stepItem.title}
                    </h4>
                    <p className="text-xs text-[#9e9d98] mt-3 leading-relaxed">
                      {stepItem.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. SECTION 7 — PRODUCT SHOWCASE (CONNECTED INTERFACE PREVIEWS) */}
      <section className="py-24 border-t border-white/10 bg-[#0b0c0e]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-mono font-medium text-[#c5a059] tracking-widest uppercase mb-3">
              Interface Preview
            </h2>
            <h3 className="text-3xl sm:text-5xl font-bold text-[#f5f4f0]">
              Explore the Studio Environment
            </h3>
            <p className="text-[#9e9d98] mt-4 text-base">
              One unified interface accommodating all stages of content creation and publishing.
            </p>
          </div>

          {/* Module Switcher Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {showcaseTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveShowcaseTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-xs font-mono transition-all border ${
                  activeShowcaseTab === tab.id
                    ? "bg-[#c5a059] text-[#0b0c0e] font-bold border-[#c5a059]"
                    : "bg-[#14161a] text-[#9e9d98] border-white/10 hover:border-white/30 hover:text-[#f5f4f0]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Interactive Preview Container */}
          <div className="rounded-2xl border border-white/10 bg-[#14161a] p-6 md:p-8 min-h-[420px] flex flex-col justify-between">
            {activeShowcaseTab === "command-center" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <FolderKanban className="w-5 h-5 text-[#c5a059]" />
                    <h4 className="text-lg font-bold text-[#f5f4f0]">Content Command Center</h4>
                  </div>
                  <span className="text-xs text-[#c5a059] font-mono bg-[#c5a059]/10 px-3 py-1 rounded-full border border-[#c5a059]/30">
                    Project Active
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left font-mono">
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">PROJECT</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">Multi-Platform Product Launch</p>
                    <p className="text-[11px] text-emerald-400 mt-2">6 Platforms Configured</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">PACKAGE STATUS</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">100% Package Generated</p>
                    <p className="text-[11px] text-[#c5a059] mt-2">Shorts + Carousel + Copy</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">APPROVAL STATE</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">Pending Human Review</p>
                    <p className="text-[11px] text-indigo-400 mt-2">Score: 96/100</p>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === "image-studio" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-[#c5a059]" />
                    <h4 className="text-lg font-bold text-[#f5f4f0]">AI Multi-Image Creative Studio</h4>
                  </div>
                  <span className="text-xs text-[#9e9d98] font-mono">DALL-E 3 • 4:5 Aspect</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left font-mono">
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">INPUT ASSET</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">Product Reference Photo</p>
                    <span className="text-[11px] text-[#c5a059] mt-2 block">5 Inputs Attached</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">STYLE PRESET</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">Luxury & Studio Lighting</p>
                    <span className="text-[11px] text-emerald-400 mt-2 block">High Resolution</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">VARIANTS</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">4 Creative Variants</p>
                    <span className="text-[11px] text-indigo-400 mt-2 block">Ready for Carousel</span>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === "video-studio" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-[#c5a059]" />
                    <h4 className="text-lg font-bold text-[#f5f4f0]">AI Short Video Studio</h4>
                  </div>
                  <span className="text-xs text-[#9e9d98] font-mono">9:16 Vertical MP4 • 30s</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left font-mono">
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">COMPOSITION</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">Pro Multi-Scene Mode</p>
                    <span className="text-[11px] text-emerald-400 mt-2 block">10 Images Transition</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">AUDIO TRACKS</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">ElevenLabs Voiceover</p>
                    <span className="text-[11px] text-[#c5a059] mt-2 block">Background Music Layer</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">JOB STATUS</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">Composition Complete</p>
                    <span className="text-[11px] text-indigo-400 mt-2 block">Export MP4 Ready</span>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === "media-editor" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-[#c5a059]" />
                    <h4 className="text-lg font-bold text-[#f5f4f0]">Multi-Track Media Editor</h4>
                  </div>
                  <span className="text-xs text-[#9e9d98] font-mono">Timeline v2.4 • 4 Scenes</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left font-mono">
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">SCENE CONTROL</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">Narration & Timings</p>
                    <span className="text-[11px] text-[#c5a059] mt-2 block">AI Scene Regenerate</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">TEXT OVERLAYS</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">Headlines & Captions</p>
                    <span className="text-[11px] text-emerald-400 mt-2 block">Smart Subtitles On</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">VERSIONING</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">Version History Log</p>
                    <span className="text-[11px] text-indigo-400 mt-2 block">Save & Restore Point</span>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === "calendar" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-[#c5a059]" />
                    <h4 className="text-lg font-bold text-[#f5f4f0]">AI Content Calendar</h4>
                  </div>
                  <span className="text-xs text-[#9e9d98] font-mono">7-Day & 30-Day Plan</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left font-mono">
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">AI PLANNER</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">7-Day Content Plan</p>
                    <span className="text-[11px] text-emerald-400 mt-2 block">Auto-Generated</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">SCHEDULE QUEUE</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">18 Posts Scheduled</p>
                    <span className="text-[11px] text-[#c5a059] mt-2 block">YouTube & Instagram</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">WORKER STATUS</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">Background Sync Active</p>
                    <span className="text-[11px] text-indigo-400 mt-2 block">Idempotent Publishing</span>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === "analytics" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-[#c5a059]" />
                    <h4 className="text-lg font-bold text-[#f5f4f0]">Performance Intelligence</h4>
                  </div>
                  <span className="text-xs text-[#9e9d98] font-mono">Real Direct API Metrics</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left font-mono">
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">VIEWS & REACH</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">1.42M Total Views</p>
                    <span className="text-[11px] text-emerald-400 mt-2 block">↑ +32% Growth</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">ENGAGEMENT RATE</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">8.4% Engagement</p>
                    <span className="text-[11px] text-[#c5a059] mt-2 block">Across 8 Channels</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0c0e] border border-white/10">
                    <span className="text-[11px] text-[#9e9d98]">PATTERN DETECTOR</span>
                    <p className="text-sm font-bold text-[#f5f4f0] mt-1">AI Recommendation</p>
                    <span className="text-[11px] text-indigo-400 mt-2 block">High-Intent Carousels</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 9. SECTION 8 — FINAL CTA */}
      <section className="py-24 border-t border-white/10 bg-[#0d0f12] text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl sm:text-6xl font-extrabold text-[#f5f4f0] tracking-tight">
            Your content workflow,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f5f4f0] via-[#c5a059] to-[#d4af37]">
              finally in one place.
            </span>
          </h2>
          <p className="text-lg text-[#9e9d98] mt-5 max-w-2xl mx-auto">
            Create faster. Repurpose smarter. Publish everywhere.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto text-base font-semibold bg-gradient-to-r from-[#c5a059] to-[#d4af37] text-[#0b0c0e] hover:opacity-95 px-9 py-4 rounded-xl shadow-lg shadow-[#c5a059]/20 transition-all flex items-center justify-center gap-3"
            >
              Start Creating <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto text-base font-medium bg-[#14161a] hover:bg-[#1c1f26] border border-white/10 text-[#f5f4f0] hover:border-[#c5a059]/40 px-8 py-4 rounded-xl transition-all flex items-center justify-center"
            >
              Explore Platform
            </a>
          </div>
        </div>
      </section>

      {/* 10. SECTION 9 — FOOTER */}
      <footer className="border-t border-white/10 py-16 bg-[#08090b] text-xs text-[#9e9d98]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10 text-left">
            {/* BRAND COL */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#c5a059]" />
                </div>
                <span className="text-sm font-bold text-[#f5f4f0] tracking-tight font-sans">
                  AI SOCIAL <span className="text-[#c5a059] font-medium text-xs">STUDIO</span>
                </span>
              </div>
              <p className="text-xs text-[#9e9d98] leading-relaxed">
                Unified content orchestration platform. Connect your own providers and social media channels to create, edit, repurpose and publish.
              </p>
            </div>

            {/* NAV COL 1 — PRODUCT */}
            <div>
              <h5 className="text-xs font-mono font-bold text-[#f5f4f0] uppercase tracking-wider mb-4">
                Product
              </h5>
              <ul className="space-y-2.5">
                <li>
                  <a href="#features" className="hover:text-[#f5f4f0] transition-colors">
                    Product Workflow
                  </a>
                </li>
                <li>
                  <a href="#capabilities" className="hover:text-[#f5f4f0] transition-colors">
                    Core Features
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-[#f5f4f0] transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#platforms" className="hover:text-[#f5f4f0] transition-colors">
                    Supported Platforms
                  </a>
                </li>
                <li>
                  <a href="#byok" className="hover:text-[#f5f4f0] transition-colors">
                    BYOK Model
                  </a>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-[#f5f4f0] transition-colors">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            {/* NAV COL 2 — COMPANY */}
            <div>
              <h5 className="text-xs font-mono font-bold text-[#f5f4f0] uppercase tracking-wider mb-4">
                Company
              </h5>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/about" className="hover:text-[#f5f4f0] transition-colors">
                    About Platform
                  </Link>
                </li>
                <li>
                  <a href="#contact" className="hover:text-[#f5f4f0] transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <Link href="/login" className="hover:text-[#f5f4f0] transition-colors">
                    Studio Login
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-[#f5f4f0] transition-colors">
                    Sign Up Free
                  </Link>
                </li>
              </ul>
            </div>

            {/* NAV COL 3 — LEGAL & COMPLIANCE */}
            <div>
              <h5 className="text-xs font-mono font-bold text-[#f5f4f0] uppercase tracking-wider mb-4">
                Legal & Governance
              </h5>
              <ul className="space-y-2.5">
                <li>
                  <a href="#" className="hover:text-[#f5f4f0] transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#f5f4f0] transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#f5f4f0] transition-colors">
                    API Credentials Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#f5f4f0] transition-colors">
                    Security Architecture
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* BOTTOM BAR */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono">
            <span>© 2026 AI Social Media Studio. All rights reserved.</span>
            <div className="flex items-center gap-6 text-[#9e9d98]">
              <span>Privacy</span>
              <span>•</span>
              <span>Terms</span>
              <span>•</span>
              <span>Security</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

