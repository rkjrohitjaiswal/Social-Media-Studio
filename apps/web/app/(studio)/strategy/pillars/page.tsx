"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  PlusCircle,
  Sparkles,
  Trash2,
  Edit2,
  Loader2,
  X,
} from "lucide-react";
import { ContentPillarInput } from "@ai-social/shared";
import { getAuthHeader } from "@/lib/api-client";

interface PillarRecord extends ContentPillarInput {
  id: string;
}

interface IdeaItem {
  topic: string;
  hook: string;
  contentType: string;
  platform: string;
  cta: string;
}

export default function ContentPillarsPage() {
  const [pillars, setPillars] = useState<PillarRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPillar, setEditingPillar] = useState<PillarRecord | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [percentageAllocation, setPercentageAllocation] = useState(20);
  const [color, setColor] = useState("#c5a059");

  // Idea Generation Modal State
  const [ideasPillar, setIdeasPillar] = useState<PillarRecord | null>(null);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<IdeaItem[]>([]);

  useEffect(() => {
    let isSubscribed = true;

    async function loadPillars() {
      setIsLoading(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const authHeader = await getAuthHeader();
        const res = await fetch(`${apiBase}/api/strategy/pillars`, { headers: { ...authHeader } });
        const json = await res.json();
        if (isSubscribed && json.success) {
          setPillars(json.data || []);
        }
      } catch {
        if (isSubscribed) setPillars([]);
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    loadPillars();
    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleSavePillar = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      if (editingPillar) {
        // Edit existing
        const res = await fetch(`${apiBase}/api/strategy/pillars/${editingPillar.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ name, description, purpose, percentageAllocation, color }),
        });
        const json = await res.json();
        if (json.success) {
          setPillars((prev) => prev.map((p) => (p.id === editingPillar.id ? json.data : p)));
        }
      } else {
        // Create new
        const res = await fetch(`${apiBase}/api/strategy/pillars`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ name, description, purpose, percentageAllocation, color }),
        });
        const json = await res.json();
        if (json.success) {
          setPillars((prev) => [...prev, json.data]);
        }
      }

      setShowCreateModal(false);
      setEditingPillar(null);
      setName("");
      setDescription("");
      setPurpose("");
    } catch {
      // Handle error
    }
  };

  const handleDeletePillar = async (id: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();
      await fetch(`${apiBase}/api/strategy/pillars/${id}`, {
        method: "DELETE",
        headers: { ...authHeader },
      });
      setPillars((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // Handle error
    }
  };

  const handleGenerateIdeas = async (pillar: PillarRecord) => {
    setIdeasPillar(pillar);
    setIsGeneratingIdeas(true);
    setGeneratedIdeas([]);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      const res = await fetch(`${apiBase}/api/strategy/pillars/${pillar.id}/generate-ideas`, {
        method: "POST",
        headers: { ...authHeader },
      });

      const json = await res.json();
      if (json.success) {
        setGeneratedIdeas(json.data.ideas || []);
      }
    } catch {
      // Error
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-16">
      {/* HEADER STATEMENT */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-semibold uppercase tracking-widest">
            <Layers className="w-3.5 h-3.5" />
            <span>Reusable Content Architecture</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-5xl font-bold text-[#f5f4f0]">
            Content Pillars Manager
          </h1>
          <p className="text-xs md:text-sm text-[#9e9d98] max-w-3xl">
            Define and manage your core strategic themes. Generate AI ideas for any pillar to populate your calendar.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPillar(null);
            setName("");
            setDescription("");
            setPurpose("");
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#c5a059] text-black font-bold text-xs flex items-center gap-2 hover:brightness-110 transition-all shadow-lg"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Content Pillar</span>
        </button>
      </div>

      {/* PILLARS GRID */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#c5a059] mx-auto" />
          <p className="text-xs text-[#9e9d98]">Fetching content pillars...</p>
        </div>
      ) : pillars.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl text-center space-y-4 max-w-md mx-auto">
          <Layers className="w-12 h-12 text-[#9e9d98] mx-auto opacity-40" />
          <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0]">No Content Pillars Defined</h3>
          <p className="text-xs text-[#9e9d98]">Create custom themes to structure your posting strategy.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.filter((p): p is PillarRecord => Boolean(p) && typeof p === "object" && Boolean(p.id)).map((pillar) => (
            <div
              key={pillar.id}
              className="glass-card p-6 rounded-3xl flex flex-col justify-between space-y-6 hover:border-[#c5a059]/40 transition-all group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border"
                    style={{
                      backgroundColor: `${pillar.color || "#c5a059"}20`,
                      borderColor: `${pillar.color || "#c5a059"}40`,
                      color: pillar.color || "#c5a059",
                    }}
                  >
                    {pillar.percentageAllocation}% Allocation
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingPillar(pillar);
                        setName(pillar.name);
                        setDescription(pillar.description);
                        setPurpose(pillar.purpose || "");
                        setPercentageAllocation(pillar.percentageAllocation);
                        setColor(pillar.color || "#c5a059");
                        setShowCreateModal(true);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#9e9d98] transition-colors"
                      title="Edit Pillar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePillar(pillar.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-[#9e9d98] hover:text-rose-400 transition-colors"
                      title="Delete Pillar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0] group-hover:text-[#c5a059] transition-colors">
                    {pillar.name}
                  </h3>
                  <p className="text-xs text-[#9e9d98] leading-relaxed mt-1.5">{pillar.description}</p>
                </div>

                {pillar.purpose && (
                  <div className="p-3 rounded-2xl bg-[#14161a] border border-white/5 text-[11px] text-[#9e9d98]">
                    <strong className="text-[#f5f4f0]">Purpose:</strong> {pillar.purpose}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleGenerateIdeas(pillar)}
                className="w-full py-2.5 rounded-xl bg-[#1c1f26] border border-white/10 hover:border-[#c5a059] text-xs font-bold text-[#f5f4f0] hover:text-[#c5a059] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
                <span>Generate AI Ideas</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#14161a] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl relative">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 p-1.5 rounded-xl bg-white/5 text-[#9e9d98]">
              <X className="w-4 h-4" />
            </button>

            <h2 className="font-serif-luxury text-2xl font-bold text-[#f5f4f0]">
              {editingPillar ? "Edit Content Pillar" : "Create Content Pillar"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#9e9d98] mb-1">Pillar Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Educational Carousels, Behind The Scenes..."
                  className="w-full bg-[#1c1f26] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9e9d98] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the content theme and focus..."
                  className="w-full bg-[#1c1f26] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9e9d98] mb-1">Strategic Purpose</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Build trust, drive lead signups..."
                  className="w-full bg-[#1c1f26] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9e9d98] mb-1">Allocation %</label>
                  <input
                    type="number"
                    value={percentageAllocation}
                    onChange={(e) => setPercentageAllocation(Number(e.target.value))}
                    className="w-full bg-[#1c1f26] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9e9d98] mb-1">Color Tag</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-10 bg-[#1c1f26] border border-white/10 rounded-xl p-1 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-[#9e9d98]">
                Cancel
              </button>
              <button
                onClick={handleSavePillar}
                className="px-5 py-2 rounded-xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 transition-all"
              >
                Save Pillar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE IDEAS MODAL */}
      {ideasPillar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#14161a] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
            <button onClick={() => setIdeasPillar(null)} className="absolute top-6 right-6 p-1.5 rounded-xl bg-white/5 text-[#9e9d98]">
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-[#c5a059] text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Ideas for &quot;{ideasPillar.name}&quot;</span>
              </div>
              <h2 className="font-serif-luxury text-2xl font-bold text-[#f5f4f0]">Generated Content Concepts</h2>
            </div>

            {isGeneratingIdeas ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#c5a059] mx-auto" />
                <p className="text-xs text-[#9e9d98]">Brainstorming high-converting post concepts (1 Credit)...</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {generatedIdeas.map((idea, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#1c1f26] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-[#c5a059]/20 text-[#c5a059] text-[10px] font-mono font-bold">
                        {idea.platform} · {idea.contentType}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-[#f5f4f0]">{idea.topic}</h4>
                    <p className="text-xs text-[#9e9d98] italic font-serif">&quot;{idea.hook}&quot;</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button onClick={() => setIdeasPillar(null)} className="px-5 py-2 rounded-xl bg-[#c5a059] text-black font-bold text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
