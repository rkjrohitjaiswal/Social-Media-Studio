"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  CreditCard,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  RefreshCw,
  X,
  ArrowLeft,
  Calendar,
  Check,
  Award,
} from "lucide-react";
import {
  fetchAdminStats,
  fetchAdminUsers,
  grantUserSubscription,
  revokeUserSubscription,
  AdminStats,
  AdminUserListItem,
} from "@/lib/api-client";

export default function AdminDashboardPage() {
  const router = useRouter();

  // State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Grant Subscription Modal State
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"PRO" | "ADVANCED" | "PREMIUM" | "BUSINESS">("PRO");
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);

  // Revoke Action State
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Admin Stats & User Data
  const loadData = async (page = currentPage, search = debouncedSearch, showRefresher = false) => {
    if (showRefresher) setIsRefreshing(true);
    else setIsLoading(true);
    setToastMessage(null);

    try {
      const [statsRes, usersRes] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(page, 20, search),
      ]);

      if (!statsRes && !usersRes) {
        setIsUnauthorized(true);
        return;
      }

      setIsUnauthorized(false);
      if (statsRes) setStats(statsRes);
      if (usersRes) {
        setUsers(usersRes.users);
        setTotalUsers(usersRes.total);
        setTotalPages(usersRes.totalPages);
      }
    } catch {
      setIsUnauthorized(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  // Action: Grant Subscription
  const handleGrantSubscription = async () => {
    if (!selectedUser) return;
    setIsSubmittingGrant(true);
    setToastMessage(null);

    const res = await grantUserSubscription(
      selectedUser.id,
      selectedPlan,
      selectedDuration,
      adminNotes
    );

    setIsSubmittingGrant(false);

    if (res.success) {
      setToastMessage({
        type: "success",
        text: res.message || `Granted ${selectedPlan} subscription to ${selectedUser.email}.`,
      });
      setSelectedUser(null);
      setAdminNotes("");
      loadData(currentPage, debouncedSearch, true);
    } else {
      setToastMessage({
        type: "error",
        text: res.error || "Failed to grant subscription.",
      });
    }
  };

  // Action: Revoke Subscription
  const handleRevokeSubscription = async (user: AdminUserListItem) => {
    if (!confirm(`Are you sure you want to revoke the admin-granted ${user.currentPlan} plan for ${user.email}?`)) {
      return;
    }

    setRevokingUserId(user.id);
    setToastMessage(null);

    const res = await revokeUserSubscription(user.id);
    setRevokingUserId(null);

    if (res.success) {
      setToastMessage({
        type: "success",
        text: `Revoked subscription for ${user.email}. User plan reset to FREE (10 credits).`,
      });
      loadData(currentPage, debouncedSearch, true);
    } else {
      setToastMessage({
        type: "error",
        text: res.error || "Failed to revoke subscription.",
      });
    }
  };

  if (isUnauthorized) {
    return (
      <div className="min-h-[60vh] text-[#F5F4F0] p-6 flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-[#F5F4F0]">Admin Access Required</h1>
        <p className="text-xs text-[#9E9D98] max-w-md text-center">
          You do not have administrative permissions to view the subscription control dashboard.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] font-bold text-xs font-mono"
        >
          Return to Studio Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* HEADER */}
      <header className="border-b border-white/[0.08] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-[#9E9D98] hover:text-[#D4AF37] text-xs flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <span className="text-[#9E9D98]">•</span>
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20">
              SYSTEM ADMIN
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F4F0] flex items-center gap-2">
            Subscription &amp; User Control <Shield className="w-6 h-6 text-[#D4AF37]" />
          </h1>
          <p className="text-xs sm:text-sm text-[#9E9D98] mt-0.5">
            Manage user accounts, view active subscriptions, and manually grant or revoke plans.
          </p>
        </div>

        <button
          onClick={() => loadData(currentPage, debouncedSearch, true)}
          disabled={isRefreshing}
          className="px-3 py-2 rounded-xl bg-[#151618] border border-white/[0.08] text-[#9E9D98] hover:text-[#F5F4F0] text-xs font-mono flex items-center gap-2 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#D4AF37]" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </header>

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
            toastMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* OVERVIEW METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl space-y-1.5 border-white/5">
          <div className="flex items-center justify-between text-xs text-[#9E9D98]">
            <span>Total Registered Users</span>
            <Users className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#F5F4F0]">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.totalUsers ?? 0}
          </div>
          <div className="text-[10px] text-[#9E9D98]">System authenticated accounts</div>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-1.5 border-white/5">
          <div className="flex items-center justify-between text-xs text-[#9E9D98]">
            <span>Active Paid Users</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#F5F4F0]">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.paidUsers ?? 0}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">PRO / Advanced / Business</div>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-1.5 border-white/5">
          <div className="flex items-center justify-between text-xs text-[#9E9D98]">
            <span>Free Demo Users</span>
            <Zap className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#F5F4F0]">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.freeUsers ?? 0}
          </div>
          <div className="text-[10px] text-[#9E9D98]">10 initial demo credits</div>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-1.5 border-white/5">
          <div className="flex items-center justify-between text-xs text-[#9E9D98]">
            <span>Active Subscriptions</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#F5F4F0]">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.activeSubscriptions ?? 0}
          </div>
          <div className="text-[10px] text-[#9E9D98]">Razorpay &amp; Admin Grants</div>
        </div>
      </div>

      {/* USER MANAGEMENT TABLE */}
      <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#F5F4F0]">User Subscription Directory</h2>
            <p className="text-xs text-[#9E9D98]">Select any user to grant or manage subscription access.</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#9E9D98] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#F5F4F0] focus:border-[#D4AF37] outline-none"
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto border border-white/[0.08] rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B0C0E] border-b border-white/[0.08] text-[#9E9D98] font-mono uppercase text-[10px]">
              <tr>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Current Plan</th>
                <th className="p-3.5">Source</th>
                <th className="p-3.5">Credits Remaining</th>
                <th className="p-3.5">Expiry Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#9E9D98]">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#9E9D98]">
                    No users found matching query.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.name}
                            className="w-8 h-8 rounded-xl object-cover border border-[#D4AF37]/40 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] font-bold flex items-center justify-center text-xs shrink-0 font-mono">
                            {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="font-semibold text-[#F5F4F0] flex items-center gap-1.5 truncate">
                            <span>{u.name}</span>
                            {u.isAdmin && (
                              <span className="text-[9px] bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 px-1.5 py-0.2 rounded font-mono font-bold">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#9E9D98] truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-bold ${
                          u.currentPlan === "FREE"
                            ? "bg-white/10 text-[#9E9D98]"
                            : "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                        }`}
                      >
                        {u.currentPlan}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono text-[11px]">
                      {u.subscriptionSource === "ADMIN_GRANT" ? (
                        <span className="text-[#D4AF37] font-bold flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          <span>Admin Grant</span>
                        </span>
                      ) : u.currentPlan !== "FREE" ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          <span>Razorpay</span>
                        </span>
                      ) : (
                        <span className="text-[#9E9D98]">Free Tier</span>
                      )}
                    </td>

                    <td className="p-3.5 font-mono">
                      <span className="text-[#F5F4F0] font-bold">{u.creditsRemaining}</span>
                      <span className="text-[#9E9D98] text-[10px] ml-1">/ {u.creditsTotal}</span>
                    </td>

                    <td className="p-3.5 font-mono text-[#9E9D98]">
                      {u.currentPeriodEnd
                        ? new Date(u.currentPeriodEnd).toLocaleDateString()
                        : "No Expiration"}
                    </td>

                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setSelectedPlan("PRO");
                          setSelectedDuration(30);
                          setAdminNotes("");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 font-semibold font-mono text-[11px] transition-colors"
                      >
                        Grant Plan
                      </button>

                      {u.subscriptionSource === "ADMIN_GRANT" && (
                        <button
                          onClick={() => handleRevokeSubscription(u)}
                          disabled={revokingUserId === u.id}
                          className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold font-mono text-[11px] transition-colors disabled:opacity-50"
                        >
                          {revokingUserId === u.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Revoke Grant"
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-[#9E9D98] pt-2 font-mono">
            <span>
              Showing page {currentPage} of {totalPages} ({totalUsers} total users)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-[#F5F4F0] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-[#F5F4F0] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* GRANT SUBSCRIPTION MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-[#F5F4F0] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#D4AF37]" />
                <span>Grant Manual Subscription</span>
              </h3>
              <button onClick={() => setSelectedUser(null)} className="text-[#9E9D98] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target User Info */}
            <div className="p-3.5 rounded-2xl bg-[#0B0C0E] border border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] font-bold flex items-center justify-center text-xs shrink-0 font-mono">
                {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="truncate text-xs">
                <div className="font-bold text-[#F5F4F0]">{selectedUser.name}</div>
                <div className="text-[11px] text-[#9E9D98] truncate">{selectedUser.email}</div>
              </div>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Select Plan */}
              <div>
                <label className="block text-[10px] text-[#9E9D98] uppercase mb-1.5 font-bold">
                  Select Subscription Plan Tier
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["PRO", "ADVANCED", "PREMIUM", "BUSINESS"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPlan(p)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedPlan === p
                          ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#F5F4F0]"
                          : "bg-[#0B0C0E] border-white/10 text-[#9E9D98] hover:border-white/20"
                      }`}
                    >
                      <div className="font-bold text-[#D4AF37]">{p}</div>
                      <div className="text-[10px] text-[#9E9D98] mt-0.5">
                        {p === "PRO"
                          ? "50 Workflows / mo"
                          : p === "ADVANCED"
                          ? "150 Workflows / mo"
                          : p === "PREMIUM"
                          ? "400 Workflows / mo"
                          : "1,000 Workflows / mo"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Duration */}
              <div>
                <label className="block text-[10px] text-[#9E9D98] uppercase mb-1.5 font-bold">
                  Subscription Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "7 Days", value: 7 },
                    { label: "30 Days", value: 30 },
                    { label: "90 Days", value: 90 },
                    { label: "1 Year", value: 365 },
                  ].map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setSelectedDuration(d.value)}
                      className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition-all ${
                        selectedDuration === d.value
                          ? "bg-[#D4AF37] text-[#0B0C0E] border-[#D4AF37]"
                          : "bg-[#0B0C0E] border-white/10 text-[#9E9D98] hover:border-white/20"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-[10px] text-[#9E9D98] uppercase mb-1.5 font-bold">
                  Admin Audit Notes (Optional)
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. VIP Creator Partner Grant"
                  className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] focus:border-[#D4AF37] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl bg-[#0B0C0E] text-xs font-semibold text-[#9E9D98]"
              >
                Cancel
              </button>
              <button
                onClick={handleGrantSubscription}
                disabled={isSubmittingGrant}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0C0E] text-xs font-bold font-mono flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingGrant && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Grant Plan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
