"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, Zap } from "lucide-react";
import { SAAS_PLANS_REGISTRY, SubscriptionPlan } from "@ai-social/shared";
import { handleRazorpaySubscribeFlow } from "@/lib/razorpay-checkout";

export default function PricingPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan === "FREE") {
      router.push("/signup");
      return;
    }

    setLoadingPlan(plan);
    try {
      await handleRazorpaySubscribeFlow(
        plan,
        (msg) => {
          alert(msg);
          router.push("/settings/billing");
        },
        (err) => {
          alert(err);
        }
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to initiate checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = Object.values(SAAS_PLANS_REGISTRY);

  return (
    <div className="space-y-16 py-16 px-6 max-w-7xl mx-auto text-center">
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-semibold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tiered SaaS Membership Plans</span>
        </div>
        <h1 className="font-serif-luxury text-4xl md:text-6xl font-bold text-[#f5f4f0]">
          Transparent Studio Pricing
        </h1>
        <p className="text-xs md:text-sm text-[#9e9d98]">
          Choose the platform tier for your studio. Bring your own AI keys (OpenAI, Gemini, Claude, DeepSeek) and pay only for platform software usage.
        </p>
      </div>

      {/* 5-TIER PRICING GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 text-left">
        {plans.map((p) => {
          const isPopular = p.id === "PRO";
          const isLoading = loadingPlan === p.id;

          return (
            <div
              key={p.id}
              className={`glass-card p-6 rounded-3xl space-y-6 flex flex-col justify-between relative ${
                isPopular ? "border-2 border-[#c5a059] gold-glow" : ""
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#c5a059] text-black font-extrabold text-[9px] uppercase tracking-widest">
                  POPULAR
                </div>
              )}

              <div className="space-y-4">
                <div className="text-xs text-[#c5a059] uppercase tracking-wider font-bold">{p.name}</div>
                <div className="font-serif-luxury text-3xl font-bold text-[#f5f4f0]">
                  ₹{p.priceInr}{" "}
                  <span className="text-xs font-sans text-[#9e9d98] font-normal">
                    {p.priceInr === 0 ? "forever" : "/ mo"}
                  </span>
                </div>
                <p className="text-[11px] text-[#9e9d98] leading-snug">{p.description}</p>

                <div className="space-y-2.5 pt-3 border-t border-white/10 text-xs text-[#f5f4f0]">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                    <span>
                      <strong>{p.monthlyWorkflows}</strong> {p.isLifetimeLimit ? "free workflows" : "workflows/mo"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                    <span>
                      Up to <strong>{p.socialAccountLimit}</strong> connected social account(s)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                    <span>Rate limit: {p.rateLimitPerHour}/hr</span>
                  </div>

                  {p.features.includes("BRAND_VOICE") && (
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                      <span>Custom Brand Voice & Tone</span>
                    </div>
                  )}

                  {p.features.includes("CONTENT_REPURPOSING") && (
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                      <span>Content Repurposing Engine</span>
                    </div>
                  )}

                  {p.features.includes("PERFORMANCE_ADVISOR") && (
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                      <span>AI Performance Advisor</span>
                    </div>
                  )}

                  {p.features.includes("BULK_GENERATION") && (
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                      <span>Bulk Content Generation</span>
                    </div>
                  )}

                  {p.features.includes("BULK_PUBLISHING") && (
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                      <span>Bulk Multi-Platform Publishing</span>
                    </div>
                  )}

                  {p.features.includes("PRIORITY_QUEUE") && (
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                      <span>Priority Async Queue</span>
                    </div>
                  )}

                  {p.features.includes("TEAM_WORKSPACES") && (
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                      <span>Team Workspaces & Roles</span>
                    </div>
                  )}

                  {p.features.includes("CLIENT_APPROVALS") && (
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                      <span>Client Approvals & Portal</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                    <span className="text-[10px] text-[#9e9d98]">Bring Your Own AI Key</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSelectPlan(p.id)}
                disabled={isLoading}
                className={`w-full py-3 rounded-xl text-xs font-bold text-center transition-all shadow-md disabled:opacity-50 ${
                  isPopular
                    ? "bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black hover:brightness-110"
                    : "bg-[#1c1f26] border border-white/10 text-[#f5f4f0] hover:border-[#c5a059]"
                }`}
              >
                {isLoading ? "Processing..." : p.priceInr === 0 ? "Start Free" : `Choose ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
