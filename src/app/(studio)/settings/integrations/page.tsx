"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  RefreshCw,
  LogOut,
  Sparkles,
  ShieldCheck,
  Globe,
  Webhook,
  ChevronRight,
  Zap,
} from "lucide-react";
import { InstagramIcon as Instagram } from "@/components/icons/InstagramIcon";
import { AccountState } from "@/lib/queue/instagram-worker";

export default function IntegrationsSettingsPage() {
  const [account, setAccount] = useState<AccountState | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadAccount() {
      try {
        const res = await fetch("/api/integrations/instagram");
        const json = await res.json();
        if (isMounted && json.success && json.account) {
          setAccount(json.account);
        }
      } catch {
        // Ignore load error
      }
    }

    loadAccount();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleConnect = () => {
    window.location.assign("/api/integrations/instagram/connect");
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/instagram/disconnect", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setAccount(null);
      }
    } catch {
      // Ignore disconnect error
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Channel &amp; Automation Integrations</span>
        </div>
        <h1 className="font-serif-luxury text-3xl font-bold text-[#f5f4f0]">
          External System Integrations
        </h1>
        <p className="text-xs text-[#9e9d98] mt-1">
          Connect your Instagram Professional account for direct publishing and n8n for external workflow automation.
        </p>
      </div>

      {/* INSTAGRAM INTEGRATION CARD */}
      <div className="glass-card p-8 rounded-3xl space-y-6 border-[#c5a059]/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] p-0.5 shadow-lg flex items-center justify-center">
              <div className="w-full h-full bg-[#0b0c0e] rounded-[14px] flex items-center justify-center">
                <Instagram className="w-7 h-7 text-[#f5f4f0]" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#f5f4f0]">Instagram Professional</h2>
                {account && account.status === "CONNECTED" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#4e8765]/20 text-[#4e8765] border border-[#4e8765]/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> CONNECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9e9d98] mt-0.5">
                Official Meta Graph API Integration for Professional &amp; Creator Accounts
              </p>
            </div>
          </div>

          <div>
            {account && account.status === "CONNECTED" ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleConnect}
                  className="px-4 py-2 rounded-xl bg-[#1c1f26] border border-white/10 text-xs font-semibold text-[#f5f4f0] hover:border-[#c5a059] transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>Reconnect</span>
                </button>

                <button
                  type="button"
                  disabled={isDisconnecting}
                  onClick={handleDisconnect}
                  className="px-4 py-2 rounded-xl bg-[#0b0c0e] border border-[#a84b4b]/40 text-xs font-semibold text-[#a84b4b] hover:bg-[#a84b4b]/10 transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isDisconnecting ? "Disconnecting..." : "Disconnect"}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                className="px-6 py-2.5 rounded-xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 shadow-lg"
              >
                <Instagram className="w-4 h-4 text-black" />
                <span>Connect Instagram Account</span>
              </button>
            )}
          </div>
        </div>

        {/* CONNECTED ACCOUNT DETAILS */}
        {account && account.status === "CONNECTED" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/10 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9e9d98]">
                Connected Account
              </span>
              <div className="text-sm font-bold text-[#c5a059] font-mono">@{account.username}</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/10 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9e9d98]">
                Account Type
              </span>
              <div className="text-sm font-semibold text-[#f5f4f0]">{account.accountType}</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/10 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9e9d98]">
                Security Encryption
              </span>
              <div className="text-xs font-semibold text-[#4e8765] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4e8765]" /> AES-256-GCM Encrypted Token
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/10 text-xs text-[#9e9d98]">
            No Instagram account connected to this workspace. Connect your Professional account to enable manual publishing.
          </div>
        )}

        <div className="text-[11px] text-[#9e9d98] flex items-center gap-1.5 border-t border-white/10 pt-4">
          <Globe className="w-3.5 h-3.5 text-[#c5a059]" />
          <span>Tokens are stored encrypted server-side and never exposed to client-side React code.</span>
        </div>
      </div>

      {/* N8N AUTOMATION INTEGRATION CARD */}
      <div className="glass-card p-8 rounded-3xl space-y-6 border-[#c5a059]/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#14161a] border border-[#c5a059]/40 shadow-lg flex items-center justify-center text-[#c5a059]">
              <Webhook className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#f5f4f0]">N8n Workflow Automation</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/40 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> WEBHOOK HUB
                </span>
              </div>
              <p className="text-xs text-[#9e9d98] mt-0.5">
                Asynchronous event dispatch with HMAC-SHA256 signatures &amp; replay protection
              </p>
            </div>
          </div>

          <Link
            href="/settings/integrations/n8n"
            className="px-6 py-2.5 rounded-xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 shadow-lg w-fit"
          >
            <span>Configure N8n Webhooks</span>
            <ChevronRight className="w-4 h-4 text-black" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/10 space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9e9d98]">
              Supported Events
            </span>
            <div className="text-sm font-bold text-[#f5f4f0]">16 Event Types</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/10 space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9e9d98]">
              Webhook Security
            </span>
            <div className="text-xs font-semibold text-[#4e8765] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4e8765]" /> HMAC-SHA256 Signed
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/10 space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9e9d98]">
              SSRF Protection
            </span>
            <div className="text-xs font-semibold text-[#4e8765] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4e8765]" /> IP Range Safeguards
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
