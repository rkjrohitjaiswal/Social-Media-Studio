"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Wrench,
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Bookmark,
  PlusCircle,
} from "lucide-react";
import { AI_TOOLS_REGISTRY } from "@ai-social/shared";
import { getAuthHeader } from "@/lib/api-client";
import { useStudio } from "@/lib/studio-context";

export default function SingleToolRunnerPage() {
  const params = useParams();
  const toolId = params.toolId as string;
  const { activeBrand } = useStudio();

  const tool = AI_TOOLS_REGISTRY.find((t) => t.id === toolId);

  const [topicInput, setTopicInput] = useState("");
  const [platform, setPlatform] = useState(() => (tool && tool.supportedPlatforms.length > 0 ? tool.supportedPlatforms[0] : "INSTAGRAM"));
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (!tool) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#f5f4f0]">Tool &apos;{toolId}&apos; Not Found</h2>
        <Link href="/tools" className="text-xs text-[#c5a059] hover:underline">
          ← Return to AI Tools Gallery
        </Link>
      </div>
    );
  }

  const handleExecuteTool = async () => {
    if (!topicInput.trim()) {
      setErrorMsg("Please enter a topic or prompt input.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      const res = await fetch(`${apiBase}/api/tools/${toolId}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          topicInput,
          platform,
          brandContext: activeBrand.name,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        if (json.code === "USAGE_LIMIT_REACHED" || json.code === "PLAN_LIMIT_REACHED") {
          setErrorMsg("Your 3 free usage credits are finished. Upgrade your plan in Settings to continue.");
        } else {
          setErrorMsg(json.error || "Failed to execute tool.");
        }
        setIsLoading(false);
        return;
      }

      setResult(json.data);
    } catch {
      setErrorMsg("An error occurred while running the AI tool.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResult = () => {
    if (!result) return;
    const output = (result as Record<string, unknown>).output;
    const textToCopy = typeof output === "string" ? output : JSON.stringify(output, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveToSavedContent = async () => {
    if (!result) return;
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
          itemType: "TOOL",
          itemId: `${toolId}-${Date.now()}`,
          title: `${tool.name}: ${topicInput.substring(0, 30)}`,
          contentJson: result,
        }),
      });

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* BACK BUTTON */}
      <Link
        href="/tools"
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#9e9d98] hover:text-[#c5a059] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to AI Tools Gallery</span>
      </Link>

      {/* TOOL TITLE HEADER */}
      <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-[#14161a] border border-white/10 text-[#c5a059]">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif-luxury text-2xl md:text-3xl font-bold text-[#f5f4f0]">{tool.name}</h1>
            <p className="text-xs text-[#9e9d98] mt-1">{tool.description}</p>
          </div>
        </div>

        {/* ERROR DISPLAY */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-[#a84b4b]/20 border border-[#a84b4b]/50 text-xs text-[#f5f4f0] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#a84b4b] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* INPUT CONTROLS */}
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Topic / Input Context</label>
            <textarea
              rows={3}
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder={tool.inputPlaceholder}
              className="w-full bg-[#14161a] border border-white/10 rounded-2xl p-4 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Target Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
              >
                {tool.supportedPlatforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Active Brand Identity</label>
              <div className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0] flex items-center justify-between">
                <span>{activeBrand.name}</span>
                <span className="text-[10px] text-[#c5a059] uppercase font-mono">{activeBrand.toneVoice}</span>
              </div>
            </div>
          </div>

          {/* RUN ACTION BUTTON */}
          <button
            onClick={handleExecuteTool}
            disabled={isLoading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-sm shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Processing AI Tool (1 Credit)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" />
                <span>Execute {tool.name}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* RESULT STATE DISPLAY */}
      {result && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6 animate-in fade-in border-2 border-[#c5a059]/40">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0]">Generated Output</h3>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyResult}
                className="px-3 py-1.5 rounded-xl bg-[#14161a] border border-white/10 hover:border-[#c5a059] text-xs text-[#f5f4f0] flex items-center gap-1.5 transition-colors"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#c5a059]" />}
                <span>{isCopied ? "Copied!" : "Copy Output"}</span>
              </button>

              <button
                onClick={handleSaveToSavedContent}
                className="px-3 py-1.5 rounded-xl bg-[#14161a] border border-white/10 hover:border-rose-400 text-xs text-[#f5f4f0] flex items-center gap-1.5 transition-colors"
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "text-rose-400 fill-rose-400" : "text-rose-400"}`} />
                <span>{isSaved ? "Saved!" : "Save Item"}</span>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#14161a] border border-white/10 text-xs text-[#f5f4f0] leading-relaxed font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
            {typeof result.output === "string" ? result.output : JSON.stringify(result.output, null, 2)}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/create"
              className="px-5 py-2.5 rounded-xl bg-[#c5a059] text-black font-bold text-xs flex items-center gap-2 hover:brightness-110 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Use in Creation Studio</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
