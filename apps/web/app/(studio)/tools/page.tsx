"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Wrench,
  Sparkles,
  FileText,
  Video,
  Layers,
  Calendar,
  Megaphone,
  Hash,
  Target,
  ShoppingBag,
  UserPlus,
  Flame,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { AI_TOOLS_REGISTRY } from "@ai-social/shared";

export default function ToolsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const categories: { id: string; label: string }[] = [
    { id: "ALL", label: "All 12 AI Tools" },
    { id: "COPYWRITING", label: "Copywriting" },
    { id: "VIDEO_SCRIPTS", label: "Video & Reels" },
    { id: "VISUAL_FORMATS", label: "Carousels & Layouts" },
    { id: "STRATEGY_PLANNING", label: "Strategy & Planning" },
    { id: "GROWTH_LEADS", label: "Growth & Leads" },
    { id: "ANALYTICS_AI", label: "Quality & Analytics" },
  ];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "FileText":
        return <FileText className="w-5 h-5 text-blue-400" />;
      case "Sparkles":
        return <Sparkles className="w-5 h-5 text-[#c5a059]" />;
      case "Video":
        return <Video className="w-5 h-5 text-purple-400" />;
      case "Layers":
        return <Layers className="w-5 h-5 text-indigo-400" />;
      case "Calendar":
        return <Calendar className="w-5 h-5 text-emerald-400" />;
      case "Megaphone":
        return <Megaphone className="w-5 h-5 text-amber-400" />;
      case "Hash":
        return <Hash className="w-5 h-5 text-pink-400" />;
      case "Target":
        return <Target className="w-5 h-5 text-emerald-400" />;
      case "ShoppingBag":
        return <ShoppingBag className="w-5 h-5 text-rose-400" />;
      case "UserPlus":
        return <UserPlus className="w-5 h-5 text-[#c5a059]" />;
      case "Flame":
        return <Flame className="w-5 h-5 text-orange-400" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    }
  };

  const filteredTools = AI_TOOLS_REGISTRY.filter((tool) => {
    const matchesCat = selectedCategory === "ALL" || tool.category === selectedCategory;
    const matchesQuery =
      !searchQuery ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-16">
      {/* HEADER STATEMENT */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-semibold uppercase tracking-widest">
          <Wrench className="w-3.5 h-3.5" />
          <span>Haute AI Toolkit</span>
        </div>
        <h1 className="font-serif-luxury text-3xl md:text-5xl font-bold text-[#f5f4f0]">
          Dedicated Social AI Tools & Workflows
        </h1>
        <p className="text-xs md:text-sm text-[#9e9d98] max-w-3xl">
          Purpose-built AI tools designed for specific creator and brand workflows. Powered by server-side credit enforcement and BYOK model architecture.
        </p>
      </div>

      {/* CATEGORY FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === cat.id
                  ? "bg-[#c5a059] text-black border-[#c5a059] shadow-lg"
                  : "bg-[#1c1f26] text-[#9e9d98] border-white/5 hover:border-white/20 hover:text-[#f5f4f0]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter tools by name or purpose..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-[#14161a] border border-white/10 rounded-xl px-4 py-2 text-xs text-[#f5f4f0] placeholder-[#6b6a65] focus:outline-none focus:border-[#c5a059]/50 w-full sm:w-64"
        />
      </div>

      {/* TOOLS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <div
            key={tool.id}
            className="glass-card p-6 rounded-3xl flex flex-col justify-between space-y-6 hover:border-[#c5a059]/50 transition-all group relative"
          >
            {tool.featured && (
              <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/40 text-[9px] font-bold uppercase tracking-widest">
                FEATURED
              </span>
            )}

            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-[#14161a] border border-white/10 w-fit">
                {getIcon(tool.iconName)}
              </div>

              <div>
                <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0] group-hover:text-[#c5a059] transition-colors">
                  {tool.name}
                </h3>
                <p className="text-xs text-[#9e9d98] leading-relaxed mt-1.5">{tool.description}</p>
              </div>

              <div className="flex gap-1.5 flex-wrap pt-2">
                {tool.supportedPlatforms.map((p) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-[#9e9d98]"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-[#9e9d98] font-mono">
                Cost: <strong className="text-[#f5f4f0]">{tool.workflowCreditCost} Credit</strong>
              </span>

              <Link
                href={`/tools/${tool.id}`}
                className="px-4 py-2.5 rounded-xl bg-[#1c1f26] border border-white/10 hover:border-[#c5a059] text-xs font-bold text-[#f5f4f0] hover:text-[#c5a059] transition-all flex items-center gap-1.5"
              >
                <span>Launch Tool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
