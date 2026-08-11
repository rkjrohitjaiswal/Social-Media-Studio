"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Sparkles,
  Share2,
  Globe,
  Filter,
} from "lucide-react";
import { PlatformIcon } from "@/components/icons/PlatformIcons";
import { SocialPlatform, ApprovalStatus, ContentType } from "@/lib/social-engine/types";

interface PlatformReviewCard {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  contentType: ContentType;
  mediaUrl: string;
  caption: string;
  title?: string;
  description?: string;
  hashtags: string[];
  cta: string;
  qualityScore: number;
  approvalStatus: ApprovalStatus;
}

const MOCK_REVIEW_ITEMS: PlatformReviewCard[] = [
  {
    id: "rev-1",
    platform: "INSTAGRAM",
    accountName: "@tech_account",
    contentType: "AFFILIATE_PRODUCT",
    mediaUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600&auto=format&fit=crop",
    caption: "Elevate your photography with the Lumière 85mm Lens. Precision glass & f/1.2 aperture.",
    hashtags: ["#AffiliateFinds", "#Photography", "#CameraGear"],
    cta: "Tap link in bio to shop now!",
    qualityScore: 96,
    approvalStatus: "PENDING",
  },
  {
    id: "rev-2",
    platform: "LINKEDIN",
    accountName: "Alex Rivera (Personal Profile)",
    contentType: "CERTIFICATION",
    mediaUrl: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=600&auto=format&fit=crop",
    title: "Milestone: AWS Certified AI Specialist",
    caption: "Delighted to share that I have completed the AWS Certified AI & ML Specialist certification!",
    hashtags: ["#Achievement", "#CareerGrowth", "#AWS"],
    cta: "View certificate credential details below.",
    qualityScore: 94,
    approvalStatus: "PENDING",
  },
  {
    id: "rev-3",
    platform: "PINTEREST",
    accountName: "Tech Board",
    contentType: "AFFILIATE_PRODUCT",
    mediaUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=600&auto=format&fit=crop",
    title: "Essential Lens Gear Pin",
    description: "Discover the best camera lens specs and professional reviews.",
    caption: "Lumière Lens Guide",
    hashtags: ["#Camera", "#Design", "#Gear"],
    cta: "Click pin to visit product page",
    qualityScore: 92,
    approvalStatus: "APPROVED",
  },
  {
    id: "rev-4",
    platform: "X",
    accountName: "@tech_account",
    contentType: "TEACHING",
    mediaUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=600&auto=format&fit=crop",
    caption: "🧵 Thread: 3 key principles of Multi-Platform AI Content Engine architecture.",
    hashtags: ["#tech", "#dev", "#buildinpublic"],
    cta: "Retweet if helpful!",
    qualityScore: 95,
    approvalStatus: "PENDING",
  },
];

const PLATFORM_TABS: (SocialPlatform | "ALL")[] = [
  "ALL",
  "INSTAGRAM",
  "LINKEDIN",
  "THREADS",
  "PINTEREST",
  "FACEBOOK",
  "TIKTOK",
  "YOUTUBE",
  "X",
  "REDDIT",
  "TELEGRAM",
  "BLUESKY",
];

export default function ContentReviewPage() {
  const [activeTab, setActiveTab] = useState<SocialPlatform | "ALL">("ALL");
  const [items, setItems] = useState<PlatformReviewCard[]>(MOCK_REVIEW_ITEMS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const filteredItems = activeTab === "ALL" ? items : items.filter((i) => i.platform === activeTab);

  const handleApprove = (id: string) => {
    // Approval isolation: approves ONLY this item!
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, approvalStatus: "APPROVED" } : i))
    );
  };

  const handleReject = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, approvalStatus: "REJECTED" } : i))
    );
  };

  const handleStartEdit = (item: PlatformReviewCard) => {
    setEditingId(item.id);
    setEditText(item.caption);
  };

  const handleSaveEdit = (id: string) => {
    // Editing rule: If approved platform content changes, approval resets to PENDING
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              caption: editText,
              approvalStatus: "PENDING",
            }
          : i
      )
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-10 pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Platform Content Governance</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
            Multi-Platform Content Review
          </h1>
          <p className="text-xs text-[#9e9d98] mt-1">
            Review and approve platform-tailored content with platform-isolated safety controls.
          </p>
        </div>
      </div>

      {/* PLATFORM TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 no-scrollbar">
        <Filter className="w-4 h-4 text-[#c5a059] flex-shrink-0 mr-1" />
        {PLATFORM_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab
                ? "bg-[#c5a059] text-black shadow-lg"
                : "bg-[#1c1f26] text-[#9e9d98] hover:text-[#f5f4f0]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* REVIEW CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="glass-card p-6 rounded-3xl space-y-6 flex flex-col justify-between border-white/10 hover:border-[#c5a059]/40 transition-all gold-glow"
          >
            <div className="space-y-4">
              {/* TOP BAR */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#1c1f26] text-[#c5a059] border border-white/10">
                    <PlatformIcon platform={item.platform} className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#f5f4f0]">{item.platform}</div>
                    <div className="text-[11px] text-[#c5a059] font-mono">{item.accountName}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#4e8765] bg-[#4e8765]/10 px-2 py-0.5 rounded border border-[#4e8765]/20">
                    QS: {item.qualityScore}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.approvalStatus === "APPROVED"
                        ? "bg-[#4e8765]/20 text-[#4e8765] border border-[#4e8765]/40"
                        : item.approvalStatus === "REJECTED"
                        ? "bg-[#a84b4b]/20 text-[#a84b4b] border border-[#a84b4b]/40"
                        : "bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/40"
                    }`}
                  >
                    {item.approvalStatus}
                  </span>
                </div>
              </div>

              {/* MEDIA PREVIEW & CONTENT */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative w-full sm:w-36 h-36 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                  <Image src={item.mediaUrl} alt={item.platform} fill className="object-cover" />
                </div>

                <div className="flex-1 space-y-2 text-xs">
                  {item.title && <div className="font-bold text-[#f5f4f0]">{item.title}</div>}
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-[#0b0c0e] border border-[#c5a059] rounded-xl p-2 text-xs text-[#f5f4f0]"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(item.id)}
                        className="px-3 py-1 bg-[#c5a059] text-black font-bold rounded-lg text-[10px]"
                      >
                        Save & Reset Approval to PENDING
                      </button>
                    </div>
                  ) : (
                    <p className="text-[#9e9d98] leading-relaxed">{item.caption}</p>
                  )}

                  <div className="text-[11px] text-[#c5a059] font-mono">
                    {item.hashtags.join(" ")}
                  </div>
                  <div className="text-[11px] text-[#f5f4f0] font-semibold italic">
                    CTA: {item.cta}
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs">
              <button
                type="button"
                onClick={() => handleStartEdit(item)}
                className="text-[#9e9d98] hover:text-[#f5f4f0] flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#c5a059]" />
                <span>Edit</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleReject(item.id)}
                  className="px-3 py-1.5 rounded-xl bg-[#0b0c0e] border border-[#a84b4b]/40 text-[#a84b4b] font-semibold hover:bg-[#a84b4b]/20 transition-all flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(item.id)}
                  className="px-4 py-1.5 rounded-xl bg-[#4e8765] text-black font-bold hover:brightness-110 transition-all flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                  <span>Approve</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
