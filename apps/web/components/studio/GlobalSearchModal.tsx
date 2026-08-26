"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, Loader2, Sparkles, Filter, FileText, Layout, Layers, Bookmark, Wrench, Target } from "lucide-react";
import { getAuthHeader } from "@/lib/api-client";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("");
  const [contentType, setContentType] = useState("");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      if (!query && !platform && !contentType) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const authHeader = await getAuthHeader();
        const params = new URLSearchParams();
        if (query) params.append("q", query);
        if (platform) params.append("platform", platform);
        if (contentType) params.append("contentType", contentType);

        const res = await fetch(`${apiBase}/api/search?${params.toString()}`, {
          headers: { ...authHeader },
        });
        const json = await res.json();
        if (json.success) {
          setResults(json.data.results || []);
        }
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, platform, contentType, isOpen]);

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "TOOL":
        return <Wrench className="w-4 h-4 text-[#c5a059]" />;
      case "GOAL":
        return <Target className="w-4 h-4 text-emerald-400" />;
      case "TEMPLATE":
        return <Layers className="w-4 h-4 text-indigo-400" />;
      case "BRAND":
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case "SAVED_CONTENT":
        return <Bookmark className="w-4 h-4 text-rose-400" />;
      default:
        return <FileText className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 sm:p-6 md:p-20 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#14161a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* HEADER INPUT */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#0b0c0e]/50">
          <Search className="w-5 h-5 text-[#c5a059]" />
          <input
            type="text"
            placeholder="Search AI tools, goals, templates, brands, saved content... (Cmd+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-[#f5f4f0] placeholder-[#9e9d98] focus:outline-none"
            autoFocus
          />
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" />
          ) : (
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-[#9e9d98]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* FILTERS */}
        <div className="px-4 py-2 bg-[#1c1f26]/40 border-b border-white/5 flex items-center gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-1 text-[#9e9d98] mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-[#14161a] border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-[#f5f4f0] focus:outline-none"
          >
            <option value="">All Platforms</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="X">X (Twitter)</option>
            <option value="THREADS">Threads</option>
            <option value="PINTEREST">Pinterest</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="TIKTOK">TikTok</option>
          </select>

          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="bg-[#14161a] border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-[#f5f4f0] focus:outline-none"
          >
            <option value="">All Content Types</option>
            <option value="Post">Post</option>
            <option value="Reel">Reel</option>
            <option value="Carousel">Carousel</option>
            <option value="Story">Story</option>
            <option value="Thought Leadership">Thought Leadership</option>
          </select>
        </div>

        {/* RESULTS AREA */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
          {!query && !platform && !contentType ? (
            <div className="py-8 text-center space-y-2">
              <Layout className="w-8 h-8 text-[#9e9d98] mx-auto opacity-50" />
              <p className="text-xs text-[#9e9d98]">Type to search across AI Tools, Goals, Templates, and Studio Content</p>
              <div className="flex justify-center gap-2 pt-2">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-[#9e9d98]">Try: &quot;Hook Generator&quot;</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-[#9e9d98]">Try: &quot;Leads&quot;</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-[#9e9d98]">Try: &quot;Carousel&quot;</span>
              </div>
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="py-8 text-center text-xs text-[#9e9d98]">
              No resources matching &quot;<strong className="text-[#f5f4f0]">{query}</strong>&quot;
            </div>
          ) : (
            results.map((res) => (
              <Link
                key={res.id as string}
                href={res.url as string}
                onClick={onClose}
                className="p-3 rounded-xl bg-[#1c1f26]/60 border border-white/5 hover:border-[#c5a059]/50 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#14161a] border border-white/10">
                    {getTypeIcon(res.type as string)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#f5f4f0] group-hover:text-[#c5a059] transition-colors">
                      {res.title as string}
                    </div>
                    <div className="text-[11px] text-[#9e9d98] line-clamp-1">{res.description as string}</div>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-[#9e9d98] uppercase font-mono border border-white/5">
                  {res.type as string}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
