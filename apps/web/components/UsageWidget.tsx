"use client";

import React, { useState, useEffect } from "react";
import { Zap, AlertTriangle, Loader2 } from "lucide-react";
import { getAuthHeader } from "@/lib/api-client";

export interface UsageData {
  plan: string;
  monthlyLimit: number;
  usedCredits: number;
  remainingCredits: number;
  resetPeriod?: string;
}

export function UsageWidget() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadUsage() {
      setIsLoading(true);
      setIsError(false);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const authHeader = await getAuthHeader();
        const res = await fetch(`${apiBase}/api/usage`, {
          headers: { ...authHeader },
        });
        const json = await res.json();
        if (isMounted && json.success && json.data) {
          setUsage(json.data);
        } else if (isMounted) {
          setIsError(true);
        }
      } catch {
        if (isMounted) setIsError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadUsage();
    return () => {
      isMounted = false;
    };
  }, []);

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

  const percentUsed = Math.min(
    100,
    Math.round((usage.usedCredits / Math.max(1, usage.monthlyLimit)) * 100)
  );

  const isExhausted = usage.remainingCredits <= 0;

  return (
    <div className="glass-card p-5 rounded-2xl space-y-3 border-[#c5a059]/30">
      <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-[#9e9d98]">
        <div className="flex items-center gap-1.5 text-[#c5a059]">
          <Zap className="w-4 h-4 fill-[#c5a059]" />
          <span>Workspace Credits ({usage.plan})</span>
        </div>
        <span className="text-[#f5f4f0]">
          {usage.remainingCredits} / {usage.monthlyLimit} Available
        </span>
      </div>

      {/* PROGRESS BAR */}
      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isExhausted ? "bg-red-500" : percentUsed > 80 ? "bg-amber-500" : "bg-[#c5a059]"
          }`}
          style={{ width: `${percentUsed}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#9e9d98]">
        <span>Used: {usage.usedCredits} credits</span>
        {isExhausted ? (
          <span className="text-red-400 font-bold">Credits Exhausted — Upgrade Plan</span>
        ) : (
          <span>{usage.remainingCredits} remaining this cycle</span>
        )}
      </div>
    </div>
  );
}
