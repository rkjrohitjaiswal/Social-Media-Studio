"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Sparkles,
  ArrowLeft,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Play
} from "lucide-react";
import { QueueRunState, QueueJobState } from "@/lib/queue-types";

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = (params?.id as string) || "demo-campaign-1";

  // Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isStartingRun, setIsStartingRun] = useState(false);

  // Active Run State
  const [runState, setRunState] = useState<QueueRunState | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  // Mock Campaign Composition Data
  const campaignData = {
    id: campaignId,
    name: "Summer Haute Couture 2026",
    brandName: "Maison Lumière",
    description: "Editorial campaign showcasing Mediterranean resort collection",
    status: "READY",
    modelName: "dall-e-3",
    quality: "High",
    referenceAsset: {
      id: "ref-01",
      fileName: "resort-moodboard-01.jpg",
      signedUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop",
    },
    inputAssets: [
      {
        id: "inp-01",
        fileName: "silk-dress-01.jpg",
        signedUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=400&auto=format&fit=crop",
      },
      {
        id: "inp-02",
        fileName: "leather-handbag-02.jpg",
        signedUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=400&auto=format&fit=crop",
      },
    ],
  };

  // Poll or connect to SSE for real-time progress updates
  useEffect(() => {
    const fetchRunStatus = async () => {
      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/campaigns/${campaignId}/generate/run`);
        const json = await res.json();
        if (json.success && json.run) {
          setRunState(json.run);
        }
      } catch {
        // Ignore initial fetch errors if no run exists
      }
    };

    fetchRunStatus();

    // Setup SSE listener for real-time updates
    const eventSource = new EventSource((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/campaigns/${campaignId}/generate/events`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "RUN_UPDATE" && data.run) {
          setRunState(data.run);
        }
      } catch {
        // Parse error
      }
    };

    return () => {
      eventSource.close();
    };
  }, [campaignId]);

  // Start Generation Run Handler
  const handleStartGeneration = async () => {
    setIsStartingRun(true);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/campaigns/${campaignId}/generate`, {
        method: "POST",
      });

      const json = await res.json();
      if (json.success && json.run) {
        setRunState(json.run);
        setShowConfirmModal(false);
      }
    } catch {
      // Error starting run
    } finally {
      setIsStartingRun(false);
    }
  };

  // Individual Job Retry Handler
  const handleRetryJob = async (jobId: string) => {
    if (!runState) return;
    setRetryingJobId(jobId);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/campaigns/${campaignId}/generate/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: runState.id, jobId }),
      });

      const json = await res.json();
      if (json.success && json.run) {
        setRunState(json.run);
      }
    } catch {
      // Error retrying job
    } finally {
      setRetryingJobId(null);
    }
  };

  const totalInputsCount = campaignData.inputAssets.length;
  const overallProgress = runState
    ? Math.round(
        ((runState.completedJobs + runState.failedJobs) / Math.max(1, runState.totalJobs)) * 100
      )
    : 0;

  return (
    <div className="space-y-10 pb-16">
      {/* PAGE TOP NAV & BREADCRUMB */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#9e9d98] hover:text-[#c5a059] transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Campaigns</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
              {campaignData.name}
            </h1>
            <span className="px-3 py-1 rounded-full bg-[#4e8765]/20 text-[#4e8765] border border-[#4e8765]/40 text-xs font-bold">
              {campaignData.status}
            </span>
          </div>
          <p className="text-xs text-[#9e9d98] mt-1">
            Target Brand: <span className="text-[#c5a059] font-bold">{campaignData.brandName}</span> • 1 Reference + {totalInputsCount} Product Inputs
          </p>
        </div>

        {/* PRIMARY GENERATION ACTION BUTTON */}
        <div>
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-xs shadow-xl hover:brightness-110 transition-all flex items-center gap-2 gold-glow"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>Generate AI Images</span>
          </button>
        </div>
      </div>

      {/* ACTIVE GENERATION RUN PROGRESS DASHBOARD */}
      {runState && (
        <div className="glass-card p-6 rounded-3xl space-y-4 border-[#c5a059]/40 gold-glow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#c5a059] animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-[#f5f4f0]">
                  AI Generation Batch Progress: <span className="text-[#c5a059]">{runState.status}</span>
                </h3>
                <div className="text-xs text-[#9e9d98]">
                  Run ID: <code className="font-mono text-[#c5a059]">{runState.id}</code>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="text-[#f5f4f0]">{runState.totalJobs} Total</span>
              <span className="text-[#4e8765]">{runState.completedJobs} Completed</span>
              {runState.failedJobs > 0 && <span className="text-[#a84b4b]">{runState.failedJobs} Failed</span>}
            </div>
          </div>

          {/* OVERALL PROGRESS BAR */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#9e9d98]">
              <span>Batch Completion</span>
              <span className="font-mono text-[#c5a059] font-bold">{overallProgress}%</span>
            </div>
            <div className="w-full bg-[#0b0c0e] h-2.5 rounded-full overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-[#c5a059] to-[#4e8765] h-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* CAMPAIGN ASSET COMPOSITION & GENERATED RESULTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: MASTER REFERENCE IMAGE */}
        <div className="glass-card p-6 rounded-3xl space-y-4 border-[#c5a059]/30">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-[#f5f4f0] flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#c5a059]" />
              Master Reference Style Anchor
            </h3>
            <span className="text-[9px] uppercase font-bold tracking-widest bg-[#c5a059]/20 text-[#c5a059] px-2 py-0.5 rounded">
              1 Reference
            </span>
          </div>

          <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-[#0b0c0e]">
            <Image
              src={campaignData.referenceAsset.signedUrl}
              alt="Reference Style Anchor"
              fill
              className="object-cover"
            />
          </div>
          <div className="text-xs text-[#9e9d98] font-mono text-center">
            {campaignData.referenceAsset.fileName}
          </div>
        </div>

        {/* RIGHT COLUMN: PRODUCT INPUTS & GENERATED RESULTS GRID */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-[#f5f4f0]">
              Product Input Batch & AI Generation Outputs
            </h3>
            <span className="text-xs text-[#9e9d98] font-mono">
              {totalInputsCount} Product Inputs
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campaignData.inputAssets.map((inp, idx) => {
              const matchingJob = runState?.jobs?.find((j) => j.inputAssetId === inp.id);

              return (
                <div
                  key={inp.id}
                  className="rounded-2xl border border-white/10 bg-[#0b0c0e] p-4 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                    <span className="font-bold text-[#f5f4f0]">Product Input #{idx + 1}</span>
                    {matchingJob ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          matchingJob.status === "COMPLETED"
                            ? "bg-[#4e8765]/20 text-[#4e8765]"
                            : matchingJob.status === "FAILED"
                            ? "bg-[#a84b4b]/20 text-[#a84b4b]"
                            : "bg-[#c5a059]/20 text-[#c5a059]"
                        }`}
                      >
                        {matchingJob.status}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#9e9d98]">Ready</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* INPUT THUMBNAIL */}
                    <div className="space-y-1">
                      <span className="text-[9px] text-[#9e9d98] uppercase">Product Input</span>
                      <div className="relative aspect-square rounded-xl overflow-hidden border border-white/10">
                        <Image src={inp.signedUrl} alt={inp.fileName} fill className="object-cover" />
                      </div>
                    </div>

                    {/* GENERATED OUTPUT OR STATUS */}
                    <div className="space-y-1">
                      <span className="text-[9px] text-[#c5a059] uppercase font-bold">AI Generated</span>
                      <div className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-[#14161a] flex items-center justify-center">
                        {matchingJob?.status === "COMPLETED" && (
                          <Image
                            src={(matchingJob.generatedAsset?.signedUrl as string) || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=400&auto=format&fit=crop"}
                            alt="Generated Output"
                            fill
                            className="object-cover"
                          />
                        )}

                        {matchingJob?.status === "PROCESSING" && (
                          <div className="flex flex-col items-center gap-1 text-[#c5a059]">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-[10px]">Generating...</span>
                          </div>
                        )}

                        {matchingJob?.status === "FAILED" && (
                          <div className="flex flex-col items-center gap-1 text-[#a84b4b] p-2 text-center">
                            <AlertCircle className="w-5 h-5 text-[#a84b4b]" />
                            <span className="text-[9px]">Failed</span>
                            <button
                              type="button"
                              disabled={retryingJobId === matchingJob.id}
                              onClick={() => handleRetryJob(matchingJob.id)}
                              className="mt-1 px-2 py-0.5 rounded bg-[#a84b4b]/20 hover:bg-[#a84b4b] text-white text-[9px] font-bold transition-colors flex items-center gap-1"
                            >
                              {retryingJobId === matchingJob.id ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-2.5 h-2.5" />
                              )}
                              Retry
                            </button>
                          </div>
                        )}

                        {!matchingJob && (
                          <span className="text-[10px] text-[#9e9d98]">Pending Start</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PRE-GENERATION CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-6 md:p-8 rounded-3xl max-w-lg w-full space-y-6 border-[#c5a059]/50 gold-glow">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#c5a059]" />
                <h3 className="text-base font-bold text-[#f5f4f0]">Confirm AI Generation Batch</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-full text-[#9e9d98] hover:text-[#f5f4f0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#9e9d98]">
              <p className="text-[#f5f4f0]">
                You are about to launch <span className="text-[#c5a059] font-bold">{totalInputsCount} AI image generation jobs</span> for campaign <span className="font-semibold text-[#f5f4f0]">&quot;{campaignData.name}&quot;</span>.
              </p>

              <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Target Brand:</span>
                  <span className="font-bold text-[#c5a059]">{campaignData.brandName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Master Style Anchor:</span>
                  <span className="font-mono text-[#f5f4f0]">{campaignData.referenceAsset.fileName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Product Input Batch:</span>
                  <span className="font-bold text-[#f5f4f0]">{totalInputsCount} Images</span>
                </div>
                <div className="flex justify-between">
                  <span>OpenAI Image Model:</span>
                  <span className="font-mono text-[#c5a059]">{campaignData.modelName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Output Quality:</span>
                  <span className="font-bold text-[#4e8765]">{campaignData.quality}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-[#1c1f26] border border-white/10 text-xs font-semibold text-[#9e9d98] hover:text-[#f5f4f0]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isStartingRun}
                onClick={handleStartGeneration}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-40"
              >
                {isStartingRun ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <Play className="w-4 h-4 text-black fill-current" />
                )}
                <span>Start AI Generation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
