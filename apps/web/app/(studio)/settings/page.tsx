"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Key,
  Users,
  Check,
  AlertCircle,
  Trash2,
  RefreshCw,
  CreditCard,
  Zap,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { InstagramIcon as Instagram } from "@/components/ui/InstagramIcon";
import {
  getApiKeys,
  saveProviderApiKey,
  testProviderApiKey,
  deleteProviderApiKey,
  getBillingStatus,
  createSubscriptionCheckout,
  cancelSubscription,
} from "@/lib/api-client";
import { BillingStatusResponse, SubscriptionPlan, SAAS_PLANS_REGISTRY } from "@ai-social/shared";

type ProviderId = "openai" | "gemini" | "anthropic" | "deepseek";

interface ProviderConfig {
  id: ProviderId;
  name: string;
  placeholder: string;
  description: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    placeholder: "sk-...",
    description: "GPT-4o Mini & DALL-E image generation models.",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    placeholder: "AIza...",
    description: "Gemini 1.5 Flash & Pro multimodal models.",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    placeholder: "sk-ant-...",
    description: "Claude 3.5 Sonnet high-reasoning copy model.",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    placeholder: "sk-...",
    description: "DeepSeek V3 Chat & Coder cost-efficient models.",
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"providers" | "billing" | "integrations" | "team">("providers");

