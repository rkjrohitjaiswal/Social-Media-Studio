"use client";

import React, { useState } from "react";
import { Sparkles, RefreshCw, Check, Copy, Share2 } from "lucide-react";
import { repurposeContent } from "@/lib/api-client";
import { PlatformAdaptedOutput } from "@ai-social/shared";

const PLATFORMS = [
  { id: "INSTAGRAM", name: "Instagram" },
  { id: "LINKEDIN", name: "LinkedIn" },
  { id: "X", name: "X (Twitter)" },
  { id: "THREADS", name: "Threads" },
  { id: "FACEBOOK", name: "Facebook" },
  { id: "PINTEREST", name: "Pinterest" },
  { id: "YOUTUBE", name: "YouTube" },
];

export default function ContentRepurposePage() {
  const [sourceText, setSourceText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "INSTAGRAM",
    "LINKEDIN",
    "X",
  ]);
  const [provider, setProvider] = useState("OPENAI");
  const [loading, setLoading] = useState(false);
  const [outputs, setOutputs] = useState<Record<string, PlatformAdaptedOutput> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleRepurpose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceText.trim() || selectedPlatforms.length === 0) return;

    setLoading(true);
    setOutputs(null);
    setErrorMessage(null);

    try {
      const res = await repurposeContent({
        sourceText,
        targetPlatforms: selectedPlatforms,
        provider: provider as "OPENAI" | "GEMINI" | "ANTHROPIC" | "DEEPSEEK",
      });
      setOutputs(res.outputs);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to repurpose content");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8 pb-16 max-w-6xl">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Content Repurposing Studio</span>
        </div>
        <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
          Multi-Platform Content Repurposing
        </h1>
        <p className="text-xs text-[#9e9d98] mt-1">
          Paste long-form text, transcripts, or articles. AI incorporates your Brand Kit & BYOK provider to craft platform-optimized posts. (1 workflow credit)
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
          {errorMessage}
        </div>
      )}

      {/* FORM SECTION */}
      <form onSubmit={handleRepurpose} className="glass-card p-6 rounded-3xl space-y-6">
        <div>
          <label className="block text-xs text-[#9e9d98] mb-2 font-semibold">
            Source Content (Article, Transcript, Long Text)
          </label>
          <textarea
            rows={6}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste your source text here (e.g. 10 tips for learning React, podcast transcript, blog post snippet)..."
            className="w-full bg-[#0b0c0e] border border-white/10 rounded-2xl p-4 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none resize-none font-sans"
            required
          />
        </div>

        {/* PLATFORM SELECTION */}
        <div>
          <label className="block text-xs text-[#9e9d98] mb-2 font-semibold">
            Select Target Social Platforms
          </label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const active = selectedPlatforms.includes(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    active
                      ? "bg-[#c5a059] text-black border-[#c5a059]"
                      : "bg-[#1c1f26] text-[#9e9d98] border-white/10 hover:border-white/20"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* AI PROVIDER SELECTION */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#9e9d98]">AI Provider:</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
            >
              <option value="OPENAI">OpenAI (BYOK)</option>
              <option value="GEMINI">Google Gemini (BYOK)</option>
              <option value="ANTHROPIC">Anthropic Claude (BYOK)</option>
              <option value="DEEPSEEK">DeepSeek (BYOK)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !sourceText.trim() || selectedPlatforms.length === 0}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Repurposing..." : "Repurpose Content (1 Credit)"}
          </button>
        </div>
      </form>

      {/* OUTPUTS DISPLAY */}
      {outputs && (
        <div className="space-y-6">
          <h2 className="font-serif-luxury text-xl font-bold text-[#f5f4f0] flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#c5a059]" />
            Generated Platform-Specific Content
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(outputs).map(([platKey, out]) => (
              <div key={platKey} className="glass-card p-6 rounded-3xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#c5a059]">
                      {platKey}
                    </span>
                    <button
                      onClick={() => copyToClipboard(platKey, out.caption)}
                      className="text-xs text-[#9e9d98] hover:text-[#f5f4f0] flex items-center gap-1"
                    >
                      {copiedKey === platKey ? <Check className="w-3.5 h-3.5 text-[#4e8765]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === platKey ? "Copied" : "Copy"}
                    </button>
                  </div>

                  {out.title && (
                    <div className="text-xs font-bold text-[#f5f4f0]">{out.title}</div>
                  )}

                  <div className="text-xs text-[#f5f4f0] whitespace-pre-wrap leading-relaxed bg-[#0b0c0e] p-3 rounded-xl border border-white/5 font-sans">
                    {out.caption}
                  </div>

                  {out.hashtags && out.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[11px] text-[#c5a059]">
                      {out.hashtags.map((h, i) => (
                        <span key={i}>{h}</span>
                      ))}
                    </div>
                  )}

                  {out.callToAction && (
                    <div className="text-[11px] text-[#9e9d98] italic">
                      CTA: {out.callToAction}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
