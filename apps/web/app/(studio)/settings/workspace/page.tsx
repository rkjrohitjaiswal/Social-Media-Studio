"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  UserPlus,
  Edit3,
  Trash2,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  X,
  ShieldCheck,
  Crown,
  UserCheck,
  Mail,
  RefreshCw,
  HelpCircle,
  User as UserIcon,
  ChevronDown,
  Check,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { getAuthHeader } from "@/lib/api-client";

interface WorkspaceMember {
  id: string;
  userId: string;
  email: string;
  role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
  joinedAt: string;
  name?: string;
  avatarUrl?: string;
}

interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
}

interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: string;
  description?: string;
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  createdAt: string;
}

type TableTab = "ALL" | "ACTIVE" | "PENDING";

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Active Workspace & List
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("demo-workspace-1");
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceItem | null>(null);

  // Table Filter & Search State
  const [tableTab, setTableTab] = useState<TableTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);

  // Loading & Feedback State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSwitchingWs, setIsSwitchingWs] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals State
  // 1. Edit Workspace Modal
  const [showEditWsModal, setShowEditWsModal] = useState(false);
  const [editWsName, setEditWsName] = useState("");
  const [editWsDesc, setEditWsDesc] = useState("");
  const [isSavingWs, setIsSavingWs] = useState(false);

  // 2. Invite Member Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "EDITOR" | "VIEWER">("EDITOR");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // 3. Member Action Modals
  const [activeActionMember, setActiveActionMember] = useState<{
    member: WorkspaceMember;
    action: "CHANGE_ROLE" | "REMOVE";
  } | null>(null);
  const [targetRole, setTargetRole] = useState<"ADMIN" | "EDITOR" | "VIEWER">("EDITOR");
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);

  // Current User Role
  const currentUserRole = useMemo(() => {
    if (!activeWorkspace) return "OWNER";
    const mem = activeWorkspace.members.find((m) => m.role === "OWNER");
    return mem ? mem.role : "OWNER";
  }, [activeWorkspace]);

  // Load Workspaces Data
  const loadWorkspaceData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${apiBase}/api/workspaces`, {
        headers: { ...authHeader },
      });
      const json = await res.json();

      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setWorkspaces(json.data);
        const current = json.data.find((w: WorkspaceItem) => w.id === activeWorkspaceId) || json.data[0];
        setActiveWorkspaceId(current.id);
        setActiveWorkspace(current);
      } else {
        // Fallback default workspace if zero workspaces returned
        const fallbackWs: WorkspaceItem = {
          id: "demo-workspace-1",
          name: "Demo Workspace",
          slug: "demo-workspace-1",
          ownerId: "user_owner",
          plan: "BUSINESS",
          description: "Primary AI social media workspace",
          members: [
            {
              id: "mem_owner",
              userId: "user_owner",
              email: "owner@studio.ai",
              role: "OWNER",
              joinedAt: new Date().toISOString(),
            },
          ],
          invitations: [],
          createdAt: new Date().toISOString(),
        };
        setWorkspaces([fallbackWs]);
        setActiveWorkspaceId(fallbackWs.id);
        setActiveWorkspace(fallbackWs);
      }
    } catch {
      setErrorMsg("Unable to load workspace settings data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, []);

  // Action: Switch Active Workspace
  const handleSwitchWorkspace = async (targetWsId: string) => {
    setIsSwitchingWs(true);
    setShowWorkspaceDropdown(false);
    setErrorMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${apiBase}/api/workspaces/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ workspaceId: targetWsId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActiveWorkspaceId(targetWsId);
        const target = workspaces.find((w) => w.id === targetWsId);
        if (target) setActiveWorkspace(target);
        setSuccessMsg(`Switched active workspace.`);
        await loadWorkspaceData(true);
      } else {
        throw new Error(json.error || "Failed to switch workspace.");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to switch workspace");
    } finally {
      setIsSwitchingWs(false);
    }
  };

  // Action: Edit Workspace Details
  const handleSaveWorkspaceDetails = async () => {
    if (!activeWorkspace) return;
    setIsSavingWs(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${apiBase}/api/workspaces/${activeWorkspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          name: editWsName.trim(),
          description: editWsDesc.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update workspace details.");
      }

      setSuccessMsg("Workspace details updated successfully!");
      setShowEditWsModal(false);
      await loadWorkspaceData(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update workspace");
    } finally {
      setIsSavingWs(false);
    }
  };

  // Action: Send Member Invitation
  const handleSendInvite = async () => {
    if (!activeWorkspace || !inviteEmail.trim()) return;
    setIsSendingInvite(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${apiBase}/api/workspaces/${activeWorkspace.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to send member invitation.");
      }

      setSuccessMsg(`Invitation sent successfully to ${inviteEmail.trim()}.`);
      setShowInviteModal(false);
      setInviteEmail("");
      await loadWorkspaceData(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Action: Update Member Role
  const handleUpdateRole = async () => {
    if (!activeWorkspace || !activeActionMember) return;
    setIsUpdatingMember(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(
        `${apiBase}/api/workspaces/${activeWorkspace.id}/members/${activeActionMember.member.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ role: targetRole }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update member role.");
      }

      setSuccessMsg(`Role updated to ${targetRole}.`);
      setActiveActionMember(null);
      await loadWorkspaceData(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setIsUpdatingMember(false);
    }
  };

  // Action: Remove Member
  const handleRemoveMember = async () => {
    if (!activeWorkspace || !activeActionMember) return;
    setIsUpdatingMember(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(
        `${apiBase}/api/workspaces/${activeWorkspace.id}/members/${activeActionMember.member.id}`,
        {
          method: "DELETE",
          headers: { ...authHeader },
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to remove member.");
      }

      setSuccessMsg("Member removed from workspace.");
      setActiveActionMember(null);
      await loadWorkspaceData(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setIsUpdatingMember(false);
    }
  };

  // Filtered Members & Invitations for Table
  const membersList = activeWorkspace?.members || [];
  const invitationsList = activeWorkspace?.invitations || [];

  const filteredRows = useMemo(() => {
    const rows: Array<{
      type: "MEMBER" | "INVITATION";
      id: string;
      email: string;
      name?: string;
      role: string;
      status: string;
      dateStr: string;
      raw: any;
    }> = [];

    // Active Members
    if (tableTab === "ALL" || tableTab === "ACTIVE") {
      for (const mem of membersList) {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const mEmail = mem.email.toLowerCase().includes(q);
          const mRole = mem.role.toLowerCase().includes(q);
          if (!mEmail && !mRole) continue;
        }
        rows.push({
          type: "MEMBER",
          id: mem.id,
          email: mem.email,
          name: mem.email.split("@")[0],
          role: mem.role,
          status: "ACTIVE",
          dateStr: new Date(mem.joinedAt).toLocaleDateString(),
          raw: mem,
        });
      }
    }

    // Pending Invitations
    if (tableTab === "ALL" || tableTab === "PENDING") {
      for (const inv of invitationsList) {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const mEmail = inv.email.toLowerCase().includes(q);
          if (!mEmail) continue;
        }
        rows.push({
          type: "INVITATION",
          id: inv.id,
          email: inv.email,
          name: inv.email.split("@")[0],
          role: inv.role,
          status: "INVITED",
          dateStr: `Invited ${new Date(inv.createdAt).toLocaleDateString()}`,
          raw: inv,
        });
      }
    }

    return rows;
  }, [membersList, invitationsList, tableTab, searchQuery]);

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
            Workspace Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#A8A39A] mt-0.5">
            Manage your workspace, team members and permissions.
          </p>
        </div>

        {/* Right Header Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 font-mono text-xs">
          {/* Real Workspace Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
              className="px-3 py-1.5 rounded-xl bg-[#151618] border border-white/[0.08] text-[#F5F4F0] hover:border-[#D4AF37]/40 transition-all flex items-center gap-2"
            >
              <Building2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="font-bold">{activeWorkspace?.name || "Demo Workspace"}</span>
              <ChevronDown className="w-3 h-3 text-[#A8A39A]" />
            </button>

            {showWorkspaceDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-[#151618] border border-white/10 rounded-2xl p-2 shadow-2xl z-40 space-y-1">
                <div className="px-3 py-1 text-[10px] font-mono text-[#A8A39A] uppercase border-b border-white/[0.06] mb-1">
                  Your Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleSwitchWorkspace(ws.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between font-mono transition-colors ${
                      ws.id === activeWorkspaceId
                        ? "bg-[#D4AF37]/15 text-[#D4AF37] font-bold"
                        : "text-[#F5F4F0] hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    {ws.id === activeWorkspaceId && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadWorkspaceData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-[#151618] border border-white/[0.08] text-[#A8A39A] hover:text-[#F5F4F0] transition-colors disabled:opacity-50"
            title="Refresh Workspace Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#D4AF37]" : ""}`} />
          </button>

          {/* Help Link */}
          <Link
            href="/help"
            className="p-2 rounded-xl bg-[#151618] border border-white/[0.08] text-[#A8A39A] hover:text-[#F5F4F0] transition-colors"
            title="Help & Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </Link>

          {/* Account Menu Button */}
          <Link
            href="/settings/profile"
            className="px-3 py-1.5 rounded-xl bg-[#151618] border border-white/[0.08] text-[#F5F4F0] hover:border-[#D4AF37]/40 transition-all flex items-center gap-1.5"
          >
            <UserIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
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

      {/* 2. WORKSPACE OVERVIEW CARD */}
      <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
            <Building2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#F5F4F0]">
                {activeWorkspace?.name || "Demo Workspace"}
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                {activeWorkspace?.plan || "BUSINESS"}
              </span>
            </div>
            <p className="text-xs text-[#A8A39A]">
              {activeWorkspace?.description || "Primary workspace for team content collaboration & social publishing."}
            </p>
            <div className="flex items-center gap-3 text-[10px] font-mono text-[#A8A39A] pt-0.5">
              <span>{membersList.length} Member{membersList.length > 1 ? "s" : ""}</span>
              <span>•</span>
              <span>Your Role: <strong className="text-[#D4AF37]">{currentUserRole}</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setEditWsName(activeWorkspace?.name || "");
            setEditWsDesc(activeWorkspace?.description || "");
            setShowEditWsModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs font-mono font-bold text-[#F5F4F0] hover:bg-white/5 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Edit Details</span>
        </button>
      </div>

      {/* 3. TEAM MEMBERS SECTION */}
      <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 space-y-4">
        {/* Section Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="text-base font-bold text-[#F5F4F0]">Team Members</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] font-mono text-xs font-bold">
              {filteredRows.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#A8A39A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter members..."
                className="bg-[#0B0C0E] border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#F5F4F0] focus:border-[#D4AF37]/50 outline-none w-36 sm:w-44 font-mono"
              />
            </div>

            {/* Table Tabs */}
            <div className="flex items-center gap-1 bg-[#0B0C0E] border border-white/[0.08] p-1 rounded-xl font-mono text-xs">
              {(["ALL", "ACTIVE", "PENDING"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTableTab(tab)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    tableTab === tab
                      ? "bg-[#D4AF37] text-[#0B0C0E]"
                      : "text-[#A8A39A] hover:text-[#F5F4F0]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Invite CTA Button */}
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0B0C0E] font-bold text-xs hover:opacity-95 transition-all flex items-center gap-1.5 shrink-0"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Invite Member</span>
            </button>
          </div>
        </div>

        {/* TEAM MEMBERS TABLE */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto" />
            <p className="text-xs font-mono text-[#A8A39A]">Loading workspace team data...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-12 text-center space-y-3 max-w-sm mx-auto">
            <Users className="w-10 h-10 text-[#A8A39A] mx-auto opacity-40" />
            <h4 className="text-sm font-bold text-[#F5F4F0]">No team members yet</h4>
            <p className="text-xs text-[#A8A39A] font-mono">
              Invite collaborators to start working together in this workspace.
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-mono font-bold hover:opacity-95"
            >
              + Invite Member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.06] text-[#A8A39A] text-[10px] uppercase font-bold">
                  <th className="pb-3 pl-2">USER</th>
                  <th className="pb-3">ROLE</th>
                  <th className="pb-3">STATUS</th>
                  <th className="pb-3">JOINED / INVITED</th>
                  <th className="pb-3 text-right pr-2">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* User */}
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0B0C0E] border border-white/10 flex items-center justify-center font-bold text-[#D4AF37] uppercase">
                          {row.name ? row.name.slice(0, 2) : "US"}
                        </div>
                        <div>
                          <div className="font-bold text-[#F5F4F0]">{row.name}</div>
                          <div className="text-[11px] text-[#A8A39A]">{row.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5">
                      {row.role === "OWNER" ? (
                        <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 inline-flex items-center gap-1">
                          <Crown className="w-3 h-3" /> OWNER
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-white/5 text-[#F5F4F0] border border-white/10">
                          {row.role}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5">
                      {row.status === "ACTIVE" ? (
                        <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          PENDING
                        </span>
                      )}
                    </td>

                    {/* Joined/Invited */}
                    <td className="py-3.5 text-[#A8A39A]">{row.dateStr}</td>

                    {/* Actions */}
                    <td className="py-3.5 text-right pr-2">
                      {row.role !== "OWNER" ? (
                        <div className="flex items-center justify-end gap-2">
                          {row.type === "MEMBER" && (
                            <>
                              <button
                                onClick={() => {
                                  setActiveActionMember({ member: row.raw, action: "CHANGE_ROLE" });
                                  setTargetRole(row.raw.role === "OWNER" ? "ADMIN" : row.raw.role);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#0B0C0E] border border-white/10 text-xs text-[#F5F4F0] hover:bg-white/5"
                              >
                                Change Role
                              </button>
                              <button
                                onClick={() =>
                                  setActiveActionMember({ member: row.raw, action: "REMOVE" })
                                }
                                className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10"
                                title="Remove Member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {row.type === "INVITATION" && (
                            <button
                              onClick={() => {
                                setSuccessMsg(`Resent invitation to ${row.email}`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#0B0C0E] border border-white/10 text-xs text-[#D4AF37] hover:bg-white/5"
                            >
                              Resend
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#A8A39A] italic">Owner</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. EDIT WORKSPACE MODAL */}
      {showEditWsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-[#F5F4F0]">Edit Workspace Details</h3>
              <button onClick={() => setShowEditWsModal(false)} className="text-[#A8A39A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-[#A8A39A] uppercase mb-1">Workspace Name</label>
                <input
                  type="text"
                  value={editWsName}
                  onChange={(e) => setEditWsName(e.target.value)}
                  className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] focus:border-[#D4AF37] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#A8A39A] uppercase mb-1">Description</label>
                <textarea
                  value={editWsDesc}
                  onChange={(e) => setEditWsDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl p-3 text-xs text-[#F5F4F0] focus:border-[#D4AF37] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setShowEditWsModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0B0C0E] text-xs font-semibold text-[#A8A39A]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWorkspaceDetails}
                disabled={isSavingWs || !editWsName.trim()}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold font-mono flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingWs && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. INVITE MEMBER MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-[#F5F4F0]">Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-[#A8A39A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-[#A8A39A] uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@company.com"
                  className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] focus:border-[#D4AF37] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#A8A39A] uppercase mb-1">Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] focus:border-[#D4AF37] outline-none"
                >
                  <option value="ADMIN">Admin (Full workspace administration)</option>
                  <option value="EDITOR">Editor (Create, edit, schedule & publish)</option>
                  <option value="VIEWER">Viewer (Read-only analytics & campaign review)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0B0C0E] text-xs font-semibold text-[#A8A39A]"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvite}
                disabled={isSendingInvite || !inviteEmail.trim() || !inviteEmail.includes("@")}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold font-mono flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSendingInvite && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Invitation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MEMBER CHANGE ROLE / REMOVE MODAL */}
      {activeActionMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-[#F5F4F0]">
                {activeActionMember.action === "CHANGE_ROLE"
                  ? `Change Role for ${activeActionMember.member.email}`
                  : `Remove ${activeActionMember.member.email}?`}
              </h3>
              <button onClick={() => setActiveActionMember(null)} className="text-[#A8A39A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeActionMember.action === "CHANGE_ROLE" ? (
              <div className="space-y-3 text-xs font-mono">
                <label className="block text-[10px] text-[#A8A39A] uppercase mb-1">Select New Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as any)}
                  className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] focus:border-[#D4AF37] outline-none"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
            ) : (
              <p className="text-xs text-[#A8A39A] leading-relaxed font-mono">
                Are you sure you want to remove this member? They will lose access to all workspace assets and campaigns.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setActiveActionMember(null)}
                className="px-4 py-2 rounded-xl bg-[#0B0C0E] text-xs font-semibold text-[#A8A39A]"
              >
                Cancel
              </button>
              {activeActionMember.action === "CHANGE_ROLE" ? (
                <button
                  onClick={handleUpdateRole}
                  disabled={isUpdatingMember}
                  className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold font-mono flex items-center gap-1.5"
                >
                  {isUpdatingMember && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update Role</span>
                </button>
              ) : (
                <button
                  onClick={handleRemoveMember}
                  disabled={isUpdatingMember}
                  className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold font-mono flex items-center gap-1.5"
                >
                  {isUpdatingMember && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Remove Member</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