  // Multi-Provider State
  const [providerInputs, setProviderInputs] = useState<Record<ProviderId, string>>({
    openai: "",
    gemini: "",
    anthropic: "",
    deepseek: "",
  });
  const [showKey, setShowKey] = useState<Record<ProviderId, boolean>>({
    openai: false,
    gemini: false,
    anthropic: false,
    deepseek: false,
  });
  const [configuredProviders, setConfiguredProviders] = useState<Record<ProviderId, boolean>>({
    openai: false,
    gemini: false,
    anthropic: false,
    deepseek: false,
  });
  const [loadingProvider, setLoadingProvider] = useState<ProviderId | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ provider: ProviderId; type: "success" | "error"; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ provider: ProviderId; text: string } | null>(null);

  // Billing State
  const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingMessage, setBillingMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initial Load
  useEffect(() => {
    let isMounted = true;

    // Load Provider Metadata
    getApiKeys()
      .then((keys) => {
        if (!isMounted) return;
        const configMap: Record<ProviderId, boolean> = {
          openai: false,
          gemini: false,
          anthropic: false,
          deepseek: false,
        };
        keys.forEach((k) => {
          const prov = k.provider.toLowerCase() as ProviderId;
          if (configMap[prov] !== undefined) {
            configMap[prov] = k.configured;
          }
        });
        setConfiguredProviders(configMap);
      })
      .catch(() => {});

    // Load Billing Status
    getBillingStatus()
      .then((status) => {
        if (!isMounted) return;
        setBillingStatus(status);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveKey = async (e: React.FormEvent, provider: ProviderId) => {
    e.preventDefault();
    const keyVal = providerInputs[provider]?.trim();
    if (!keyVal) return;

    setLoadingProvider(provider);
    setStatusMessage(null);
    setTestResult(null);

    try {
      await saveProviderApiKey(provider, keyVal);
      setConfiguredProviders((prev) => ({ ...prev, [provider]: true }));
      setProviderInputs((prev) => ({ ...prev, [provider]: "" }));
      setStatusMessage({
        provider,
        type: "success",
        text: `${provider.toUpperCase()} API key encrypted & saved securely. We never display your saved key.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save API key";
      setStatusMessage({
        provider,
        type: "error",
        text: msg,
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleTestKey = async (provider: ProviderId) => {
    setLoadingProvider(provider);
    setStatusMessage(null);
    setTestResult(null);

    try {
      const res = await testProviderApiKey(provider);
      setTestResult({
        provider,
        text: res.message || `${provider.toUpperCase()} connection verified!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection test failed";
      setStatusMessage({
        provider,
        type: "error",
        text: msg,
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleDeleteKey = async (provider: ProviderId) => {
    if (!confirm(`Are you sure you want to remove your ${provider.toUpperCase()} API key?`)) return;

    setLoadingProvider(provider);
    setStatusMessage(null);
    setTestResult(null);

    try {
      await deleteProviderApiKey(provider);
      setConfiguredProviders((prev) => ({ ...prev, [provider]: false }));
      setProviderInputs((prev) => ({ ...prev, [provider]: "" }));
      setStatusMessage({
        provider,
        type: "success",
        text: `${provider.toUpperCase()} API key removed successfully.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove API key";
      setStatusMessage({
        provider,
        type: "error",
        text: msg,
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  // Billing Actions
  const handleUpgradeCheckout = async (targetPlan: SubscriptionPlan) => {
    if (targetPlan === "FREE") return;

    setBillingLoading(true);
    setBillingMessage(null);

    try {
      const checkout = await createSubscriptionCheckout(targetPlan);
      if (checkout.checkoutUrl && checkout.checkoutUrl.startsWith("http")) {
        window.location.assign(checkout.checkoutUrl);
      } else {
        setBillingMessage({
          type: "success",
          text: `Checkout session created for ${targetPlan} (₹${checkout.amountInr}/month). (Provider Order: ${checkout.orderId || checkout.subscriptionId})`,
        });
        const updatedStatus = await getBillingStatus();
        setBillingStatus(updatedStatus);
      }
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

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
          <Settings className="w-3.5 h-3.5" />
          <span>SaaS Platform Settings</span>
        </div>
        <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
          Studio Workspace Settings
        </h1>
        <p className="text-xs text-[#9e9d98] mt-1">
          Manage Bring-Your-Own-Key (BYOK) AI providers, platform subscription billing, and integrations.
        </p>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-white/10 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("providers")}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === "providers"
              ? "border-[#c5a059] text-[#c5a059]"
              : "border-transparent text-[#9e9d98] hover:text-[#f5f4f0]"
          }`}
        >
          <Key className="w-4 h-4" /> AI Providers (BYOK)
        </button>

        <button
          onClick={() => setActiveTab("billing")}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === "billing"
              ? "border-[#c5a059] text-[#c5a059]"
              : "border-transparent text-[#9e9d98] hover:text-[#f5f4f0]"
          }`}
        >
          <CreditCard className="w-4 h-4" /> Subscription & Billing
        </button>

        <button
          onClick={() => setActiveTab("integrations")}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === "integrations"
              ? "border-[#c5a059] text-[#c5a059]"
              : "border-transparent text-[#9e9d98] hover:text-[#f5f4f0]"
          }`}
        >
          <Instagram className="w-4 h-4 text-current" /> Social Integrations
        </button>

        <button
          onClick={() => setActiveTab("team")}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === "team"
              ? "border-[#c5a059] text-[#c5a059]"
              : "border-transparent text-[#9e9d98] hover:text-[#f5f4f0]"
          }`}
        >
          <Users className="w-4 h-4" /> Team & Roles
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === "providers" && (
        <div className="space-y-6">
          {/* NOTICE BANNER */}
          <div className="p-4 rounded-2xl bg-[#c5a059]/10 border border-[#c5a059]/30 text-xs text-[#f5f4f0] space-y-1">
            <div className="font-semibold text-[#c5a059] flex items-center gap-2">
              <Zap className="w-4 h-4" /> Bring Your Own AI Key (BYOK) Policy
            </div>
            <p className="text-[#9e9d98] text-[11px] leading-relaxed">
              Bring your own AI API key. Your AI provider may charge you separately for API usage according to their pricing structure.
              The platform subscription covers AI Social Media Studio software access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PROVIDERS.map((p) => {
              const isConfigured = configuredProviders[p.id];
              const isLoading = loadingProvider === p.id;
              const hasStatusMsg = statusMessage?.provider === p.id ? statusMessage : null;
              const hasTestRes = testResult?.provider === p.id ? testResult : null;
              const isShowingPass = showKey[p.id];

              return (
                <div key={p.id} className="glass-card p-6 rounded-3xl space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <h3 className="font-semibold text-sm text-[#f5f4f0] flex items-center gap-2">
                          {p.name}
                        </h3>
                        <p className="text-[11px] text-[#9e9d98]">{p.description}</p>
                      </div>
                      {isConfigured ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#4e8765]/20 text-[#4e8765] text-[10px] font-bold border border-[#4e8765]/40 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Configured
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-[10px] font-bold border border-yellow-500/20">
                          Not Configured
                        </span>
                      )}
                    </div>

                    <form onSubmit={(e) => handleSaveKey(e, p.id)} className="space-y-3 mt-4">
                      <div>
                        <label className="block text-xs text-[#9e9d98] mb-1">
                          {isConfigured ? `Update ${p.name} API Key` : `Enter ${p.name} API Key`}
                        </label>
                        <div className="relative">
                          <input
                            type={isShowingPass ? "text" : "password"}
                            placeholder={isConfigured ? "••••••••••••••••••••••••••••••••" : p.placeholder}
                            value={providerInputs[p.id]}
                            onChange={(e) =>
                              setProviderInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-xs text-[#f5f4f0] font-mono focus:border-[#c5a059] focus:outline-none"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9e9d98] hover:text-[#f5f4f0]"
                            aria-label={isShowingPass ? "Hide key" : "Show key"}
                          >
                            {isShowingPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {hasStatusMsg && (
                        <div
                          className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                            hasStatusMsg.type === "success"
                              ? "bg-[#4e8765]/10 border-[#4e8765]/30 text-[#4e8765]"
                              : "bg-red-500/10 border-red-500/30 text-red-400"
                          }`}
                        >
                          {hasStatusMsg.type === "success" ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{hasStatusMsg.text}</span>
                        </div>
                      )}

                      {hasTestRes && (
                        <div className="p-2.5 rounded-xl text-xs bg-[#4e8765]/10 border border-[#4e8765]/30 text-[#4e8765] flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>{hasTestRes.text}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={isLoading || !providerInputs[p.id]?.trim()}
                          className="px-3.5 py-1.5 rounded-xl bg-[#c5a059] text-black text-xs font-bold disabled:opacity-50 hover:bg-[#d4af66] transition-colors"
                        >
                          {isLoading ? "Saving..." : "Save Key"}
                        </button>

                        {isConfigured && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleTestKey(p.id)}
                              disabled={isLoading}
                              className="px-3 py-1.5 rounded-xl bg-[#1c1f26] border border-white/10 text-xs font-semibold text-[#f5f4f0] hover:bg-[#252a33] transition-colors flex items-center gap-1"
                            >
                              <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                              Test
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteKey(p.id)}
                              disabled={isLoading}
                              className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </form>
                  </div>
                  <div className="text-[10px] text-[#6b6a65] border-t border-white/5 pt-2">
                    Your API usage is billed by {p.name} according to their standard rates.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BILLING & SUBSCRIPTION TAB */}
      {activeTab === "billing" && (
        <div className="space-y-6 max-w-5xl">
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
          <div className="glass-card p-6 rounded-3xl space-y-4 border border-[#c5a059]/30">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-semibold text-base text-[#f5f4f0] flex items-center gap-2">
                  Active Subscription: {billingStatus?.plan || "FREE"}{" "}
                  <Sparkles className="w-4 h-4 text-[#c5a059]" />
                </h3>
                <p className="text-xs text-[#9e9d98]">Current billing cycle entitlements & usage tracking.</p>
              </div>

              <span className="px-3.5 py-1.5 rounded-full bg-[#c5a059]/20 border border-[#c5a059]/40 text-[#c5a059] font-mono font-bold text-xs">
                ₹{billingStatus?.priceInr ?? 0} / month
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/5 space-y-2">
                <div className="text-[#9e9d98]">Workflow Usage</div>
                <div className="text-lg font-bold font-mono text-[#f5f4f0]">
                  {billingStatus?.workflowsUsed ?? 0} / {billingStatus?.monthlyWorkflowsLimit ?? 3}
                </div>
                <div className="text-[11px] text-[#4e8765]">
                  {billingStatus?.workflowsRemaining ?? 3} workflows remaining
                </div>
              </div>

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

            {billingStatus?.plan !== "FREE" && (
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

          {/* ALL 5 TIER PLAN SELECTOR */}
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
      )}

      {/* INTEGRATIONS TAB */}
      {activeTab === "integrations" && (
        <div className="glass-card p-6 rounded-3xl space-y-4 max-w-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <Instagram className="w-5 h-5 text-[#c5a059]" />
              <div>
                <h3 className="font-semibold text-sm text-[#f5f4f0]">Instagram Graph API Integration</h3>
                <p className="text-[11px] text-[#9e9d98]">Connect Meta Business Account for direct post scheduling.</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#4e8765]/20 text-[#4e8765] text-xs font-bold border border-[#4e8765]/40 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Connected
            </span>
          </div>
        </div>
      )}

      {/* TEAM TAB */}
      {activeTab === "team" && (
        <div className="glass-card p-6 rounded-3xl space-y-4 max-w-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#c5a059]" />
              <div>
                <h3 className="font-semibold text-sm text-[#f5f4f0]">Workspace Members & Roles</h3>
                <p className="text-[11px] text-[#9e9d98]">Manage team access permissions for your studio.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
