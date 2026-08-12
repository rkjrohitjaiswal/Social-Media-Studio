"use client";

import React, { useState } from "react";
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  Eye,
  Globe,
  Lock,
} from "lucide-react";
import { PlatformIcon } from "@/components/icons/PlatformIcons";
import { SocialPlatform, SocialAccountStatus } from "@/lib/social-engine/types";

interface AccountCardProps {
  id: string;
  platform: SocialPlatform;
  username: string;
  displayName: string;
  accountType: string;
  status: SocialAccountStatus;
  connectedAt: string;
}

const INITIAL_ACCOUNTS: AccountCardProps[] = [
  {
    id: "acc-1",
    platform: "INSTAGRAM",
    username: "@tech_account",
    displayName: "Tech & Product Feed",
    accountType: "PROFESSIONAL",
    status: "CONNECTED",
    connectedAt: "Jan 15, 2026",
  },
  {
    id: "acc-2",
    platform: "INSTAGRAM",
    username: "@affiliate_account",
    displayName: "Affiliate & Lifestyle Hub",
    accountType: "PROFESSIONAL",
    status: "CONNECTED",
    connectedAt: "Feb 01, 2026",
  },
  {
    id: "acc-3",
    platform: "LINKEDIN",
    username: "Alex Rivera",
    displayName: "Personal Profile",
    accountType: "PERSONAL",
    status: "CONNECTED",
    connectedAt: "Mar 10, 2026",
  },
  {
    id: "acc-4",
    platform: "YOUTUBE",
    username: "Tech Education Channel",
    displayName: "Tech Education",
    accountType: "CHANNEL",
    status: "CONNECTED",
    connectedAt: "Apr 05, 2026",
  },
  {
    id: "acc-5",
    platform: "PINTEREST",
    username: "Tech Board",
    displayName: "Tech Inspiration Board",
    accountType: "BOARD",
    status: "CONNECTED",
    connectedAt: "Apr 12, 2026",
  },
];

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<AccountCardProps[]>(INITIAL_ACCOUNTS);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const handleDisconnect = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-10 pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
            <Share2 className="w-3.5 h-3.5" />
            <span>Multi-Account Management</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
            Social Media Accounts
          </h1>
          <p className="text-xs text-[#9e9d98] mt-1">
            Connect multiple social accounts per platform and manage access authorization securely.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowConnectModal(true)}
          className="px-5 py-2.5 rounded-xl bg-[#c5a059] text-black font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Connect Social Account</span>
        </button>
      </div>

      {/* SECURITY BANNER */}
      <div className="p-4 rounded-2xl bg-[#0b0c0e] border border-white/10 text-xs flex items-center gap-3">
        <Lock className="w-5 h-5 text-[#c5a059] flex-shrink-0" />
        <div>
          <div className="font-bold text-[#f5f4f0]">Strict Security & Privacy Protocol</div>
          <p className="text-[#9e9d98] text-[11px] mt-0.5">
            Access tokens and credentials are encrypted using AES-256-GCM. Plaintext secrets are never exposed to the client or browser logs.
          </p>
        </div>
      </div>

      {/* CONNECTED ACCOUNTS GRID */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#f5f4f0] uppercase tracking-wider">
          Connected Workspace Accounts ({accounts.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="glass-card p-6 rounded-3xl space-y-4 flex flex-col justify-between border-white/10 hover:border-[#c5a059]/40 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#1c1f26] border border-white/10 flex items-center justify-center text-[#c5a059]">
                    <PlatformIcon platform={acc.platform} className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#f5f4f0]">{acc.displayName}</div>
                    <div className="text-xs text-[#c5a059] font-mono">{acc.username}</div>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-[#4e8765]/20 text-[#4e8765] border border-[#4e8765]/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {acc.status}
                </span>
              </div>

              <div className="text-[11px] text-[#9e9d98] space-y-1 border-t border-white/10 pt-3">
                <div className="flex justify-between">
                  <span>Platform:</span>
                  <span className="font-semibold text-[#f5f4f0]">{acc.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span>Account Type:</span>
                  <span className="font-semibold text-[#f5f4f0]">{acc.accountType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Connected Date:</span>
                  <span className="font-semibold text-[#f5f4f0]">{acc.connectedAt}</span>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                <button
                  type="button"
                  onClick={() => alert(`Details for ${acc.username}`)}
                  className="text-[#9e9d98] hover:text-[#f5f4f0] transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => alert(`Reconnecting ${acc.username}...`)}
                    className="p-2 rounded-xl bg-[#1c1f26] text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all"
                    title="Reconnect"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDisconnect(acc.id)}
                    className="p-2 rounded-xl bg-[#0b0c0e] text-[#a84b4b] border border-[#a84b4b]/30 hover:bg-[#a84b4b]/20 transition-all"
                    title="Disconnect"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CONNECT MODAL PLACEHOLDER */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-6 md:p-8 rounded-3xl max-w-md w-full space-y-6 border-[#c5a059]/40 gold-glow">
            <h3 className="text-lg font-bold text-[#f5f4f0]">Connect New Social Account</h3>
            <p className="text-xs text-[#9e9d98]">
              Select a target platform to initiate secure OAuth 2.0 authorization.
            </p>
            <div className="space-y-2">
              {["INSTAGRAM", "LINKEDIN", "PINTEREST", "FACEBOOK", "YOUTUBE", "THREADS", "TIKTOK", "X"].map((plat) => (
                <button
                  key={plat}
                  type="button"
                  onClick={() => {
                    const newAcc: AccountCardProps = {
                      id: `acc-${Date.now()}`,
                      platform: plat as SocialPlatform,
                      username: `@new_${plat.toLowerCase()}_account`,
                      displayName: `${plat} Account`,
                      accountType: "PROFESSIONAL",
                      status: "CONNECTED",
                      connectedAt: "Just now",
                    };
                    setAccounts((prev) => [...prev, newAcc]);
                    setShowConnectModal(false);
                  }}
                  className="w-full p-3 rounded-xl bg-[#0b0c0e] border border-white/10 hover:border-[#c5a059] text-xs font-bold text-[#f5f4f0] text-left flex justify-between items-center"
                >
                  <span>{plat}</span>
                  <Plus className="w-4 h-4 text-[#c5a059]" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowConnectModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#1c1f26] text-xs text-[#9e9d98] font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
