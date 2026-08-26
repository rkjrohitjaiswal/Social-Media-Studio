"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Bookmark,
  PlusCircle,
  X,
} from "lucide-react";
import { SEED_TEMPLATES, TemplateDefinition } from "@ai-social/shared";
import { getAuthHeader } from "@/lib/api-client";

export default function TemplatesPage() {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDefinition | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const categories = [
    { id: "ALL", label: "All Categories" },
    { id: "INSTAGRAM", label: "Instagram" },
    { id: "LINKEDIN", label: "LinkedIn" },
    { id: "YOUTUBE", label: "YouTube" },
    { id: "GENERAL", label: "General" },
  ];

  const filteredTemplates = SEED_TEMPLATES.filter((tpl) => {
    const matchesCategory = categoryFilter === "ALL" || tpl.category === categoryFilter;
    const matchesPlatform = platformFilter === "ALL" || tpl.platform === platformFilter;
    const matchesSearch =
      !searchQuery ||
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesPlatform && matchesSearch;
  });

  const handleUseTemplate = (tpl: TemplateDefinition) => {
    router.push(`/create?templateId=${tpl.id}&topic=${encodeURIComponent(tpl.name)}`);
  };

  const handleSaveTemplate = async (tpl: TemplateDefinition) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      await fetch(`${apiBase}/api/saved`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          itemType: "TEMPLATE",
          itemId: tpl.id,
          title: tpl.name,
          contentJson: tpl,
        }),
      });

      setSavedIds((prev) => [...prev, tpl.id]);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-16">
      {/* HEADER STATEMENT */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-semibold uppercase tracking-widest">
          <Layers className="w-3.5 h-3.5" />
          <span>Proven Creative Formats</span>
        </div>
        <h1 className="font-serif-luxury text-3xl md:text-5xl font-bold text-[#f5f4f0]">
          High-Converting Social Templates
        </h1>
        <p className="text-xs md:text-sm text-[#9e9d98] max-w-3xl">
          Browse and preview structured content frameworks. Launch any template directly into the AI Creation Studio to auto-generate customized copy.
        </p>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                categoryFilter === cat.id
                  ? "bg-[#c5a059] text-black border-[#c5a059] shadow-lg"
                  : "bg-[#1c1f26] text-[#9e9d98] border-white/5 hover:border-white/20 hover:text-[#f5f4f0]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-[#14161a] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f5f4f0] focus:outline-none"
          >
            <option value="ALL">All Platforms</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="X">X (Twitter)</option>
          </select>

          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#14161a] border border-white/10 rounded-xl px-4 py-2 text-xs text-[#f5f4f0] placeholder-[#6b6a65] focus:outline-none focus:border-[#c5a059]/50"
          />
        </div>
      </div>

      {/* TEMPLATES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((tpl) => {
          const isSaved = savedIds.includes(tpl.id);
          return (
            <div
              key={tpl.id}
              className="glass-card p-6 rounded-3xl flex flex-col justify-between space-y-6 hover:border-[#c5a059]/50 transition-all group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-[#c5a059] font-bold">
                    {tpl.platform} · {tpl.contentType}
                  </span>
                  {tpl.badge && (
                    <span className="px-2 py-0.5 rounded bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/30 text-[9px] font-bold">
                      {tpl.badge}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0] group-hover:text-[#c5a059] transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-[#9e9d98] leading-relaxed mt-1.5">{tpl.description}</p>
                </div>

                {/* PREVIEW BOX */}
                <div className="p-3 rounded-2xl bg-[#14161a] border border-white/5 text-[11px] text-[#9e9d98] italic font-serif leading-relaxed line-clamp-2">
                  &quot;{tpl.previewText}&quot;
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleSaveTemplate(tpl)}
                  className="p-2.5 rounded-xl bg-[#14161a] border border-white/10 hover:border-rose-400 text-xs text-[#9e9d98] hover:text-rose-400 transition-colors"
                  title="Save Template"
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? "text-rose-400 fill-rose-400" : ""}`} />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewTemplate(tpl)}
                    className="px-3.5 py-2 rounded-xl bg-[#1c1f26] border border-white/10 text-xs font-semibold text-[#f5f4f0] hover:border-white/30 transition-all"
                  >
                    Preview
                  </button>

                  <button
                    onClick={() => handleUseTemplate(tpl)}
                    className="px-4 py-2 rounded-xl bg-[#c5a059] text-black font-bold text-xs flex items-center gap-1.5 hover:brightness-110 transition-all"
                  >
                    <span>Use Template</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#14161a] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setPreviewTemplate(null)}
              className="absolute top-6 right-6 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9e9d98]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/30 text-[10px] font-bold font-mono">
                {previewTemplate.platform} · {previewTemplate.contentType}
              </span>
              <h2 className="font-serif-luxury text-2xl font-bold text-[#f5f4f0]">{previewTemplate.name}</h2>
              <p className="text-xs text-[#9e9d98]">{previewTemplate.description}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#c5a059] uppercase tracking-wider block">
                Structured Post Outline
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {previewTemplate.structure.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#1c1f26] border border-white/5 text-xs text-[#f5f4f0]">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs text-[#9e9d98]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleUseTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="px-5 py-2 rounded-xl bg-[#c5a059] text-black font-bold text-xs flex items-center gap-2 hover:brightness-110 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create with this Template</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
