"use client";

import React, { useState } from "react";
import { Settings, ShieldCheck, Key, Users, Server, Check } from "lucide-react";
import { InstagramIcon as Instagram } from "@/components/ui/InstagramIcon";

export default function SettingsPage() {
  const [instagramConnected, setInstagramConnected] = useState(true);
  const [openAiKey, setOpenAiKey] = useState("sk-proj-********************************");

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
          <Settings className="w-3.5 h-3.5" />
          <span>Infrastructure Configuration</span>
        </div>
        <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
          Studio Workspace Settings
        </h1>
        <p className="text-xs text-[#9e9d98] mt-1">
          Manage API keys, social connections, team memberships, and server proxies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT MAIN SETTINGS */}
        <div className="lg:col-span-8 space-y-6">
          {/* INSTAGRAM GRAPH API CONNECTION */}
          <div className="glass-card p-6 rounded-3xl space-y-4">
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
            <div className="p-3.5 rounded-xl bg-[#0b0c0e] border border-white/5 text-xs text-[#9e9d98] flex items-center justify-between">
              <div>
                <div className="text-[#f5f4f0] font-medium">@maisonlumiere_official</div>
                <div className="text-[10px] text-[#6b6a65]">Instagram Business Account • Long-lived token active</div>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-[#1c1f26] border border-white/10 text-xs text-[#c5a059]">
                Re-authenticate
              </button>
            </div>
          </div>

          {/* OPENAI API SERVER PROXY SETTINGS */}
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-[#c5a059]" />
                <div>
                  <h3 className="font-semibold text-sm text-[#f5f4f0]">OpenAI API Key (Server-Side Proxy)</h3>
                  <p className="text-[11px] text-[#9e9d98]">Keys remain on backend API; never exposed to browser bundles.</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#9e9d98] mb-1.5">OpenAI API Key</label>
              <input
                type="password"
                value={openAiKey}
                onChange={(e) => setOpenAiKey(e.target.value)}
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] font-mono focus:border-[#c5a059] focus:outline-none"
              />
            </div>
          </div>

          {/* TEAM MEMBERS TABLE */}
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-[#c5a059]" />
                <div>
                  <h3 className="font-semibold text-sm text-[#f5f4f0]">Workspace Members & Roles</h3>
                  <p className="text-[11px] text-[#9e9d98]">Manage team access permissions for your studio.</p>
                </div>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-[#c5a059] text-black text-xs font-bold">
                + Invite Team Member
              </button>
            </div>

            <div className="space-y-3">
              {[
                { name: "Creative Director", email: "director@maisonlumiere.com", role: "OWNER" },
                { name: "Senior Art Director", email: "art@maisonlumiere.com", role: "ADMIN" },
                { name: "Social Content Manager", email: "social@maisonlumiere.com", role: "EDITOR" },
              ].map((m, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#0b0c0e] border border-white/5 text-xs">
                  <div>
                    <div className="font-medium text-[#f5f4f0]">{m.name}</div>
                    <div className="text-[10px] text-[#9e9d98]">{m.email}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-[#1c1f26] text-[10px] font-mono font-bold text-[#c5a059] border border-white/10">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE SECURITY INFRA AUDIT */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-[#9e9d98]">
              Security & Storage Audit
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0b0c0e] border border-white/5">
                <span className="text-[#9e9d98]">Object Storage S3</span>
                <span className="text-[#4e8765] font-semibold">Supabase Active</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0b0c0e] border border-white/5">
                <span className="text-[#9e9d98]">BullMQ Worker Queue</span>
                <span className="text-[#4e8765] font-semibold">Redis Connected</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0b0c0e] border border-white/5">
                <span className="text-[#9e9d98]">Database Isolation</span>
                <span className="text-[#4e8765] font-semibold">Row-Level Security</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
