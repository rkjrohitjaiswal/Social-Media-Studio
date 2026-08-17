"use client";

import React, { useState, useEffect, use } from "react";
import { Sparkles, CheckCircle2, MessageSquare, AlertCircle } from "lucide-react";
import { getPublicApprovalLink, reviewPublicApproval } from "@/lib/api-client";
import { ApprovalRequestResponse, ApprovalAuditLogResponse, ApprovalWorkflowStatus } from "@ai-social/shared";

export default function ClientApprovalPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [approval, setApproval] = useState<ApprovalRequestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    getPublicApprovalLink(token)
      .then((data) => setApproval(data))
      .catch((err) => setStatusMessage({ type: "error", text: err.message }))
      .finally(() => setLoading(false));
  }, [token]);

  const handleReview = async (action: "APPROVE" | "REQUEST_CHANGES") => {
    if (action === "REQUEST_CHANGES" && !comment.trim()) {
      alert("Please provide a comment describing the requested changes.");
      return;
    }

    setReviewing(true);
    setStatusMessage(null);

    try {
      const updated = await reviewPublicApproval(token, action, comment);
      setStatusMessage({
        type: "success",
        text: action === "APPROVE" ? "✓ Content approved successfully!" : "✓ Changes requested successfully.",
      });
      setApproval((prev) => (prev ? { ...prev, status: updated.status as ApprovalWorkflowStatus, auditLogs: updated.auditLogs } : null));
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to process review action",
      });
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c0e] text-[#f5f4f0] flex items-center justify-center text-xs">
        Loading Client Approval Portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#f5f4f0] p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* CLIENT PORTAL HEADER */}
        <div className="border-b border-white/10 pb-6 text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-semibold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Secure Client Approval Portal</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
            Review & Approve Creative Drop
          </h1>
          <p className="text-xs text-[#9e9d98]">
            Review the drafted caption, media preview, and hashtags below.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center gap-2 ${
              statusMessage.type === "success"
                ? "bg-[#4e8765]/10 border-[#4e8765]/30 text-[#4e8765]"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {statusMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {approval && (
          <div className="glass-card p-8 rounded-3xl space-y-6">
            {/* CONTENT STATUS BADGE */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#f5f4f0]">{approval.contentTitle}</h2>
                <div className="text-xs text-[#c5a059] font-mono uppercase mt-0.5">{approval.platform}</div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  approval.status === "APPROVED"
                    ? "bg-[#4e8765]/20 text-[#4e8765] border-[#4e8765]/40"
                    : approval.status === "CHANGES_REQUESTED"
                    ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/40"
                    : "bg-[#c5a059]/20 text-[#c5a059] border-[#c5a059]/40"
                }`}
              >
                {approval.status}
              </span>
            </div>

            {/* PREVIEW IMAGE */}
            {approval.previewUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-white/10 max-h-80 flex items-center justify-center bg-[#14161a]">
                <img
                  src={approval.previewUrl}
                  alt={approval.contentTitle}
                  className="object-cover w-full h-full"
                />
              </div>
            )}

            {/* CAPTION BOX */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#9e9d98]">Drafted Caption & Copy</label>
              <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/10 text-xs text-[#f5f4f0] whitespace-pre-wrap leading-relaxed">
                {approval.caption}
              </div>
            </div>

            {/* FEEDBACK COMMENT FIELD */}
            {approval.status !== "APPROVED" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#9e9d98]">Feedback / Requested Changes Comment</label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. Please update the call-to-action to invite users to our upcoming webinar..."
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-2xl p-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none resize-none font-sans"
                />
              </div>
            )}

            {/* ACTION BUTTONS */}
            {approval.status !== "APPROVED" && (
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => handleReview("APPROVE")}
                  disabled={reviewing}
                  className="flex-1 py-3 rounded-xl bg-[#4e8765] text-white font-bold text-xs hover:bg-[#3d6e51] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {reviewing ? "Processing..." : "Approve Content"}
                </button>

                <button
                  onClick={() => handleReview("REQUEST_CHANGES")}
                  disabled={reviewing}
                  className="flex-1 py-3 rounded-xl bg-[#1c1f26] border border-yellow-500/40 text-yellow-500 font-bold text-xs hover:bg-yellow-500/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  {reviewing ? "Processing..." : "Request Changes"}
                </button>
              </div>
            )}

            {/* AUDIT LOG TRAIL */}
            {approval.auditLogs && approval.auditLogs.length > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-3">
                <h3 className="text-xs font-bold text-[#9e9d98] uppercase tracking-wider">Approval Audit Log</h3>
                <div className="space-y-2">
                  {approval.auditLogs.map((log: ApprovalAuditLogResponse, i: number) => (
                    <div key={i} className="p-3 rounded-xl bg-[#0b0c0e] border border-white/5 text-[11px] flex justify-between items-center">
                      <div>
                        <span className="font-bold text-[#c5a059]">{log.action}: </span>
                        <span className="text-[#f5f4f0]">{log.comment || "No comment"}</span>
                      </div>
                      <span className="text-[#6b6a65] text-[10px]">{new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
