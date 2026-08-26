"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Key,
  ShieldCheck,
  Zap,
  Globe,
  Lock,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Check,
  Tv,
  Image as ImageIcon,
  Video,
  FileText,
  Share2,
  Layers,
  HelpCircle,
  User,
  Building2,
  ExternalLink,
  Sliders,
  Sparkles,
  Info,
} from "lucide-react";
import { getAuthHeader } from "@/lib/api-client";

interface ApiKeyMeta {
  provider: string;
  isConfigured: boolean;
  maskedKey?: string;
  updatedAt?: string;
}

interface SocialAccountItem {
  id: string;
  platform: string;
  externalAccountId?: string;
  username?: string;
  displayName?: string;
  accountType?: string;
  status: string;
  updatedAt?: string;
}

export default function UnifiedConnectionsPage() {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");

  // Loading & Data State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiKeysMeta, setApiKeysMeta] = useState<ApiKeyMeta[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountItem[]>([]);
  const [providerStatuses, setProviderStatuses] = useState<Record<string, { ready: boolean; name: string }>>({});

  // Feedback Toast Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Configure Key Modal State
  const [configuringProvider, setConfiguringProvider] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [inputApiKey, setInputApiKey] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Disconnect Confirmation Modal State
  const [disconnectingTarget, setDisconnectingTarget] = useState<{
    type: "AI_PROVIDER" | "SOCIAL_ACCOUNT";
    id: string;
    name: string;
  } | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Testing Key State
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);

  // Connect Social Account Modal State
  const [connectingPlatform, setConnectingPlatform] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [inputHandle, setInputHandle] = useState("");
  const [isConnectingSocial, setIsConnectingSocial] = useState(false);

  // Load Data
  const loadConnectionsData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const authHeader = await getAuthHeader();

      const [keysRes, accountsRes, provRes] = await Promise.all([
        fetch(`${apiBase}/api/settings/api-keys`, { headers: { ...authHeader } }),
        fetch(`${apiBase}/api/integrations/accounts`, { headers: { ...authHeader } }),
        fetch(`${apiBase}/api/integrations/providers/status`, { headers: { ...authHeader } }),
      ]);

      const keysJson = await keysRes.json();
      const accountsJson = await accountsRes.json();
      const provJson = await provRes.json();

      if (keysJson.success && Array.isArray(keysJson.data)) {
        setApiKeysMeta(keysJson.data);
      }
      if (accountsJson.success && Array.isArray(accountsJson.data)) {
        setSocialAccounts(accountsJson.data);
      }
      if (provJson.success && provJson.data) {
        setProviderStatuses(provJson.data);
      }
    } catch {
      setErrorMsg("Failed to load connections data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadConnectionsData();
  }, []);

  // Supported AI Providers Definition
  const supportedAiProviders = [
    {
      id: "openai",
      name: "OpenAI",
      type: "GPT-4o, Vision & DALL-E 3",
      desc: "Powers natural language generation, scriptwriting, and image variations.",
    },
    {
      id: "gemini",
      name: "Google / Gemini",
      type: "Gemini 1.5 Pro / Flash",
      desc: "Powers high-speed multi-modal content analysis and creative planning.",
    },
    {
      id: "runway",
      name: "Runway",
      type: "Gen-2 / Gen-3 Video AI",
      desc: "Powers high-fidelity video clip generation and cinematic rendering.",
    },
    {
      id: "luma",
      name: "Luma Dream Machine",
      type: "High-Resolution Video AI",
      desc: "Powers realistic motion video and commercial scene synthesis.",
    },
    {
      id: "elevenlabs",
      name: "ElevenLabs Voice",
      type: "AI Voiceover & Speech",
      desc: "Powers voiceover synthesis, voice cloning, and audio narration.",
    },
    {
      id: "anthropic",
      name: "Anthropic",
      type: "Claude 3.5 Sonnet",
      desc: "Powers complex editorial reasoning and long-form narrative structure.",
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      type: "DeepSeek-V3 / R1 Engine",
      desc: "Powers high-performance algorithmic copy and strategic optimization.",
    },
  ];

  // Supported Social Platforms Definition
  const supportedSocialPlatforms = [
    {
      id: "youtube",
      name: "YouTube",
      apiType: "YouTube Data API v3",
      desc: "Shorts, long-form videos, and community publishing.",
    },
    {
      id: "instagram",
      name: "Instagram",
      apiType: "Instagram Graph API v18.0",
      desc: "Reels, Carousels, Stories, and Grid posts.",
    },
    {
      id: "tiktok",
      name: "TikTok",
      apiType: "TikTok Content Posting API",
      desc: "Short-form vertical video and viral trends.",
    },
    {
      id: "facebook",
      name: "Facebook",
      apiType: "Page Graph API",
      desc: "Page feed posts, video publishing, and reels.",
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      apiType: "Share API v2",
      desc: "Thought leadership, document carousels, and articles.",
    },
    {
      id: "x",
      name: "X (Twitter)",
      apiType: "Twitter API v2",
      desc: "Threads, short posts, and real-time news amplification.",
    },
    {
      id: "pinterest",
      name: "Pinterest",
      apiType: "Pins API v5",
      desc: "Visual pins, story pins, and idea boards.",
    },
    {
      id: "threads",
      name: "Threads",
      apiType: "Meta Threads API",
      desc: "Text conversations, image carousels, and micro-posts.",
    },
  ];

  // Merge Provider State (Supported Providers + API Keys Metadata)
  const mergedAiProviders = useMemo(() => {
    return supportedAiProviders.map((prov) => {
      const keyMeta = apiKeysMeta.find((k) => k.provider.toLowerCase() === prov.id.toLowerCase());
      const isConfigured = keyMeta?.isConfigured || false;
      const maskedKey = keyMeta?.maskedKey || "Not configured";
      const updatedAt = keyMeta?.updatedAt;

      return {
        ...prov,
        isConfigured,
        maskedKey: isConfigured ? maskedKey : "Not configured",
        status: isConfigured ? "CONNECTED" : "NOT_CONNECTED",
        updatedAt,
      };
    });
  }, [apiKeysMeta]);

  // Merge Social Platform State (Supported Platforms + DB Connected Accounts)
  const mergedSocialPlatforms = useMemo(() => {
    return supportedSocialPlatforms.map((plat) => {
      const acc = socialAccounts.find(
        (a) => a.platform.toLowerCase() === plat.id.toLowerCase()
      );
      const isConnected = !!acc;
      const username = acc ? acc.username || acc.displayName || "Connected Account" : "No active connection";

      return {
        ...plat,
        accountId: acc?.id,
        isConnected,
        username,
        status: isConnected ? "CONNECTED" : "NOT_CONNECTED",
        updatedAt: acc?.updatedAt,
      };
    });
  }, [socialAccounts]);

  // Filtered Lists
  const filteredAiProviders = useMemo(() => {
    if (!searchQuery.trim()) return mergedAiProviders;
    const q = searchQuery.toLowerCase();
    return mergedAiProviders.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
    );
  }, [mergedAiProviders, searchQuery]);

  const filteredSocialPlatforms = useMemo(() => {
    if (!searchQuery.trim()) return mergedSocialPlatforms;
    const q = searchQuery.toLowerCase();
    return mergedSocialPlatforms.filter(
      (p) => p.name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
    );
  }, [mergedSocialPlatforms, searchQuery]);

  // Total Connection Counters
  const connectedCount = useMemo(() => {
    const aiCount = mergedAiProviders.filter((p) => p.isConfigured).length;
    const socialCount = mergedSocialPlatforms.filter((p) => p.isConnected).length;
    return { aiCount, socialCount, total: aiCount + socialCount };
  }, [mergedAiProviders, mergedSocialPlatforms]);

  // Action: Save API Key
  const handleSaveApiKey = async () => {
    if (!configuringProvider || !inputApiKey.trim()) return;
    setIsSavingKey(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${apiBase}/api/settings/api-keys/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          provider: configuringProvider.id.toLowerCase(),
          apiKey: inputApiKey.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save API key.");
      }

      setSuccessMsg(`${configuringProvider.name} API key configured and verified successfully.`);
      setConfiguringProvider(null);
      setInputApiKey("");
      await loadConnectionsData(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setIsSavingKey(false);
    }
  };

  // Action: Test API Key Connection
  const handleTestApiKey = async (providerId: string, providerName: string) => {
    setTestingProviderId(providerId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${apiBase}/api/settings/api-keys/${providerId.toLowerCase()}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Connection test failed for ${providerName}.`);
      }

      setSuccessMsg(`${providerName} connection verified successfully!`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTestingProviderId(null);
    }
  };

  // Action: Disconnect Confirmation Handler
  const handleConfirmDisconnect = async () => {
    if (!disconnectingTarget) return;
    setIsDisconnecting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const authHeader = await getAuthHeader();

      if (disconnectingTarget.type === "AI_PROVIDER") {
        const res = await fetch(`${apiBase}/api/settings/api-keys/${disconnectingTarget.id.toLowerCase()}`, {
          method: "DELETE",
          headers: { ...authHeader },
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to disconnect ${disconnectingTarget.name}.`);
        }
        setSuccessMsg(`${disconnectingTarget.name} provider key disconnected.`);
      } else {
        const res = await fetch(`${apiBase}/api/integrations/disconnect/${disconnectingTarget.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to disconnect ${disconnectingTarget.name}.`);
        }
        setSuccessMsg(`${disconnectingTarget.name} channel disconnected.`);
      }

      setDisconnectingTarget(null);
      await loadConnectionsData(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Action: Connect Social Account
  const handleConfirmConnectSocial = async () => {
    if (!connectingPlatform || !inputHandle.trim()) return;
    setIsConnectingSocial(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const formattedHandle = inputHandle.trim().startsWith("@") ? inputHandle.trim() : `@${inputHandle.trim()}`;

      const res = await fetch(`${apiBase}/api/integrations/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          platform: connectingPlatform.id.toUpperCase(),
          externalAccountId: `acc_${connectingPlatform.id}_${Date.now()}`,
          username: formattedHandle,
          displayName: `${connectingPlatform.name} Channel`,
          accountType: "BUSINESS",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to connect social account.");
      }

      setSuccessMsg(`${connectingPlatform.name} connected successfully as ${formattedHandle}!`);
      setConnectingPlatform(null);
      setInputHandle("");
      await loadConnectionsData(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to connect channel");
    } finally {
      setIsConnectingSocial(false);
    }
  };

  // Helper Platform Icon Mapper
  const renderPlatformIcon = (platformStr: string) => {
    const p = platformStr.toUpperCase();
    if (p.includes("YOUTUBE")) return <Tv className="w-5 h-5 text-[#D4AF37]" />;
    if (p.includes("INSTAGRAM")) return <ImageIcon className="w-5 h-5 text-[#D4AF37]" />;
    if (p.includes("TIKTOK")) return <Video className="w-5 h-5 text-[#D4AF37]" />;
    if (p.includes("LINKEDIN")) return <FileText className="w-5 h-5 text-[#D4AF37]" />;
    if (p.includes("X") || p.includes("TWITTER")) return <Share2 className="w-5 h-5 text-[#D4AF37]" />;
    return <Layers className="w-5 h-5 text-[#D4AF37]" />;
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#F5F4F0] p-4 sm:p-6 lg:p-8 space-y-6 font-sans selection:bg-[#D4AF37]/30">
      {/* 1. PAGE HEADER */}
      <header className="border-b border-white/[0.08] pb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20">
              AI SOCIAL MEDIA STUDIO
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F4F0]">
            Connections
          </h1>
          <p className="text-xs sm:text-sm text-[#9E9D98] mt-0.5">
            Connect your AI providers and social channels to power your workflow.
          </p>
        </div>

        {/* Right Header Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 font-mono text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9E9D98] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections..."
              className="bg-[#151618] border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#F5F4F0] focus:border-[#D4AF37]/50 outline-none w-36 sm:w-48 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9E9D98] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadConnectionsData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-[#151618] border border-white/[0.08] text-[#9E9D98] hover:text-[#F5F4F0] transition-colors disabled:opacity-50"
            title="Refresh Connections State"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#D4AF37]" : ""}`} />
          </button>

          {/* Help Link */}
          <Link
            href="/help"
            className="p-2 rounded-xl bg-[#151618] border border-white/[0.08] text-[#9E9D98] hover:text-[#F5F4F0] transition-colors"
            title="Help & Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </Link>

          {/* Workspace Indicator */}
          <div className="px-3 py-1.5 rounded-xl bg-[#151618] border border-white/[0.08] text-[#F5F4F0] flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="font-bold">Demo Workspace</span>
          </div>

          {/* Account Menu Button */}
          <Link
            href="/settings/profile"
            className="px-3 py-1.5 rounded-xl bg-[#151618] border border-white/[0.08] text-[#F5F4F0] hover:border-[#D4AF37]/40 transition-all flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Account</span>
          </Link>
        </div>
      </header>

      {/* FEEDBACK ALERTS */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. SECURITY / BYOK BANNER */}
      <div className="bg-[#151618] border-l-4 border-l-[#D4AF37] border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-2 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
          <h2 className="text-sm sm:text-base font-bold text-[#F5F4F0]">Your credentials stay yours.</h2>
        </div>
        <p className="text-xs text-[#9E9D98] max-w-3xl leading-relaxed">
          Connect your own AI providers and social accounts. Credentials are securely encrypted (AES-256-GCM) for your workspace and are never exposed in the UI.
        </p>
      </div>

      {/* 3. ZERO-SAFE EMPTY STATE */}
      {!isLoading && connectedCount.total === 0 && (
        <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto my-6">
          <Key className="w-12 h-12 text-[#9E9D98] mx-auto opacity-40" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#F5F4F0]">No connections yet</h2>
            <p className="text-xs text-[#9E9D98] font-mono">
              Connect your AI providers and social channels to start creating and publishing.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() =>
                setConfiguringProvider({ id: "openai", name: "OpenAI" })
              }
              className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-mono font-bold hover:opacity-95"
            >
              + Connect a Provider
            </button>
            <button
              onClick={() =>
                setConnectingPlatform({ id: "youtube", name: "YouTube" })
              }
              className="px-4 py-2 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs font-mono font-bold text-[#F5F4F0] hover:bg-white/5"
            >
              + Connect a Channel
            </button>
          </div>
        </div>
      )}

      {/* 4. AI PROVIDERS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h2 className="text-base font-bold text-[#F5F4F0] flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#D4AF37]" />
            <span>AI PROVIDERS</span>
          </h2>
          <span className="text-xs font-mono text-[#9E9D98]">
            {connectedCount.aiCount} of {mergedAiProviders.length} Configured
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-3 bg-[#151618] border border-white/[0.08] rounded-3xl">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto" />
            <p className="text-xs font-mono text-[#9E9D98]">Loading AI Providers status...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAiProviders.map((item) => (
              <div
                key={item.id}
                className="bg-[#151618] border border-white/[0.08] hover:border-[#D4AF37]/40 rounded-3xl p-5 space-y-4 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#F5F4F0] group-hover:text-[#D4AF37] transition-colors">
                        {item.name}
                      </h3>
                      <span className="text-[11px] font-mono text-[#9E9D98]">{item.type}</span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                        item.isConfigured
                          ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                          : "bg-white/5 text-[#9E9D98] border border-white/10"
                      }`}
                    >
                      {item.isConfigured ? "CONNECTED" : "NOT CONNECTED"}
                    </span>
                  </div>

                  <p className="text-xs text-[#9E9D98] leading-relaxed line-clamp-2">
                    {item.desc}
                  </p>

                  <div className="flex items-center gap-2 text-xs font-mono text-[#9E9D98] bg-[#0B0C0E] p-2.5 rounded-2xl border border-white/[0.06]">
                    <Lock className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <span className="truncate">{item.maskedKey}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfiguringProvider({ id: item.id, name: item.name })}
                      className="px-3 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs font-mono text-[#F5F4F0] hover:bg-white/5 transition-all"
                    >
                      Configure
                    </button>

                    {item.isConfigured && (
                      <button
                        onClick={() => handleTestApiKey(item.id, item.name)}
                        disabled={testingProviderId === item.id}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#9E9D98] transition-all disabled:opacity-50"
                      >
                        {testingProviderId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Test"
                        )}
                      </button>
                    )}
                  </div>

                  {item.isConfigured ? (
                    <button
                      onClick={() =>
                        setDisconnectingTarget({
                          type: "AI_PROVIDER",
                          id: item.id,
                          name: item.name,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono hover:bg-rose-500/20 transition-all"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfiguringProvider({ id: item.id, name: item.name })}
                      className="px-3 py-1.5 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-mono font-bold hover:opacity-95 transition-all"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. SOCIAL PLATFORMS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h2 className="text-base font-bold text-[#F5F4F0] flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#D4AF37]" />
            <span>SOCIAL PLATFORMS</span>
          </h2>
          <span className="text-xs font-mono text-[#9E9D98]">
            {connectedCount.socialCount} of {mergedSocialPlatforms.length} Connected
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-3 bg-[#151618] border border-white/[0.08] rounded-3xl">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto" />
            <p className="text-xs font-mono text-[#9E9D98]">Loading Social Platforms status...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {filteredSocialPlatforms.map((item) => (
              <div
                key={item.id}
                className="bg-[#151618] border border-white/[0.08] hover:border-[#D4AF37]/40 rounded-3xl p-5 space-y-4 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {renderPlatformIcon(item.name)}
                      <h3 className="text-sm font-bold text-[#F5F4F0] group-hover:text-[#D4AF37] transition-colors">
                        {item.name}
                      </h3>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                        item.isConnected
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-white/5 text-[#9E9D98] border border-white/10"
                      }`}
                    >
                      {item.isConnected ? "CONNECTED" : "NOT CONNECTED"}
                    </span>
                  </div>

                  <p className="text-xs text-[#9E9D98] font-mono truncate">{item.username}</p>

                  <div className="text-[10px] font-mono text-[#9E9D98]/60 border-t border-white/[0.06] pt-2 truncate">
                    {item.apiType}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  {item.isConnected ? (
                    <>
                      <button
                        onClick={() =>
                          setConnectingPlatform({ id: item.id, name: item.name })
                        }
                        className="px-3 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs font-mono text-[#F5F4F0] hover:bg-white/5"
                      >
                        Configure
                      </button>
                      <button
                        onClick={() =>
                          setDisconnectingTarget({
                            type: "SOCIAL_ACCOUNT",
                            id: item.accountId || item.id,
                            name: item.name,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono hover:bg-rose-500/20"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() =>
                        setConnectingPlatform({ id: item.id, name: item.name })
                      }
                      className="w-full py-1.5 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-mono font-bold hover:opacity-95 transition-all text-center"
                    >
                      Connect Channel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. BYOK EXPLANATION SECTION */}
      <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="text-sm font-bold text-[#F5F4F0]">Bring Your Own Providers</h3>
        </div>
        <p className="text-xs text-[#9E9D98] leading-relaxed max-w-4xl">
          Connect your own AI providers and social accounts. AI SOCIAL MEDIA STUDIO provides the creative workflow, orchestration and publishing infrastructure while you retain control of your provider credentials and costs.
        </p>
      </div>

      {/* CONFIGURE API KEY MODAL */}
      {configuringProvider && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-[#F5F4F0]">
                Configure {configuringProvider.name} API Key
              </h3>
              <button
                onClick={() => {
                  setConfiguringProvider(null);
                  setInputApiKey("");
                }}
                className="text-[#9E9D98] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-[10px] font-mono text-[#9E9D98]">
                {configuringProvider.name} API Secret Key
              </label>
              <input
                type="password"
                value={inputApiKey}
                onChange={(e) => setInputApiKey(e.target.value)}
                placeholder="Paste API secret key..."
                className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] font-mono focus:border-[#D4AF37] outline-none"
              />
              <p className="text-[11px] text-[#9E9D98] italic font-mono">
                Key will be AES-256 encrypted server-side and never displayed in full.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => {
                  setConfiguringProvider(null);
                  setInputApiKey("");
                }}
                className="px-4 py-2 rounded-xl bg-[#0B0C0E] text-xs font-semibold text-[#9E9D98]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                disabled={isSavingKey || !inputApiKey.trim()}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold font-mono flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingKey && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Key</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCONNECT CONFIRMATION MODAL */}
      {disconnectingTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-[#F5F4F0]">
                Disconnect {disconnectingTarget.name}?
              </h3>
              <button
                onClick={() => setDisconnectingTarget(null)}
                className="text-[#9E9D98] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#9E9D98] leading-relaxed">
              Are you sure you want to disconnect {disconnectingTarget.name}? Workflows relying on this connection will pause until re-connected.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setDisconnectingTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#0B0C0E] text-xs font-semibold text-[#9E9D98]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisconnect}
                disabled={isDisconnecting}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold font-mono flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDisconnecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONNECT SOCIAL ACCOUNT MODAL */}
      {connectingPlatform && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-[#F5F4F0]">
                Connect {connectingPlatform.name} Channel
              </h3>
              <button
                onClick={() => {
                  setConnectingPlatform(null);
                  setInputHandle("");
                }}
                className="text-[#9E9D98] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-[10px] font-mono text-[#9E9D98]">
                Channel / Account Username
              </label>
              <input
                type="text"
                value={inputHandle}
                onChange={(e) => setInputHandle(e.target.value)}
                placeholder="@username"
                className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] font-mono focus:border-[#D4AF37] outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => {
                  setConnectingPlatform(null);
                  setInputHandle("");
                }}
                className="px-4 py-2 rounded-xl bg-[#0B0C0E] text-xs font-semibold text-[#9E9D98]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmConnectSocial}
                disabled={isConnectingSocial || !inputHandle.trim()}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold font-mono flex items-center gap-1.5 disabled:opacity-50"
              >
                {isConnectingSocial && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Authorize &amp; Connect</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
