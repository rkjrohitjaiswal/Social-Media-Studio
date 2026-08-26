"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Target,
  Sparkles,
  Users,
  MessageCircle,
  ShoppingBag,
  Award,
  Flame,
  Zap,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";
import { AI_GOALS_REGISTRY, AiGoalId } from "@ai-social/shared";
import { getAuthHeader } from "@/lib/api-client";

interface WorkflowStep {
  step: number;
  name: string;
  content: string;
}

interface PlatformAdaptation {
  platform: string;
  formattedCaption: string;
  hashtags: string[];
}

interface GoalWorkflowResult {
  workflowId: string;
  goalId: string;
  goalName: string;
  funnelStage: string;
  generatedAt: string;
  stepOutputs: WorkflowStep[];
  platformAdaptations: PlatformAdaptation[];
}

export default function GoalsPage() {
  const [selectedGoalId, setSelectedGoalId] = useState<AiGoalId>("GENERATE_LEADS");
  const [targetAudience, setTargetAudience] = useState("High-growth SaaS founders & marketing leaders");
  const [productName, setProductName] = useState("Haute AI Social Studio");
  const [customNotes, setCustomNotes] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["INSTAGRAM", "LINKEDIN"]);

  const [isLoading, setIsLoading] = useState(false);
  const [workflowResult, setWorkflowResult] = useState<GoalWorkflowResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedGoal = AI_GOALS_REGISTRY[selectedGoalId];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Users":
        return <Users className="w-5 h-5 text-blue-400" />;
      case "MessageCircle":
        return <MessageCircle className="w-5 h-5 text-indigo-400" />;
      case "Target":
        return <Target className="w-5 h-5 text-emerald-400" />;
      case "ShoppingBag":
        return <ShoppingBag className="w-5 h-5 text-rose-400" />;
      case "Award":
        return <Award className="w-5 h-5 text-amber-400" />;
      case "Flame":
        return <Flame className="w-5 h-5 text-orange-400" />;
      case "Zap":
        return <Zap className="w-5 h-5 text-[#c5a059]" />;
      default:
        return <TrendingUp className="w-5 h-5 text-emerald-400" />;
    }
  };

  const togglePlatform = (plat: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(plat) ? prev.filter((p) => p !== plat) : [...prev, plat]
    );
  };

  const handleGenerateGoalWorkflow = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setWorkflowResult(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const authHeader = await getAuthHeader();

      const res = await fetch(`${apiBase}/api/goals/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          goalId: selectedGoalId,
          targetAudience,
          productName,
          customNotes,
          targetPlatforms: selectedPlatforms.length > 0 ? selectedPlatforms : ["INSTAGRAM"],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        if (json.code === "USAGE_LIMIT_REACHED" || json.code === "PLAN_LIMIT_REACHED") {
          setErrorMsg("Your 3 free usage credits are finished. Upgrade your plan in Settings to continue.");
        } else {
          setErrorMsg(json.error || "Failed to generate goal workflow.");
        }
        setIsLoading(false);
        return;
      }

      setWorkflowResult(json.data);
    } catch {
      setErrorMsg("An unexpected error occurred while generating goal content.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-16">
      {/* HEADER STATEMENT */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-semibold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Outcome-Driven Social AI</span>
        </div>
        <h1 className="font-serif-luxury text-3xl md:text-5xl font-bold text-[#f5f4f0]">
          What do you want to achieve today?
        </h1>
        <p className="text-xs md:text-sm text-[#9e9d98] max-w-3xl">
          Select your strategic business objective. Studio AI will align hooks, copy angles, call-to-actions, and multi-channel publishing to deliver concrete outcomes.
        </p>
      </div>

      {/* 8 GOAL CARDS SELECTION GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.values(AI_GOALS_REGISTRY).map((goal) => {
          const isSelected = goal.id === selectedGoalId;
          return (
            <button
              key={goal.id}
              onClick={() => setSelectedGoalId(goal.id)}
              className={`glass-card p-5 rounded-2xl text-left flex flex-col justify-between space-y-4 transition-all relative ${
                isSelected
                  ? "border-2 border-[#c5a059] bg-[#c5a059]/5 shadow-xl scale-[1.02]"
                  : "hover:border-white/20 opacity-80 hover:opacity-100"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-[#14161a] border border-white/10">
                    {getIcon(goal.iconName)}
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#c5a059] text-black flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 font-bold" />
                    </div>
                  )}
                </div>
                <h3 className="font-serif-luxury text-lg font-bold text-[#f5f4f0]">{goal.name}</h3>
                <p className="text-[11px] text-[#9e9d98] leading-relaxed line-clamp-2">{goal.description}</p>
              </div>

              <div className="pt-3 border-t border-white/10 text-[10px] text-[#c5a059] font-mono uppercase tracking-wider">
                Recommended: {goal.recommendedContentTypes[0]}
              </div>
            </button>
          );
        })}
      </div>

      {/* SELECTED GOAL CONFIGURATION & WIZARD */}
      {selectedGoal && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-8 border-t-2 border-t-[#c5a059]">
          <div className="flex items-center justify-between border-b border-white/10 pb-6 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-[#1c1f26] border border-white/10">
                {getIcon(selectedGoal.iconName)}
              </div>
              <div>
                <h2 className="font-serif-luxury text-2xl font-bold text-[#f5f4f0]">
                  Configure &quot;{selectedGoal.name}&quot; Campaign
                </h2>
                <p className="text-xs text-[#9e9d98]">{selectedGoal.description}</p>
              </div>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#f5f4f0] flex items-center gap-2">
              <span className="text-[#9e9d98]">Funnel Stage:</span>
              <span className="font-bold text-[#c5a059]">{selectedGoal.campaignStructure.funnelStage}</span>
            </div>
          </div>

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-[#a84b4b]/20 border border-[#a84b4b]/50 text-xs text-[#f5f4f0] flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[#a84b4b] shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* INPUT FORM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Target Audience</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Agency owners, E-commerce founders, Designers..."
                className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Brand / Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Maison Lumiere, Haute AI Studio..."
                className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#9e9d98] mb-1.5">Custom Angle / Notes (Optional)</label>
              <textarea
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Add specific promotional offer details, pain points, or tone instructions..."
                className="w-full bg-[#14161a] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
              />
            </div>

            {/* PLATFORMS */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs font-semibold text-[#9e9d98]">Target Channels</label>
              <div className="flex gap-2 flex-wrap">
                {["INSTAGRAM", "LINKEDIN", "X", "FACEBOOK", "THREADS", "PINTEREST", "YOUTUBE", "TIKTOK"].map((p) => {
                  const active = selectedPlatforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        active
                          ? "bg-[#c5a059] text-black border-[#c5a059]"
                          : "bg-[#14161a] text-[#9e9d98] border-white/10 hover:border-white/20"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* GENERATE ACTION BUTTON */}
          <button
            onClick={handleGenerateGoalWorkflow}
            disabled={isLoading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-sm shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Generating Goal-Driven Campaign (1 Credit)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" />
                <span>Create Content with AI ({selectedGoal.name})</span>
              </>
            )}
          </button>

          {/* GENERATED WORKFLOW RESULT DISPLAY */}
          {workflowResult && (
            <div className="pt-6 border-t border-white/10 space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Goal Content Generated Successfully</span>
                </div>
                <Link
                  href="/create"
                  className="text-xs font-bold text-[#c5a059] hover:underline flex items-center gap-1"
                >
                  Send to Full Create Studio <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflowResult.stepOutputs.map((st: WorkflowStep) => (
                  <div key={st.step} className="p-4 rounded-2xl bg-[#14161a] border border-white/10 space-y-2">
                    <div className="text-[10px] text-[#c5a059] uppercase tracking-wider font-mono font-bold">
                      Step {st.step}: {st.name}
                    </div>
                    <div className="text-xs text-[#f5f4f0] leading-relaxed whitespace-pre-wrap">{st.content}</div>
                  </div>
                ))}
              </div>

              {/* PLATFORM ADAPTATIONS */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-[#f5f4f0] uppercase tracking-wider">Multi-Platform Adaptations</h4>
                <div className="space-y-2">
                  {workflowResult.platformAdaptations.map((pa: PlatformAdaptation) => (
                    <div key={pa.platform} className="p-3 rounded-xl bg-[#1c1f26] border border-white/5 text-xs space-y-1">
                      <span className="font-bold text-[#c5a059]">{pa.platform}</span>
                      <p className="text-[#9e9d98]">{pa.formattedCaption}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
