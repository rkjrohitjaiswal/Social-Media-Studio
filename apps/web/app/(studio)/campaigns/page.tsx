"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FolderKanban,
  PlusCircle,
  Sparkles,
  Layers,
  Calendar,
  ChevronRight,
  Loader2,
  ImageIcon
} from "lucide-react";

interface CampaignItem {
  id: string;
  name: string;
  description?: string;
  status: string;
  brandName?: string;
  referenceAsset?: {
    signedUrl?: string;
    fileName?: string;
  };
  inputCount: number;
  createdAt: string;
}

export default function CampaignsListPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/campaigns");
        const data = await res.json();
        if (data.success && data.campaigns) {
          setCampaigns(data.campaigns);
        }
      } catch {
        // Fallback default mock
      } finally {
        setIsLoading(false);
      }
    }

    loadCampaigns();
  }, []);

  return (
    <div className="space-y-10 pb-16">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Campaign Directory</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
            Studio Campaigns
          </h1>
          <p className="text-xs text-[#9e9d98] mt-1">
            Manage, configure, and inspect batch campaign generation suites.
          </p>
        </div>

        <Link
          href="/create"
          className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-xs shadow-xl hover:brightness-110 transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4 text-black" />
          <span>Create New Campaign</span>
        </Link>
      </div>

      {/* LOADING SPINNER */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-[#9e9d98] flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#c5a059]" />
          <span>Loading studio campaigns...</span>
        </div>
      ) : campaigns.length === 0 ? (
        /* EMPTY STATE */
        <div className="glass-card p-12 text-center rounded-3xl space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#1c1f26] border border-white/10 text-[#c5a059] flex items-center justify-center mx-auto">
            <FolderKanban className="w-7 h-7" />
          </div>
          <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0]">No Campaigns Created Yet</h3>
          <p className="text-xs text-[#9e9d98]">
            Start your first batch campaign by pairing a master reference image with product input assets.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 transition-all"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>Create First Campaign</span>
          </Link>
        </div>
      ) : (
        /* CAMPAIGN CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((camp) => (
            <Link
              key={camp.id}
              href={`/campaigns/${camp.id}`}
              className="group glass-card p-6 rounded-3xl space-y-5 border-white/10 hover:border-[#c5a059]/50 transition-all hover:scale-[1.01]"
            >
              {/* CARD THUMBNAIL & STATUS */}
              <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-[#0b0c0e] border border-white/10 flex items-center justify-center">
                {camp.referenceAsset?.signedUrl ? (
                  <Image
                    src={camp.referenceAsset.signedUrl}
                    alt={camp.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-8 h-8 text-[#9e9d98] mx-auto mb-1" />
                    <span className="text-[11px] text-[#9e9d98]">No Reference Image</span>
                  </div>
                )}

                <div className="absolute top-3 right-3 z-10">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md ${
                      camp.status === "READY"
                        ? "bg-[#4e8765]/20 text-[#4e8765] border-[#4e8765]/40"
                        : "bg-[#c5a059]/20 text-[#c5a059] border-[#c5a059]/40"
                    }`}
                  >
                    {camp.status}
                  </span>
                </div>
              </div>

              {/* CARD DETAILS */}
              <div className="space-y-2">
                <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0] group-hover:text-[#c5a059] transition-colors leading-tight">
                  {camp.name}
                </h3>
                <p className="text-xs text-[#9e9d98] line-clamp-2">
                  {camp.description || "Batch social media asset generation suite"}
                </p>
              </div>

              {/* FOOTER METRICS */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#9e9d98]">
                <div className="flex items-center gap-1.5 text-[#f5f4f0] font-medium">
                  <Layers className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>1 Ref + {camp.inputCount} Inputs</span>
                </div>

                <div className="flex items-center gap-1 text-[#c5a059] font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Manage</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
