"use client";

import React from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="space-y-16 py-16 px-6 max-w-7xl mx-auto text-center">
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-semibold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Couture Membership Plans</span>
        </div>
        <h1 className="font-serif-luxury text-4xl md:text-6xl font-bold text-[#f5f4f0]">
          Predictable Atelier Pricing
        </h1>
        <p className="text-xs md:text-sm text-[#9e9d98]">
          Tailored tier structures for independent luxury brands, high-fashion houses, and global creative agencies.
        </p>
      </div>

      {/* PRICING CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        {/* ATELIER TIER */}
        <div className="glass-card p-8 rounded-3xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="text-xs text-[#9e9d98] uppercase tracking-wider font-semibold">Couture Atelier</div>
            <div className="font-serif-luxury text-4xl font-bold text-[#f5f4f0]">
              $290 <span className="text-xs font-sans text-[#9e9d98] font-normal">/ month</span>
            </div>
            <p className="text-xs text-[#9e9d98]">Ideal for emerging luxury labels creating monthly campaign drops.</p>

            <div className="space-y-3 pt-4 border-t border-white/10 text-xs text-[#f5f4f0]">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#c5a059]" />
                <span>Up to 10 Campaigns / month</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#c5a059]" />
                <span>1 Anchor Reference : 50 Inputs</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#c5a059]" />
                <span>GPT-4o Copy & Hashtags</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#c5a059]" />
                <span>Instagram Direct Publishing</span>
              </div>
            </div>
          </div>

          <Link
            href="/signup"
            className="w-full py-3.5 rounded-xl bg-[#1c1f26] border border-white/10 text-xs font-semibold text-[#f5f4f0] hover:border-[#c5a059] text-center block transition-colors"
          >
            Select Atelier
          </Link>
        </div>

        {/* MAISON TIER (POPULAR) */}
        <div className="glass-card p-8 rounded-3xl space-y-6 flex flex-col justify-between border-2 border-[#c5a059] gold-glow relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#c5a059] text-black font-extrabold text-[10px] uppercase tracking-widest">
            MOST POPULAR
          </div>

          <div className="space-y-4">
            <div className="text-xs text-[#c5a059] uppercase tracking-wider font-bold">Maison Studio</div>
            <div className="font-serif-luxury text-4xl font-bold text-[#f5f4f0]">
              $750 <span className="text-xs font-sans text-[#9e9d98] font-normal">/ month</span>
            </div>
            <p className="text-xs text-[#9e9d98]">For established fashion houses & high-volume brand studios.</p>

            <div className="space-y-3 pt-4 border-t border-white/10 text-xs text-[#f5f4f0]">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#c5a059]" />
                <span>Unlimited Campaigns & Batches</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#c5a059]" />
                <span>1 Anchor Reference : 250 Inputs</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#c5a059]" />
                <span>AI Quality Score Audit Engine</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#c5a059]" />
                <span>Multi-Brand Identity Manager</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#c5a059]" />
                <span>Priority BullMQ Async Worker Pool</span>
              </div>
            </div>
          </div>

          <Link
            href="/signup"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-xs hover:brightness-110 text-center block transition-all shadow-xl"
          >
            Start Maison Membership
          </Link>
        </div>

        {/* ENTERPRISE HAUTE TIER */}
        <div className="glass-card p-8 rounded-3xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="text-xs text-[#9e9d98] uppercase tracking-wider font-semibold">Haute Enterprise</div>
            <div className="font-serif-luxury text-4xl font-bold text-[#f5f4f0]">Custom</div>
            <p className="text-xs text-[#9e9d98]">Custom dedicated infrastructure for global luxury conglomerates.</p>

            <div className="space-y-3 pt-4 border-t border-white/10 text-xs text-[#f5f4f0]">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#c5a059]" />
                <span>Custom Fine-Tuned AI Style Vectors</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#c5a059]" />
                <span>Dedicated Redis & BullMQ Node</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#c5a059]" />
                <span>Custom Social Graph Integrations</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#c5a059]" />
                <span>Dedicated SLA & VIP Concierge</span>
              </div>
            </div>
          </div>

          <Link
            href="/about"
            className="w-full py-3.5 rounded-xl bg-[#1c1f26] border border-white/10 text-xs font-semibold text-[#f5f4f0] hover:border-[#c5a059] text-center block transition-colors"
          >
            Contact Luxury Team
          </Link>
        </div>
      </div>
    </div>
  );
}
