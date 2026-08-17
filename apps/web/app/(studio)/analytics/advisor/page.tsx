"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ArrowRight, CheckCircle2 } from "lucide-react";
import { getPerformanceAdvisorReport } from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface ContentPerformanceItem {
  title: string;
  platform: string;
  engagementRate: number;
}

interface ContentIdeaItem {
  title: string;
  platform: string;
  concept: string;
}

interface AdvisorReportData {
  hasSufficientData: boolean;
  message?: string;
  summary?: string;
  topPerformingContent?: ContentPerformanceItem[];
  underperformingContent?: ContentPerformanceItem[];
  insights?: string[];
  recommendations?: string[];
  suggestedContentIdeas?: ContentIdeaItem[];
}

export default function PerformanceAdvisorPage() {
  const router = useRouter();
  const [report, setReport] = useState<AdvisorReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getPerformanceAdvisorReport()
      .then((data) => {
        if (isMounted) setReport(data as unknown as AdvisorReportData);
      })
      .catch((err: unknown) => {
        if (isMounted) setErrorMessage(err instanceof Error ? err.message : "Failed to load performance report");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getPerformanceAdvisorReport();
      setReport(data as unknown as AdvisorReportData);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load performance report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Analytics Advisor</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
            AI Performance Advisor
          </h1>
          <p className="text-xs text-[#9e9d98] mt-1">
            Empirical insights grounded in real social channel analytics. Generate actionable content ideas directly from data.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-[#1c1f26] border border-white/10 text-xs font-semibold text-[#f5f4f0] hover:border-[#c5a059] transition-colors"
        >
          {loading ? "Analyzing..." : "Re-Analyze Performance"}
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
          {errorMessage}
        </div>
      )}

      {report && !report.hasSufficientData && (
        <div className="glass-card p-8 rounded-3xl space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#f5f4f0]">Insufficient Analytics Data</h3>
          <p className="text-xs text-[#9e9d98] max-w-md mx-auto leading-relaxed">
            {report.message}
          </p>
          <div className="pt-4">
            <button
              onClick={() => router.push("/create")}
              className="px-5 py-2.5 rounded-xl bg-[#c5a059] text-black text-xs font-bold hover:bg-[#d4af66] transition-colors"
            >
              Create New Campaign
            </button>
          </div>
        </div>
      )}

      {report && report.hasSufficientData && (
        <div className="space-y-6">
          {/* SUMMARY BANNER */}
          <div className="p-6 rounded-3xl bg-[#c5a059]/10 border border-[#c5a059]/30 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Performance Summary
            </div>
            <p className="text-xs text-[#f5f4f0] leading-relaxed">
              {report.summary}
            </p>
          </div>

          {/* TOP VS UNDERPERFORMING GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-3xl space-y-4 border border-[#4e8765]/30">
              <h3 className="text-xs font-bold text-[#4e8765] uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Top Performing Content
              </h3>
              <div className="space-y-3">
                {report.topPerformingContent?.map((item: ContentPerformanceItem, i: number) => (
                  <div key={i} className="p-3 rounded-2xl bg-[#0b0c0e] border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-[#f5f4f0]">{item.title}</div>
                      <div className="text-[10px] text-[#9e9d98]">{item.platform}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#4e8765]/20 text-[#4e8765] font-mono font-bold text-[10px]">
                      {item.engagementRate}% engagement
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6 rounded-3xl space-y-4 border border-yellow-500/30">
              <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Underperforming Content
              </h3>
              <div className="space-y-3">
                {report.underperformingContent?.map((item: ContentPerformanceItem, i: number) => (
                  <div key={i} className="p-3 rounded-2xl bg-[#0b0c0e] border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-[#f5f4f0]">{item.title}</div>
                      <div className="text-[10px] text-[#9e9d98]">{item.platform}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-500 font-mono font-bold text-[10px]">
                      {item.engagementRate}% engagement
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RECOMMENDATIONS */}
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-[#f5f4f0] flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-[#c5a059]" /> Recommended Strategy Actions
            </h3>
            <ul className="space-y-2.5 text-xs text-[#9e9d98]">
              {report.recommendations?.map((rec: string, i: number) => (
                <li key={i} className="p-3 rounded-xl bg-[#0b0c0e] border border-white/5 text-[#f5f4f0]">
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* SUGGESTED CONTENT IDEAS */}
          {report.suggestedContentIdeas && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#f5f4f0]">Generate Content From Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.suggestedContentIdeas.map((idea: ContentIdeaItem, i: number) => (
                  <div key={i} className="glass-card p-5 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                        <span className="font-bold text-[#f5f4f0]">{idea.title}</span>
                        <span className="text-[10px] text-[#c5a059] font-mono uppercase">{idea.platform}</span>
                      </div>
                      <p className="text-xs text-[#9e9d98] mt-2 leading-relaxed">{idea.concept}</p>
                    </div>

                    <button
                      onClick={() => router.push("/create")}
                      className="w-full py-2 rounded-xl bg-[#1c1f26] border border-white/10 text-xs font-semibold text-[#f5f4f0] hover:border-[#c5a059] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Generate Content</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#c5a059]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
