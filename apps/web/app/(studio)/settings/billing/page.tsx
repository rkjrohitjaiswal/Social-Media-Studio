"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CreditCard, Sparkles, Check, AlertCircle, ArrowLeft, Coins, RotateCcw } from "lucide-react";
import { getBillingStatus, cancelSubscription } from "@/lib/api-client";
import { BillingStatusResponse, SubscriptionPlan, SAAS_PLANS_REGISTRY } from "@ai-social/shared";
import { handleRazorpaySubscribeFlow } from "@/lib/razorpay-checkout";

export default function BillingSettingsPage() {
  const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingMessage, setBillingMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    getBillingStatus()
      .then((status) => {
        if (isMounted) setBillingStatus(status);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpgradeCheckout = async (targetPlan: SubscriptionPlan) => {
    if (targetPlan === "FREE") return;

    setBillingLoading(true);
    setBillingMessage(null);

    try {
      await handleRazorpaySubscribeFlow(
        targetPlan,
        async (msg) => {
          setBillingMessage({ type: "success", text: msg });
          const updatedStatus = await getBillingStatus();
          setBillingStatus(updatedStatus);
        },
        (err) => {
          setBillingMessage({ type: "error", text: err });
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate upgrade checkout";
      setBillingMessage({
        type: "error",
        text: msg,
      });
    } finally {
      setBillingLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your paid subscription?")) return;

    setBillingLoading(true);
    setBillingMessage(null);

    try {
      const res = await cancelSubscription();
      setBillingMessage({
        type: "success",
        text: res.message || "Subscription canceled successfully.",
      });
      const updatedStatus = await getBillingStatus();
      setBillingStatus(updatedStatus);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel subscription";
      setBillingMessage({
        type: "error",
        text: msg,
      });
    } finally {
      setBillingLoading(false);
    }
  };

  const totalRemaining = billingStatus?.totalRemainingCredits ?? billingStatus?.workflowsRemaining ?? 0;
  const permRemaining = billingStatus?.permanentRemainingCredits ?? billingStatus?.workflowsRemaining ?? 0;
  const permTotal = billingStatus?.permanentTotalCredits ?? 10;
  const monthlyRemaining = billingStatus?.monthlyRemainingCredits ?? 0;
  const monthlyAllowance = billingStatus?.monthlyAllowance ?? (billingStatus?.plan === "FREE" ? 3 : billingStatus?.monthlyWorkflowsLimit ?? 0);

  return (
    <div className="space-y-8 pb-12 max-w-5xl">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 flex items-center justify-between">
        <div>
          <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-[#c5a059] hover:underline mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
          </Link>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0] flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-[#c5a059]" />
            Subscription & Billing
          </h1>
          <p className="text-xs text-[#9e9d98] mt-1">
            Manage your AI Social Media Studio subscription plan, usage credits, and Razorpay billing details.
          </p>
        </div>
      </div>

      {billingMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
            billingMessage.type === "success"
              ? "bg-[#4e8765]/10 border-[#4e8765]/30 text-[#4e8765]"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {billingMessage.type === "success" ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{billingMessage.text}</span>
        </div>
      )}

      {/* ACTIVE PLAN METRICS DASHBOARD */}
      <div className="glass-card p-6 rounded-3xl space-y-5 border border-[#c5a059]/30">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="font-semibold text-base text-[#f5f4f0] flex items-center gap-2">
              Active Plan: {billingStatus?.plan || "FREE"}{" "}
              {billingStatus?.subscriptionSource === "ADMIN_GRANT" ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37]">
                  Admin Granted
                </span>
              ) : billingStatus?.plan !== "FREE" ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                  Paid (Razorpay)
                </span>
              ) : null}
              <Sparkles className="w-4 h-4 text-[#c5a059]" />
            </h3>
            <p className="text-xs text-[#9e9d98]">Current billing cycle entitlements & usage tracking.</p>
          </div>

          <span className="px-3.5 py-1.5 rounded-full bg-[#c5a059]/20 border border-[#c5a059]/40 text-[#c5a059] font-mono font-bold text-xs">
            ₹{billingStatus?.priceInr ?? 0} / month
          </span>
        </div>

        {billingStatus?.plan === "FREE" && (
          <div className="p-4 rounded-2xl bg-[#c5a059]/10 border border-[#c5a059]/30 text-xs text-[#f5f4f0] space-y-1">
            <div className="font-semibold text-[#c5a059]">Free Credit Entitlements</div>
            <p>10 free credits for your first month, then 3 free credits every month after.</p>
          </div>
        )}

        {/* UNIFIED CREDIT BALANCE DASHBOARD */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* CURRENT CYCLE ALLOWANCE */}
          <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[#9e9d98]">
              <span>Current Cycle Allowance</span>
              <Sparkles className="w-4 h-4 text-[#c5a059]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#f5f4f0]">
              {billingStatus?.monthlyWorkflowsLimit ?? 10} <span className="text-xs font-normal text-[#9e9d98]">credits</span>
            </div>
            <div className="text-[11px] text-[#9e9d98]">
              {billingStatus?.isInitialMonth ? "First Month Allocation (10)" : "Monthly Allocation (3)"}
            </div>
          </div>

          {/* USED CREDITS */}
          <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[#9e9d98]">
              <span>Used Credits</span>
              <CreditCard className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#f5f4f0]">
              {billingStatus?.workflowsUsed ?? 0} <span className="text-xs font-normal text-[#9e9d98]">used</span>
            </div>
            <div className="text-[11px] text-[#9e9d98]">
              Consumed in current cycle
            </div>
          </div>

          {/* REMAINING CREDITS */}
          <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-[#c5a059]/30 space-y-2">
            <div className="flex items-center justify-between text-[#c5a059]">
              <span className="font-semibold">Remaining Credits</span>
              <Sparkles className="w-4 h-4 fill-[#c5a059]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#f5f4f0]">
              {billingStatus?.workflowsRemaining ?? 0} <span className="text-xs font-normal text-[#9e9d98]">available</span>
            </div>
            <div className="text-[11px] text-[#9e9d98]">
              {billingStatus?.nextMonthlyResetDate
                ? `Resets on ${new Date(billingStatus.nextMonthlyResetDate).toLocaleDateString()}`
                : "Resets every monthly cycle"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
          <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/5 space-y-2">
            <div className="text-[#9e9d98]">Connected Social Accounts</div>
            <div className="text-lg font-bold font-mono text-[#f5f4f0]">
              {billingStatus?.socialAccountsConnected ?? 1} / {billingStatus?.socialAccountLimit ?? 1}
            </div>
            <div className="text-[11px] text-[#9e9d98]">Social account connection limit</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/5 space-y-2">
            <div className="text-[#9e9d98]">Rate Limit Limit</div>
            <div className="text-lg font-bold font-mono text-[#f5f4f0]">
              {billingStatus?.rateLimitPerHour ?? 10} / hour
            </div>
            <div className="text-[11px] text-[#9e9d98]">Infrastructure abuse protection</div>
          </div>
        </div>

        {billingStatus?.cancelAtPeriodEnd && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
            Your subscription will end on {billingStatus.currentPeriodEnd ? new Date(billingStatus.currentPeriodEnd).toLocaleDateString() : "the end of your current billing period"}.
          </div>
        )}

        {billingStatus?.plan !== "FREE" && !billingStatus?.cancelAtPeriodEnd && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleCancelSubscription}
              disabled={billingLoading}
              className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              {billingLoading ? "Processing..." : "Cancel Subscription"}
            </button>
          </div>
        )}
      </div>

      {/* ALL 4 PAID TIER PLAN SELECTOR */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[#f5f4f0]">Upgrade Studio Plan Tier</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(["PRO", "ADVANCED", "PREMIUM", "BUSINESS"] as SubscriptionPlan[]).map((planKey) => {
            const planDef = SAAS_PLANS_REGISTRY[planKey];
            const isCurrent = billingStatus?.plan === planKey;

            return (
              <div
                key={planKey}
                className={`p-5 rounded-2xl bg-[#14161a] border space-y-3 flex flex-col justify-between ${
                  isCurrent ? "border-[#c5a059]" : "border-white/10"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#f5f4f0]">{planDef.name}</span>
                    <span className="text-xs font-bold font-mono text-[#c5a059]">₹{planDef.priceInr}/mo</span>
                  </div>
                  <p className="text-[11px] text-[#9e9d98] leading-tight">{planDef.description}</p>

                  <ul className="space-y-1.5 text-[11px] text-[#f5f4f0] pt-2 border-t border-white/5">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#c5a059]" />
                      <span>{planDef.monthlyWorkflows} workflows/mo</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#c5a059]" />
                      <span>Up to {planDef.socialAccountLimit} accounts</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#c5a059]" />
                      <span>{planDef.rateLimitPerHour} requests/hr</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleUpgradeCheckout(planKey)}
                  disabled={billingLoading || isCurrent}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold text-center transition-all ${
                    isCurrent
                      ? "bg-[#1c1f26] border border-white/10 text-[#9e9d98] cursor-default"
                      : "bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black hover:brightness-110"
                  }`}
                >
                  {isCurrent ? "Current Plan" : `Upgrade to ${planDef.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
