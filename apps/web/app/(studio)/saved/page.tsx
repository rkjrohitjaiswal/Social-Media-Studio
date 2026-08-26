"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bookmark,
  Trash2,
  Layers,
  Wrench,
  Loader2,
} from "lucide-react";
import { SavedItemRecord } from "@ai-social/shared";
import { getAuthHeader } from "@/lib/api-client";

export default function SavedPage() {
  const [savedItems, setSavedItems] = useState<SavedItemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadSaved() {
      setIsLoading(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const authHeader = await getAuthHeader();
        const res = await fetch(`${apiBase}/api/saved`, { headers: { ...authHeader } });
        const json = await res.json();
        if (isSubscribed && json.success) {
          setSavedItems(json.data || []);
        }
      } catch {
        if (isSubscribed) setSavedItems([]);
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    loadSaved();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleDeleteSavedItem = async (id: string) => {
    setDeletingId(id);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      await fetch(`${apiBase}/api/saved/${id}`, {
        method: "DELETE",
        headers: { ...authHeader },
      });

      setSavedItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // Ignore
    } finally {
      setDeletingId(null);
    }
  };

  const filteredItems = savedItems.filter((item) => {
    const matchesTab = activeTab === "ALL" || item.itemType === activeTab;
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case "TOOL":
        return <Wrench className="w-5 h-5 text-[#c5a059]" />;
      case "TEMPLATE":
        return <Layers className="w-5 h-5 text-indigo-400" />;
      default:
        return <Bookmark className="w-5 h-5 text-rose-400" />;
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-16">
      {/* HEADER STATEMENT */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-semibold uppercase tracking-widest">
          <Bookmark className="w-3.5 h-3.5" />
          <span>Saved Assets & Workflows</span>
        </div>
        <h1 className="font-serif-luxury text-3xl md:text-5xl font-bold text-[#f5f4f0]">
          Your Saved Vault
        </h1>
        <p className="text-xs md:text-sm text-[#9e9d98] max-w-3xl">
          Quickly access bookmarked AI tools, templates, content concepts, and generated assets across your workspace.
        </p>
      </div>

      {/* TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {[
            { id: "ALL", label: "All Saved Items" },
            { id: "CONTENT", label: "Generated Content" },
            { id: "TEMPLATE", label: "Templates" },
            { id: "TOOL", label: "AI Tools" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeTab === tab.id
                  ? "bg-[#c5a059] text-black border-[#c5a059] shadow-lg"
                  : "bg-[#1c1f26] text-[#9e9d98] border-white/5 hover:border-white/20 hover:text-[#f5f4f0]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search saved items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-[#14161a] border border-white/10 rounded-xl px-4 py-2 text-xs text-[#f5f4f0] placeholder-[#6b6a65] focus:outline-none focus:border-[#c5a059]/50 w-full sm:w-64"
        />
      </div>

      {/* CONTENT AREA */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#c5a059] mx-auto" />
          <p className="text-xs text-[#9e9d98]">Fetching your saved items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl text-center space-y-4 max-w-md mx-auto">
          <Bookmark className="w-12 h-12 text-[#9e9d98] mx-auto opacity-40" />
          <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0]">No Saved Items Found</h3>
          <p className="text-xs text-[#9e9d98]">
            Bookmark AI tool outputs or templates to store them safely in your personal vault.
          </p>
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 transition-all mt-2"
          >
            <span>Explore AI Tools</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="glass-card p-6 rounded-3xl flex flex-col justify-between space-y-4 hover:border-[#c5a059]/40 transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-[#14161a] border border-white/10">
                    {getItemIcon(item.itemType)}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-[#9e9d98] uppercase">
                    {item.itemType}
                  </span>
                </div>

                <h3 className="font-serif-luxury text-lg font-bold text-[#f5f4f0] line-clamp-1 group-hover:text-[#c5a059] transition-colors">
                  {item.title}
                </h3>

                <div className="p-3 rounded-2xl bg-[#14161a] border border-white/5 text-xs text-[#9e9d98] font-mono leading-relaxed line-clamp-3">
                  {typeof item.contentJson === "string"
                    ? item.contentJson
                    : JSON.stringify(item.contentJson || { Saved: true }, null, 2)}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] text-[#9e9d98] font-mono">
                  Saved: {new Date(item.createdAt).toLocaleDateString()}
                </span>

                <button
                  onClick={() => handleDeleteSavedItem(item.id)}
                  disabled={deletingId === item.id}
                  className="p-2 rounded-xl bg-white/5 hover:bg-[#a84b4b]/20 text-[#9e9d98] hover:text-[#a84b4b] transition-colors"
                  title="Remove from Saved"
                >
                  {deletingId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#a84b4b]" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
