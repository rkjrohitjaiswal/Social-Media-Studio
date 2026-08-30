"use client";

import React from "react";
import { Zap, AlertTriangle, Loader2 } from "lucide-react";
import { useStudio } from "@/lib/studio-context";

export interface UsageData {
  plan: string;
  monthlyLimit: number;
  usedCredits: number;
  remainingCredits: number;
  resetPeriod?: string;
  isInitialMonth?: boolean;
}

export function UsageWidget() {
  const { usage, isLoadingUsage, usageError } = useStudio();
  const isLoading = isLoadingUsage;
  const isError = Boolean(usageError);

  if (isLoading) {
    return (
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between border-white/10">
        <div className="flex items-center gap-3 text-xs text-[#9e9d98]">
          <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" />
          <span>Loading usage credits...</span>
        </div>
      </div>
    );
  }

  if (isError || !usage) {
    return (
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between border-red-500/20 bg-red-500/5">
        <div className="flex items-center gap-2 text-xs text-red-400 font-medium">
          <AlertTriangle className="w-4 h-4" />
          <span>Unable to sync workspace usage credits</span>
        </div>
      </div>
    );
  }

  const limit = usage.monthlyLimit ?? 10;
  const used = usage.usedCredits ?? 0;
  const remaining = usage.remainingCredits ?? Math.max(0, limit - used);
  const isExhausted = remaining <= 0;
  const progressPercent = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="glass-card p-5 rounded-2xl space-y-3.5 border-[#c5a059]/30">
      <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-[#9e9d98]">
        <div className="flex items-center gap-1.5 text-[#c5a059]">
          <Zap className="w-4 h-4 fill-[#c5a059]" />
          <span>Workspace Credits ({usage.plan})</span>
        </div>
        <span className="text-[#f5f4f0]">
          {remaining} / {limit} Available
        </span>
      </div>

      <div className="w-full bg-[#0b0c0e] h-2 rounded-full overflow-hidden border border-white/5">
        <div
          className={`h-full transition-all duration-300 ${
            isExhausted ? "bg-red-500" : progressPercent > 80 ? "bg-amber-500" : "bg-[#c5a059]"
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#9e9d98]">
        <span>
          Used: <strong className="text-[#f5f4f0]">{used}</strong> | Remaining: <strong className="text-[#f5f4f0]">{remaining}</strong>
        </span>
        {isExhausted ? (
          <span className="text-red-400 font-bold">Credits Exhausted — Upgrade Plan</span>
        ) : (
          <span>{usage.isInitialMonth ? "First month allowance" : "Monthly allowance"}</span>
        )}
      </div>
    </div>
  );
}
