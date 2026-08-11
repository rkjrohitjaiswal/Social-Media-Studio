"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Save,
  Check,
  History,
  Tag,
  MessageSquare,
  FileText,
  ShieldCheck,
  Sliders,
  Sun,
  Layers,
  Award,
  MessageCircle,
  Send
} from "lucide-react";
import { InstagramIcon as Instagram } from "@/components/icons/InstagramIcon";
import { QueueCopyState } from "@/lib/queue/social-copy-worker";
import { QueueQualityState, ReviewEventState, AssetApprovalRecord } from "@/lib/queue/quality-worker";
import { AccountState, PublicationState } from "@/lib/queue/instagram-worker";

export default function ApprovalsPage() {
  const [copies, setCopies] = useState<QueueCopyState[]>([]);
  const [activeCopyId, setActiveCopyId] = useState<string | null>(null);
  const [qualityAssessment, setQualityAssessment] = useState<QueueQualityState | null>(null);
  const [approvalRecord, setApprovalRecord] = useState<AssetApprovalRecord | null>(null);
  const [reviewEvents, setReviewEvents] = useState<ReviewEventState[]>([]);

  // Instagram Connection & Publish State
  const [instagramAccount, setInstagramAccount] = useState<AccountState | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<PublicationState | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isRegeneratingCopy, setIsRegeneratingCopy] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [reviewerComment, setReviewerComment] = useState("");

  // Editable Copy Form Fields
  const [editCaption, setEditCaption] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [editCta, setEditCta] = useState("");
  const [editAltText, setEditAltText] = useState("");
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(1);

  useEffect(() => {
    let isMounted = true;
    async function loadApprovalData() {
      try {
        const res = await fetch("/api/campaigns/demo-campaign-1/copy");
        const json = await res.json();
        if (isMounted && json.success && json.copies?.length) {
          setCopies(json.copies);
          const first = json.copies[0];
          setActiveCopyId(first.id);
          setEditCaption(first.caption);
          setEditHashtags(first.hashtags.join(", "));
          setEditCta(first.cta);
          setEditAltText(first.altText);
          setSelectedVersionNum(first.currentVersionNumber);
        }

        const qualRes = await fetch("/api/campaigns/demo-campaign-1/quality");
        const qualJson = await qualRes.json();
        if (isMounted && qualJson.success && qualJson.assessment) {
          setQualityAssessment(qualJson.assessment);
        }

        const appRes = await fetch("/api/campaigns/demo-campaign-1/approvals");
        const appJson = await appRes.json();
        if (isMounted && appJson.success) {
          if (appJson.approvalRecord) setApprovalRecord(appJson.approvalRecord);
          if (appJson.reviewEvents) setReviewEvents(appJson.reviewEvents);
        }

        const igRes = await fetch("/api/integrations/instagram");
        const igJson = await igRes.json();
        if (isMounted && igJson.success && igJson.account) {
          setInstagramAccount(igJson.account);
        }
      } catch {
        // Ignore load errors
      }
    }

    loadApprovalData();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectCopy = (copy: QueueCopyState) => {
    setActiveCopyId(copy.id);
    setEditCaption(copy.caption);
    setEditHashtags(copy.hashtags.join(", "));
    setEditCta(copy.cta);
    setEditAltText(copy.altText);
    setSelectedVersionNum(copy.currentVersionNumber);
  };

  const activeCopy = copies.find((c) => c.id === activeCopyId) || copies[0];

  const handleSaveCopyEdits = async () => {
    if (!activeCopy) return;
    setIsSaving(true);
    try {
      const hashtagArray = editHashtags
        .split(",")
        .map((tag) => tag.replace(/^#/, "").trim())
        .filter(Boolean);

      const res = await fetch(`/api/campaigns/demo-campaign-1/copy/${activeCopy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: editCaption,
          hashtags: hashtagArray,
          cta: editCta,
          altText: editAltText,
        }),
      });

      const json = await res.json();
      if (json.success && json.copy) {
        setCopies(copies.map((c) => (c.id === json.copy.id ? json.copy : c)));
      }
    } catch {
      // Ignore save error
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!activeCopy) return;
    try {
      const res = await fetch(`/api/campaigns/demo-campaign-1/approvals/${activeCopy.generatedAssetId}`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success && json.approval) {
        setApprovalRecord(json.approval);
        setReviewEvents((prev) => [
          ...prev,
          {
            id: `rev-${Date.now()}`,
            workspaceId: "ws-1",
            campaignId: "camp-1",
            generatedAssetId: activeCopy.generatedAssetId,
            eventType: "APPROVED",
            reviewerComment: "Approved for publishing",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      // Ignore error
    }
  };

  const handleRequestChanges = async () => {
    if (!activeCopy || !reviewerComment.trim()) return;
    try {
      const res = await fetch(`/api/campaigns/demo-campaign-1/approvals/${activeCopy.generatedAssetId}/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerComment }),
      });
      const json = await res.json();
      if (json.success && json.approval) {
        setApprovalRecord(json.approval);
        setReviewEvents((prev) => [
          ...prev,
          {
            id: `rev-${Date.now()}`,
            workspaceId: "ws-1",
            campaignId: "camp-1",
            generatedAssetId: activeCopy.generatedAssetId,
            eventType: "CHANGES_REQUESTED",
            reviewerComment,
            createdAt: new Date().toISOString(),
          },
        ]);
        setReviewerComment("");
      }
    } catch {
      // Ignore error
    }
  };

  const handleReject = async () => {
    if (!activeCopy) return;
    try {
      const res = await fetch(`/api/campaigns/demo-campaign-1/approvals/${activeCopy.generatedAssetId}/reject`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success && json.approval) {
        setApprovalRecord(json.approval);
        setReviewEvents((prev) => [
          ...prev,
          {
            id: `rev-${Date.now()}`,
            workspaceId: "ws-1",
            campaignId: "camp-1",
            generatedAssetId: activeCopy.generatedAssetId,
            eventType: "REJECTED",
            reviewerComment: "Asset rejected",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      // Ignore error
    }
  };

  const handleRegenerateTextCopy = async () => {
    if (!activeCopy) return;
    setIsRegeneratingCopy(true);
    try {
      const res = await fetch(`/api/campaigns/demo-campaign-1/copy/${activeCopy.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generatedAssetId: activeCopy.generatedAssetId,
        }),
      });

      const json = await res.json();
      if (json.success && json.copy) {
        setCopies(copies.map((c) => (c.id === json.copy.id ? json.copy : c)));
        selectCopy(json.copy);
      }
    } catch {
      // Ignore regenerate error
    } finally {
      setIsRegeneratingCopy(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!activeCopy) return;
    setIsRegeneratingImage(true);
    setTimeout(() => {
      setIsRegeneratingImage(false);
      if (approvalRecord) {
        setApprovalRecord({ ...approvalRecord, reviewStatus: "READY_FOR_REVIEW" });
      }
    }, 1500);
  };

  const handleExecutePublishing = async () => {
    if (!activeCopy) return;
    setIsPublishing(true);
    try {
      const hashtagArray = editHashtags
        .split(",")
        .map((tag) => tag.replace(/^#/, "").trim())
        .filter(Boolean);

      const res = await fetch(`/api/campaigns/demo-campaign-1/publish/${activeCopy.generatedAssetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          socialCopyId: activeCopy.id,
          caption: editCaption,
          hashtags: hashtagArray,
          cta: editCta,
          approvalStatus: approvalRecord?.reviewStatus || "APPROVED",
          imageStatus: "COMPLETED",
          copyStatus: "COMPLETED",
          qualityStatus: "COMPLETED",
        }),
      });

      const json = await res.json();
      if (json.success && json.publication) {
        setPublishSuccess(json.publication);
      }
    } catch {
      // Ignore error
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSwitchVersion = (versionNum: number) => {
    if (!activeCopy) return;
    const ver = activeCopy.versions.find((v) => v.versionNumber === versionNum);
    if (ver) {
      setSelectedVersionNum(versionNum);
      setEditCaption(ver.caption);
      setEditHashtags(ver.hashtags.join(", "));
      setEditCta(ver.cta);
      setEditAltText(ver.altText);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Creative Director Review Room</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
            AI Quality Scoring & Review Suite
          </h1>
          <p className="text-xs text-[#9e9d98] mt-1">
            Evaluate vision quality scores, refine social copy, request revisions, and approve campaign assets.
          </p>
        </div>
      </div>

      {/* ASSETS SELECTION STRIP */}
      {copies.length > 0 && (
        <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
          {copies.map((copy, idx) => (
            <button
              key={copy.id}
              onClick={() => selectCopy(copy)}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left flex-shrink-0 ${
                activeCopyId === copy.id
                  ? "bg-[#1c1f26] border-[#c5a059] gold-glow"
                  : "bg-[#0b0c0e] border-white/10 hover:border-white/20"
              }`}
            >
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-[#14161a]">
                <Image
                  src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=300&auto=format&fit=crop"
                  alt="Asset Preview"
                  fill
                  className="object-cover"
                />
              </div>

              <div>
                <div className="text-xs font-bold text-[#f5f4f0]">Asset #{idx + 1}</div>
                <div className="text-[10px] text-[#9e9d98]">
                  {approvalRecord?.reviewStatus === "APPROVED" ? (
                    <span className="text-[#4e8765] font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3 text-[#4e8765]" /> Approved
                    </span>
                  ) : approvalRecord?.reviewStatus === "CHANGES_REQUESTED" ? (
                    <span className="text-[#c5a059] font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-[#c5a059]" /> Revision Requested
                    </span>
                  ) : (
                    <span className="text-[#c5a059] font-medium">Ready for Review</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* MAIN WORKBENCH LAYOUT */}
      {activeCopy && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: VISUAL ASSETS & VERSION HISTORY */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card p-6 rounded-3xl space-y-5 border-[#c5a059]/30">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#f5f4f0]">
                  Generated Asset Preview
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    approvalRecord?.reviewStatus === "APPROVED"
                      ? "bg-[#4e8765]/20 text-[#4e8765] border border-[#4e8765]/40"
                      : approvalRecord?.reviewStatus === "REJECTED"
                      ? "bg-[#a84b4b]/20 text-[#a84b4b] border border-[#a84b4b]/40"
                      : "bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/40"
                  }`}
                >
                  {approvalRecord?.reviewStatus || "READY_FOR_REVIEW"}
                </span>
              </div>

              <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-[#0b0c0e]">
                <Image
                  src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop"
                  alt="Generated Asset"
                  fill
                  className="object-cover"
                />
              </div>

              {/* REFERENCE & INPUT PAIRING THUMBNAILS */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9e9d98]">
                    Master Reference
                  </span>
                  <div className="relative h-24 rounded-xl overflow-hidden border border-white/10 bg-[#0b0c0e]">
                    <Image
                      src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=300&auto=format&fit=crop"
                      alt="Reference"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9e9d98]">
                    Product Input
                  </span>
                  <div className="relative h-24 rounded-xl overflow-hidden border border-white/10 bg-[#0b0c0e]">
                    <Image
                      src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=300&auto=format&fit=crop"
                      alt="Product Input"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* VERSION HISTORY SELECTOR */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between text-xs text-[#9e9d98]">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <History className="w-3.5 h-3.5 text-[#c5a059]" />
                    Copy Version History
                  </span>
                  <span className="font-mono text-[#c5a059] text-[11px]">
                    v{selectedVersionNum} of {activeCopy.currentVersionNumber}
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {activeCopy.versions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleSwitchVersion(v.versionNumber)}
                      className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-all ${
                        selectedVersionNum === v.versionNumber
                          ? "bg-[#c5a059] text-black"
                          : "bg-[#1c1f26] text-[#9e9d98] hover:text-[#f5f4f0]"
                      }`}
                    >
                      v{v.versionNumber}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: AI QUALITY CARD + COPY WORKBENCH + REVIEW ACTIONS */}
          <div className="lg:col-span-7 space-y-6">
            {/* AI QUALITY SCORING CARD */}
            {qualityAssessment && (
              <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6 border-[#c5a059]/40">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059]">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-[#f5f4f0] uppercase tracking-wider">
                        AI Quality Analysis & Scoring
                      </h2>
                      <p className="text-[11px] text-[#9e9d98]">
                        Evaluated via Vision AI against campaign reference & brand persona
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-serif-luxury text-3xl font-bold text-[#c5a059]">
                        {qualityAssessment.overallScore} <span className="text-xs text-[#9e9d98] font-sans">/ 100</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          qualityAssessment.verdict === "PASS"
                            ? "bg-[#4e8765]/20 text-[#4e8765] border border-[#4e8765]/40"
                            : qualityAssessment.verdict === "REVIEW"
                            ? "bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/40"
                            : "bg-[#a84b4b]/20 text-[#a84b4b] border border-[#a84b4b]/40"
                        }`}
                      >
                        VERDICT: {qualityAssessment.verdict}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SCORES BREAKDOWN PROGRESS BARS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-[#f5f4f0]">
                      <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-[#c5a059]" /> Reference Similarity (25%)</span>
                      <span className="font-mono text-[#c5a059]">{qualityAssessment.referenceSimilarityScore}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0b0c0e] rounded-full overflow-hidden">
                      <div className="h-full bg-[#c5a059]" style={{ width: `${qualityAssessment.referenceSimilarityScore}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-[#f5f4f0]">
                      <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-[#c5a059]" /> Brand Consistency (20%)</span>
                      <span className="font-mono text-[#c5a059]">{qualityAssessment.brandConsistencyScore}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0b0c0e] rounded-full overflow-hidden">
                      <div className="h-full bg-[#c5a059]" style={{ width: `${qualityAssessment.brandConsistencyScore}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-[#f5f4f0]">
                      <span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-[#c5a059]" /> Product Fidelity (20%)</span>
                      <span className="font-mono text-[#c5a059]">{qualityAssessment.productFidelityScore}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0b0c0e] rounded-full overflow-hidden">
                      <div className="h-full bg-[#c5a059]" style={{ width: `${qualityAssessment.productFidelityScore}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-[#f5f4f0]">
                      <span className="flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-[#c5a059]" /> Lighting & Atmosphere (10%)</span>
                      <span className="font-mono text-[#c5a059]">{qualityAssessment.lightingScore}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0b0c0e] rounded-full overflow-hidden">
                      <div className="h-full bg-[#c5a059]" style={{ width: `${qualityAssessment.lightingScore}%` }} />
                    </div>
                  </div>
                </div>

                {/* STRENGTHS, ISSUES & RECOMMENDATIONS CALLOUTS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs">
                  {qualityAssessment.issues.length > 0 && (
                    <div className="p-3 rounded-2xl bg-[#a84b4b]/10 border border-[#a84b4b]/30 space-y-1 text-[#f5f4f0]">
                      <span className="font-bold text-[#a84b4b] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Identified Issues
                      </span>
                      <ul className="list-disc list-inside text-[11px] space-y-1 text-[#9e9d98]">
                        {qualityAssessment.issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {qualityAssessment.recommendations.length > 0 && (
                    <div className="p-3 rounded-2xl bg-[#c5a059]/10 border border-[#c5a059]/30 space-y-1 text-[#f5f4f0]">
                      <span className="font-bold text-[#c5a059] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Actionable Recommendations
                      </span>
                      <ul className="list-disc list-inside text-[11px] space-y-1 text-[#9e9d98]">
                        {qualityAssessment.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EDITABLE COPY WORKBENCH */}
            <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-sm font-semibold text-[#f5f4f0] uppercase tracking-wider flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#c5a059]" />
                  AI Social Copy Studio
                </h2>

                <button
                  type="button"
                  disabled={isRegeneratingCopy}
                  onClick={handleRegenerateTextCopy}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1c1f26] border border-[#c5a059]/40 text-xs font-semibold text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingCopy ? "animate-spin" : ""}`} />
                  <span>Regenerate Copy</span>
                </button>
              </div>

              {/* CAPTION TEXTAREA */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#9e9d98] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#c5a059]" />
                  Instagram Caption Body
                </label>
                <textarea
                  rows={3}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-2xl p-4 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none transition-colors leading-relaxed"
                />
              </div>

              {/* HASHTAG CHIPS INPUT */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#9e9d98] uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#c5a059]" />
                  Targeted Hashtags
                </label>
                <input
                  type="text"
                  value={editHashtags}
                  onChange={(e) => setEditHashtags(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {editHashtags
                    .split(",")
                    .map((tag) => tag.replace(/^#/, "").trim())
                    .filter(Boolean)
                    .map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono bg-[#1c1f26] border border-white/10 text-[#c5a059] px-2 py-0.5 rounded-lg"
                      >
                        #{tag}
                      </span>
                    ))}
                </div>
              </div>

              {/* CTA & ALT-TEXT INPUTS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#9e9d98] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
                    Call-To-Action (CTA)
                  </label>
                  <input
                    type="text"
                    value={editCta}
                    onChange={(e) => setEditCta(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#c5a059] font-semibold focus:border-[#c5a059] focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#9e9d98] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#c5a059]" />
                    Accessibility Alt-Text
                  </label>
                  <input
                    type="text"
                    value={editAltText}
                    onChange={(e) => setEditAltText(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveCopyEdits}
                  className="px-5 py-2 rounded-xl bg-[#1c1f26] border border-[#c5a059]/40 text-[#c5a059] font-semibold text-xs hover:bg-[#c5a059] hover:text-black transition-all flex items-center gap-2 disabled:opacity-40"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Saving..." : "Save Copy Edits"}</span>
                </button>
              </div>
            </div>

            {/* REVIEWER DECISION CONTROL PANEL */}
            <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6 border-[#c5a059]/30">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-sm font-semibold text-[#f5f4f0] uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#c5a059]" />
                  Creative Director Decision & Publishing Actions
                </h2>

                {approvalRecord?.reviewStatus === "APPROVED" && (
                  <button
                    type="button"
                    onClick={() => setShowPublishModal(true)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 shadow-lg"
                  >
                    <Instagram className="w-4 h-4" />
                    <span>Publish to Instagram</span>
                  </button>
                )}
              </div>

              {/* REVIEWER COMMENT INPUT BOX */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#9e9d98] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-[#c5a059]" />
                  Reviewer Revision Instructions / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Please increase contrast on lower dress margin and align lighting with reference..."
                  value={reviewerComment}
                  onChange={(e) => setReviewerComment(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                />
              </div>

              {/* ACTION BUTTONS GRID */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleApprove}
                  className="px-5 py-2.5 rounded-xl bg-[#4e8765] text-black font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>Approve Asset</span>
                </button>

                <button
                  type="button"
                  disabled={!reviewerComment.trim()}
                  onClick={handleRequestChanges}
                  className="px-5 py-2.5 rounded-xl bg-[#1c1f26] border border-[#c5a059] text-[#c5a059] font-bold text-xs hover:bg-[#c5a059] hover:text-black transition-all flex items-center gap-2 disabled:opacity-40"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Request Changes</span>
                </button>

                <button
                  type="button"
                  disabled={isRegeneratingImage}
                  onClick={handleRegenerateImage}
                  className="px-4 py-2.5 rounded-xl bg-[#1c1f26] border border-white/10 text-[#f5f4f0] font-semibold text-xs hover:border-[#c5a059] transition-all flex items-center gap-2 disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingImage ? "animate-spin text-[#c5a059]" : ""}`} />
                  <span>Regenerate Image</span>
                </button>

                <button
                  type="button"
                  onClick={handleReject}
                  className="px-4 py-2.5 rounded-xl bg-[#0b0c0e] border border-[#a84b4b]/40 text-[#a84b4b] font-semibold text-xs hover:bg-[#a84b4b]/10 transition-all flex items-center gap-2"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>

              {/* REVIEW EVENT TIMELINE HISTORY */}
              {reviewEvents.length > 0 && (
                <div className="border-t border-white/10 pt-4 space-y-2">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#9e9d98] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#c5a059]" /> Review History Timeline
                  </span>
                  <div className="space-y-2">
                    {reviewEvents.map((evt) => (
                      <div key={evt.id} className="p-3 rounded-xl bg-[#0b0c0e] border border-white/10 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[#c5a059]">{evt.eventType}: </span>
                          <span className="text-[#9e9d98]">{evt.reviewerComment || "Action performed"}</span>
                        </div>
                        <span className="font-mono text-[10px] text-[#9e9d98]">
                          {new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FINAL INSTAGRAM PUBLISH PREVIEW MODAL */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-xl w-full p-8 rounded-3xl border-[#c5a059]/40 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center text-white">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f5f4f0]">Instagram Publish Preview</h3>
                  <p className="text-[11px] text-[#9e9d98]">
                    Target: @{instagramAccount?.username || "maisonlumiere_official"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="text-[#9e9d98] hover:text-[#f5f4f0] text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="space-y-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-[#0b0c0e]">
                <Image
                  src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop"
                  alt="Publish Preview"
                  fill
                  className="object-cover"
                />
              </div>

              <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/10 text-xs space-y-2">
                <span className="font-bold text-[#c5a059] uppercase tracking-wider text-[10px]">
                  Final Approved Combined Caption
                </span>
                <p className="text-[#f5f4f0] leading-relaxed whitespace-pre-wrap">
                  {editCaption}
                  {"\n\n"}
                  {editCta}
                  {"\n\n"}
                  {editHashtags
                    .split(",")
                    .map((t) => `#${t.replace(/^#/, "").trim()}`)
                    .join(" ")}
                </p>
              </div>
            </div>

            {/* PUBLISH CONFIRMATION ACTIONS */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <div className="text-[11px] text-[#9e9d98]">
                {publishSuccess ? (
                  <span className="text-[#4e8765] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Published! Media ID: {publishSuccess.instagramMediaId}
                  </span>
                ) : (
                  <span>Explicit Human Confirmation Required</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1c1f26] border border-white/10 text-xs font-semibold text-[#9e9d98]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isPublishing || !!publishSuccess}
                  onClick={handleExecutePublishing}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-40 shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  <span>{isPublishing ? "Publishing to Instagram..." : "Confirm & Publish"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
