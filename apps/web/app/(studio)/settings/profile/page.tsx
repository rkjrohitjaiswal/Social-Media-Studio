"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User as UserIcon,
  ShieldCheck,
  Key,
  Bell,
  Globe,
  Lock,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Building2,
  HelpCircle,
  RefreshCw,
  Sliders,
  Check,
  Moon,
  Laptop,
  Mail,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { getAuthHeader, uploadProfileAvatar, deleteProfileAvatar } from "@/lib/api-client";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
  workspaceCount: number;
}

interface UserPreferences {
  theme: string;
  timezone: string;
  language: string;
  notifications: {
    publishing: boolean;
    approvals: boolean;
    teamActivity: boolean;
    system: boolean;
  };
}

export default function ProfileAccountPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Loading & Data State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: "dark",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    language: "en-US",
    notifications: {
      publishing: true,
      approvals: true,
      teamActivity: true,
      system: true,
    },
  });

  // Feedback Toast Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("File size exceeds 5MB limit");
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await uploadProfileAvatar(base64, file.type);
        if (res.success && res.avatarUrl) {
          setEditAvatarUrl(res.avatarUrl);
          setSuccessMsg("Profile picture uploaded!");
          await loadProfileData(true);
        } else {
          setErrorMsg(res.error || "Failed to upload profile picture");
        }
        setIsUploadingAvatar(false);
      };
      reader.onerror = () => {
        setErrorMsg("Failed to read file");
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setErrorMsg("Upload error");
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    setErrorMsg(null);
    const res = await deleteProfileAvatar();
    if (res.success) {
      setEditAvatarUrl("");
      setSuccessMsg("Profile picture removed!");
      await loadProfileData(true);
    } else {
      setErrorMsg(res.error || "Failed to remove avatar");
    }
    setIsUploadingAvatar(false);
  };

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Load Profile & Preferences
  const loadProfileData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const [profRes, prefRes] = await Promise.all([
        fetch(`${apiBase}/api/settings/profile`, { headers: { ...authHeader } }),
        fetch(`${apiBase}/api/settings/preferences`, { headers: { ...authHeader } }),
      ]);

      const profJson = await profRes.json();
      const prefJson = await prefRes.json();

      if (profJson.success && profJson.data) {
        setProfile(profJson.data);
      } else {
        setProfile({
          id: "demo-user-id",
          email: "demo@studio.ai",
          fullName: "Creator Admin",
          role: "OWNER",
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
          createdAt: new Date().toISOString(),
          workspaceCount: 1,
        });
      }

      if (prefJson.success && prefJson.data) {
        setPreferences(prefJson.data);
      }
    } catch {
      setErrorMsg("Unable to load profile settings.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  // Action: Save Edit Profile
  const handleSaveProfile = async () => {
    if (!editFullName.trim()) return;
    setIsSavingProfile(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${apiBase}/api/settings/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          fullName: editFullName.trim(),
          avatarUrl: editAvatarUrl.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update profile.");
      }

      setSuccessMsg("Profile updated successfully!");
      setShowEditModal(false);
      await loadProfileData(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Action: Save Password Change
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match or fields are incomplete.");
      return;
    }
    setIsSavingPassword(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${apiBase}/api/settings/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update password.");
      }

      setSuccessMsg("Password changed successfully.");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Action: Toggle Notification Setting
  const handleToggleNotification = async (key: keyof UserPreferences["notifications"]) => {
    const updatedNotifs = {
      ...preferences.notifications,
      [key]: !preferences.notifications[key],
    };

    setPreferences((prev) => ({ ...prev, notifications: updatedNotifs }));

    try {
      const authHeader = await getAuthHeader();
      await fetch(`${apiBase}/api/settings/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ notifications: updatedNotifs }),
      });
    } catch {
      // Revert state on error
      setPreferences((prev) => ({
        ...prev,
        notifications: preferences.notifications,
      }));
    }
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
            Profile &amp; Account
          </h1>
          <p className="text-xs sm:text-sm text-[#A8A39A] mt-0.5">
            Manage your personal information, preferences and account security.
          </p>
        </div>

        {/* Right Header Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-[#151618] border border-white/[0.08] text-[#F5F4F0] flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="font-bold">Demo Workspace</span>
          </div>

          <button
            onClick={() => loadProfileData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-[#151618] border border-white/[0.08] text-[#A8A39A] hover:text-[#F5F4F0] transition-colors disabled:opacity-50"
            title="Refresh Profile Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#D4AF37]" : ""}`} />
          </button>

          <Link
            href="/help"
            className="p-2 rounded-xl bg-[#151618] border border-white/[0.08] text-[#A8A39A] hover:text-[#F5F4F0] transition-colors"
            title="Help & Documentation"
          >
            <HelpCircle className="w-4 h-4" />
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

      {/* 2. PROFILE CARD */}
      <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        {isLoading ? (
          <div className="py-6 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
            <span className="text-xs font-mono text-[#A8A39A]">Loading profile details...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 sm:gap-6">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#D4AF37]/40 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center font-bold text-lg text-[#D4AF37]">
                  {profile?.fullName ? profile.fullName.slice(0, 2).toUpperCase() : "US"}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-[#F5F4F0]">
                    {profile?.fullName || "Creator Admin"}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                    {profile?.role || "OWNER"}
                  </span>
                </div>

                <p className="text-xs text-[#A8A39A] font-mono flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{profile?.email || "user@studio.ai"}</span>
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-[#A8A39A] pt-0.5">
                  <span>{profile?.workspaceCount || 1} Workspace</span>
                  <span>•</span>
                  <span>Joined {new Date(profile?.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setEditFullName(profile?.fullName || "");
                setEditAvatarUrl(profile?.avatarUrl || "");
                setShowEditModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs font-mono font-bold text-[#F5F4F0] hover:bg-white/5 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Edit Profile</span>
            </button>
          </>
        )}
      </div>

      {/* 3. ACCOUNT SECURITY SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Password Security Card */}
        <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="text-base font-bold text-[#F5F4F0]">Password &amp; Security</h3>
            </div>
            <p className="text-xs text-[#A8A39A] leading-relaxed">
              Update your account password to ensure maximum workspace protection.
            </p>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs font-mono text-[#A8A39A]">Password last updated 30 days ago</span>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-3 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs font-mono font-bold text-[#F5F4F0] hover:bg-white/5 transition-all"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Active Session Status Card */}
        <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="text-base font-bold text-[#F5F4F0]">Active Session</h3>
            </div>
            <p className="text-xs text-[#A8A39A] leading-relaxed">
              Your current authenticated session is protected via HTTPS PKCE token validation.
            </p>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Current Session Active</span>
            </div>
            <span className="text-[#A8A39A]">Web Browser</span>
          </div>
        </div>
      </div>

      {/* 4. PREFERENCES & NOTIFICATIONS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System Preferences */}
        <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Sliders className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-base font-bold text-[#F5F4F0]">Preferences</h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between py-1">
              <span className="text-[#A8A39A]">Theme Mode</span>
              <span className="px-2.5 py-1 rounded bg-[#0B0C0E] border border-white/10 text-[#F5F4F0]">
                Dark Studio (Default)
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
              <span className="text-[#A8A39A]">Active Timezone</span>
              <span className="px-2.5 py-1 rounded bg-[#0B0C0E] border border-white/10 text-[#F5F4F0]">
                {preferences.timezone}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
              <span className="text-[#A8A39A]">System Language</span>
              <span className="px-2.5 py-1 rounded bg-[#0B0C0E] border border-white/10 text-[#F5F4F0]">
                English (US)
              </span>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Bell className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-base font-bold text-[#F5F4F0]">Notification Channels</h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            {[
              { key: "publishing", label: "Publishing Alerts", desc: "Post success or failure alerts" },
              { key: "approvals", label: "Approval Notifications", desc: "Client approval status updates" },
              { key: "teamActivity", label: "Team Activity", desc: "Member invites and role changes" },
              { key: "system", label: "System Updates", desc: "API and infrastructure status" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-1 border-b border-white/[0.04] last:border-0">
                <div>
                  <div className="text-[#F5F4F0] font-bold">{item.label}</div>
                  <div className="text-[10px] text-[#A8A39A]">{item.desc}</div>
                </div>

                <button
                  onClick={() => handleToggleNotification(item.key as any)}
                  className={`w-10 h-6 rounded-full transition-colors p-1 relative ${
                    preferences.notifications[item.key as keyof UserPreferences["notifications"]]
                      ? "bg-[#D4AF37]"
                      : "bg-white/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-[#0B0C0E] transition-transform ${
                      preferences.notifications[item.key as keyof UserPreferences["notifications"]]
                        ? "translate-x-4"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. DANGER ZONE / ACCOUNT CONTROL */}
      <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-[#F5F4F0]">Account Controls &amp; Data Security</h3>
        </div>
        <p className="text-xs text-[#A8A39A] leading-relaxed max-w-4xl">
          Your account data and workspace ownership remain fully encrypted. To transfer workspace ownership or manage organization data retention policy, visit Workspace Settings.
        </p>
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-[#F5F4F0]">Edit Personal Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="text-[#A8A39A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-[#A8A39A] uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] focus:border-[#D4AF37] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#A8A39A] uppercase mb-1">Profile Picture</label>
                <div className="flex items-center gap-3">
                  <label className="px-3 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs text-[#D4AF37] hover:border-[#D4AF37] cursor-pointer transition-colors flex items-center gap-1.5 font-sans font-medium">
                    {isUploadingAvatar && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Upload Image (JPG, PNG, WEBP)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileUpload}
                      disabled={isUploadingAvatar}
                      className="hidden"
                    />
                  </label>

                  {editAvatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:bg-red-500/20 transition-colors font-sans"
                    >
                      Remove Picture
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#A8A39A] uppercase mb-1">Avatar Image URL (Optional Direct Link)</label>
                <input
                  type="text"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] focus:border-[#D4AF37] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0B0C0E] text-xs font-semibold text-[#A8A39A]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile || !editFullName.trim()}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold font-mono flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-[#F5F4F0]">Change Account Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-[#A8A39A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-[#A8A39A] uppercase mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] focus:border-[#D4AF37] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#A8A39A] uppercase mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] focus:border-[#D4AF37] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#A8A39A] uppercase mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] focus:border-[#D4AF37] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0B0C0E] text-xs font-semibold text-[#A8A39A]"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isSavingPassword || !currentPassword || !newPassword}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold font-mono flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Update Password</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
