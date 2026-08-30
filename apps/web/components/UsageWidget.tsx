"use client";

import React from "react";
import { Coins, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import { useStudio } from "@/lib/studio-context";

export interface UsageData {
  plan: string;
  monthlyLimit: number;
  usedCredits: number;
  remainingCredits: number;
  resetPeriod?: string;
  totalRemainingCredits?: number;
  permanentRemainingCredits?: number;
  permanentTotalCredits?: number;
  permanentUsedCredits?: number;
  monthlyRemainingCredits?: number;
  monthlyAllowance?: number;
  monthlyUsedCredits?: number;
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

  const totalRemaining = usage.totalRemainingCredits ?? usage.remainingCredits ?? 0;
  const permRemaining = usage.permanentRemainingCredits ?? usage.remainingCredits ?? 0;
  const permTotal = usage.permanentTotalCredits ?? 10;
  const monthlyRemaining = usage.monthlyRemainingCredits ?? 0;
  const monthlyAllowance = usage.monthlyAllowance ?? 3;
  const isExhausted = totalRemaining <= 0;

  return (
    <div className="glass-card p-5 rounded-2xl space-y-4 border-[#c5a059]/30">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#9e9d98]">
          Available Credits ({usage.plan})
        </span>
        <span className="text-sm font-bold text-[#f5f4f0]">
          {totalRemaining} Total Available
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* PERMANENT CREDITS */}
        <div className="p-3 rounded-xl bg-[#0b0c0e] border border-[#D4AF37]/30 space-y-1">
          <div className="flex items-center justify-between text-[#D4AF37]">
            <span className="flex items-center gap-1 font-semibold text-[11px]">
              <Coins className="w-3.5 h-3.5 shrink-0" />
              Permanent
            </span>
            <span className="text-[10px] opacity-70">Never Expires</span>
          </div>
          <div className="text-lg font-bold text-[#f5f4f0] font-mono">
            {permRemaining} <span className="text-xs font-normal text-[#9e9d98]">/ {permTotal}</span>
          </div>
        </div>

        {/* MONTHLY FREE CREDITS */}
        <div className="p-3 rounded-xl bg-[#0b0c0e] border border-cyan-500/30 space-y-1">
          <div className="flex items-center justify-between text-cyan-400">
            <span className="flex items-center gap-1 font-semibold text-[11px]">
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              Monthly Free
            </span>
            <span className="text-[10px] opacity-70">Renewable</span>
          </div>
          <div className="text-lg font-bold text-[#f5f4f0] font-mono">
            {monthlyRemaining} <span className="text-xs font-normal text-[#9e9d98]">/ {monthlyAllowance}</span>
          </div>
        </div>
      </div>

      {isExhausted && (
        <div className="text-center text-xs text-red-400 font-bold">
          Credits Exhausted — Upgrade Plan to Continue
        </div>
      )}
    </div>
  );
}
