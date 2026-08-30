"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  Home,
  FolderKanban,
  PlusCircle,
  Share2,
  Calendar,
  Clock,
  BarChart3,
  Link as LinkIcon,
  Settings,
  HelpCircle,
  User,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Bell,
  LogOut,
  Search,
  Menu,
  X,
  Building2,
  Zap,
} from "lucide-react";
import { useStudio } from "@/lib/studio-context";
import { createClient } from "@/lib/supabase/client";
import { GlobalSearchModal } from "@/components/studio/GlobalSearchModal";
import { fetchUserUsage, UserUsageData } from "@/lib/api-client";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoadingNotifications,
    notifError,
    markNotificationsRead,
    markOneNotificationRead,
    refreshNotifications,
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
  } = useStudio();

  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showSidebarProfileMenu, setShowSidebarProfileMenu] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; email: string } | null>(null);
  const [userUsage, setUserUsage] = useState<UserUsageData | null>(null);

  const sidebarProfileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isSubscribed = true;
    async function loadUsageData() {
      const data = await fetchUserUsage();
      if (isSubscribed && data) {
        setUserUsage(data);
      }
    }
    loadUsageData();
    return () => {
      isSubscribed = false;
    };
  }, [pathname]);

  // Format a createdAt ISO string into a human-readable relative time
  function formatRelativeTime(isoDate: string): string {
    try {
      const diffMs = Date.now() - new Date(isoDate).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDay = Math.floor(diffHr / 24);
      if (diffDay === 1) return "Yesterday";
      return `${diffDay}d ago`;
    } catch {
      return "";
    }
  }

  const badgeLabel = unreadCount > 99 ? "99+" : unreadCount.toString();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar_collapsed");
      if (saved === "true") {
        setIsCollapsed(true);
      }
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    async function loadUserSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserProfile({
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Alex",
          email: user.email || "alex@studio.io",
        });
      } else {
        setUserProfile({
          name: "Alex",
          email: "alex@studio.io",
        });
      }
    }

    loadUserSession();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sidebarProfileRef.current &&
        !sidebarProfileRef.current.contains(event.target as Node)
      ) {
        setShowSidebarProfileMenu(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowSidebarProfileMenu(false);
        setShowWorkspaceDropdown(false);
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navSections = [
    {
      group: "WORKSPACE",
      items: [
        { name: "Home", href: "/dashboard", icon: Home },
        { name: "Projects", href: "/content-studio", icon: FolderKanban },
      ],
    },
    {
      group: "CREATE",
      items: [
        { name: "Create", href: "/create", icon: PlusCircle },
        { name: "Repurpose", href: "/repurpose", icon: Share2 },
      ],
    },
    {
      group: "PUBLISH",
      items: [
        { name: "Calendar", href: "/calendar/ai", icon: Calendar },
        { name: "Publish Queue", href: "/published", icon: Clock },
      ],
    },
    {
      group: "INSIGHTS",
      items: [{ name: "Analytics", href: "/analytics", icon: BarChart3 }],
    },
    {
      group: "CONNECT",
      items: [{ name: "Connections", href: "/settings/social-accounts", icon: LinkIcon }],
    },
  ];

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const collapsed = isMobile ? false : isCollapsed;

    return (
      <div className="h-full flex flex-col justify-between p-4 selection:bg-[#D4AF37]/30 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          {/* LOGO HEADER */}
          <div
            className={`p-2 border-b border-white/[0.08] flex items-center shrink-0 ${
              collapsed ? "flex-col gap-2 justify-center" : "justify-between"
            }`}
          >
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group"
              title={collapsed ? "AI Social Media Studio" : undefined}
            >
              {collapsed ? (
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#D4AF37]/40 p-0.5 bg-[#0B0C0E] shadow-md shadow-[#D4AF37]/15 shrink-0 group-hover:scale-105 transition-all">
                  <img
                    src="/logo-mark.jpg"
                    alt="AI Social Media Studio"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="h-9 flex items-center shrink-0 group-hover:scale-105 transition-all">
                  <img
                    src="/logo.jpg"
                    alt="AI Social Media Studio"
                    className="h-9 w-auto object-contain rounded-lg border border-white/[0.08]"
                  />
                </div>
              )}
            </Link>

            {/* DESKTOP COLLAPSE TOGGLE BUTTON */}
            {!isMobile && (
              <button
                type="button"
                onClick={toggleSidebar}
                className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-[#9E9D98] hover:text-[#D4AF37] hover:bg-white/5 border border-white/[0.08] transition-colors"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            )}

            {/* MOBILE CLOSE BUTTON */}
            {isMobile && isMobileMenuOpen && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden text-[#9E9D98] hover:text-[#F5F4F0] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* WORKSPACE SELECTOR DROPDOWN */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
              title={collapsed ? activeWorkspace?.name || "My Workspace" : undefined}
              className={`w-full flex items-center rounded-xl bg-[#151618] border border-white/[0.08] hover:border-[#D4AF37]/40 transition-colors text-left ${
                collapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Building2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                {!collapsed && (
                  <span className="text-xs font-semibold text-[#F5F4F0] truncate">
                    {activeWorkspace?.name || "My Workspace"}
                  </span>
                )}
              </div>
              {!collapsed && <ChevronDown className="w-3.5 h-3.5 text-[#9E9D98] shrink-0" />}
            </button>

            {showWorkspaceDropdown && (
              <div
                className={`absolute top-full mt-2 bg-[#151618] border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden py-1 ${
                  collapsed ? "left-0 w-56" : "left-0 right-0"
                }`}
              >
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setShowWorkspaceDropdown(false);
                      router.refresh();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-white/5 transition-colors ${
                      ws.id === activeWorkspace?.id
                        ? "bg-[#D4AF37]/10 text-[#D4AF37] font-medium"
                        : "text-[#F5F4F0]"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#9E9D98] shrink-0" />
                    <span className="truncate">{ws.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PRIMARY CTA: + CREATE */}
          <Link
            href="/create"
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? "Create Content" : undefined}
            className={`w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0B0C0E] font-semibold text-xs shadow-md shadow-[#D4AF37]/10 hover:opacity-95 transition-all flex items-center justify-center gap-2 shrink-0 ${
              collapsed ? "px-0" : "px-4"
            }`}
          >
            <PlusCircle className="w-4 h-4 text-[#0B0C0E] shrink-0" />
            {!collapsed && <span>+ Create</span>}
          </Link>

          {/* NAVIGATION SECTIONS */}
          <nav className="flex-1 overflow-y-auto space-y-3 pt-1 pr-1 min-h-0">
            {navSections.map((section) => (
              <div key={section.group} className="space-y-0.5">
                {!collapsed && (
                  <span className="text-[10px] font-mono font-bold text-[#9E9D98]/70 tracking-widest uppercase block px-3 py-1">
                    {section.group}
                  </span>
                )}
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname?.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center rounded-xl text-xs font-medium transition-all group ${
                        collapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2"
                      } ${
                        isActive
                          ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30"
                          : "text-[#9E9D98] hover:text-[#F5F4F0] hover:bg-white/5"
                      }`}
                    >
                      <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}>
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? "text-[#D4AF37]" : "text-[#9E9D98] group-hover:text-[#F5F4F0]"
                          }`}
                        />
                        {!collapsed && <span>{item.name}</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* CLICKABLE USER PROFILE SECTION AT BOTTOM */}
        <div className="pt-3 border-t border-white/[0.08] relative shrink-0" ref={sidebarProfileRef}>
          {/* PROFILE POPOVER MENU */}
          {showSidebarProfileMenu && (
            <div
              className={`absolute bottom-full mb-2 bg-[#151618] border border-white/[0.08] rounded-2xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-bottom-2 duration-150 ${
                collapsed ? "left-0 w-64" : "left-0 right-0"
              }`}
            >
              {/* HEADER WITH AVATAR / NAME / EMAIL */}
              <div className="px-3 py-2.5 border-b border-white/[0.08] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] font-bold flex items-center justify-center text-xs shrink-0">
                  {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : "A"}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-[#F5F4F0] truncate">
                    {userProfile?.name || "Alex"}
                  </div>
                  <div className="text-[10px] text-[#9E9D98] truncate">
                    {userProfile?.email || "alex@studio.io"}
                  </div>
                </div>
              </div>

              {/* MENU ITEMS */}
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => {
                    setShowSidebarProfileMenu(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all ${
                    pathname === "/settings"
                      ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                      : "text-[#9E9D98] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#D4AF37]" />
                  <span>Workspace</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => {
                    setShowSidebarProfileMenu(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all ${
                    pathname === "/settings"
                      ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                      : "text-[#9E9D98] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  }`}
                >
                  <Settings className="w-4 h-4 text-[#D4AF37]" />
                  <span>Settings</span>
                </Link>
                <Link
                  href="/help"
                  onClick={() => {
                    setShowSidebarProfileMenu(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all ${
                    pathname === "/help"
                      ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                      : "text-[#9E9D98] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-[#D4AF37]" />
                  <span>Help</span>
                </Link>
                <Link
                  href="/settings/profile"
                  onClick={() => {
                    setShowSidebarProfileMenu(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all ${
                    pathname === "/settings/profile"
                      ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                      : "text-[#9E9D98] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  }`}
                >
                  <User className="w-4 h-4 text-[#D4AF37]" />
                  <span>Account</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setShowSidebarProfileMenu(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border-t border-white/[0.08] mt-1"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* CLICKABLE PROFILE TRIGGER BUTTON */}
          <button
            type="button"
            onClick={() => setShowSidebarProfileMenu(!showSidebarProfileMenu)}
            title={collapsed ? userProfile?.name || "Account Profile" : undefined}
            className={`w-full flex items-center rounded-xl bg-[#151618] border border-white/[0.08] hover:border-[#D4AF37]/40 hover:bg-white/5 transition-all text-left group ${
              collapsed ? "justify-center p-1.5" : "justify-between p-2"
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] font-bold flex items-center justify-center text-xs shrink-0 group-hover:border-[#D4AF37]">
                {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : "A"}
              </div>
              {!collapsed && (
                <div className="truncate">
                  <div className="text-xs font-semibold text-[#F5F4F0] truncate group-hover:text-[#D4AF37] transition-colors">
                    {userProfile?.name || "Alex"}
                  </div>
                  <div className="text-[10px] text-[#9E9D98] truncate">
                    {userProfile?.email || "alex@studio.io"}
                  </div>
                </div>
              )}
            </div>
            {!collapsed && (
              <ChevronUp
                className={`w-4 h-4 text-[#9E9D98] shrink-0 transition-transform ${
                  showSidebarProfileMenu ? "rotate-180 text-[#D4AF37]" : "group-hover:text-[#F5F4F0]"
                }`}
              />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#0B0C0E] text-[#F5F4F0] selection:bg-[#D4AF37]/30">
      {/* GLOBAL SEARCH MODAL */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* DESKTOP PERSISTENT SIDEBAR */}
      <aside
        className={`${
          isCollapsed ? "w-20" : "w-64"
        } shrink-0 border-r border-white/[0.08] bg-[#151618] flex flex-col justify-between hidden md:flex z-30 h-screen sticky top-0 transition-[width] duration-300 ease-in-out`}
      >
        <SidebarContent />
      </aside>

      {/* MOBILE DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-72 bg-[#151618] border-r border-white/[0.08] h-full z-10">
            <SidebarContent isMobile />
          </div>
        </div>
      )}

      {/* MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER */}
        <header className="h-16 border-b border-white/[0.08] bg-[#151618]/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* MOBILE HAMBURGER TOGGLE */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden text-[#9E9D98] hover:text-[#F5F4F0] p-1.5 rounded-lg border border-white/[0.08]"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* SEARCH BUTTON */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-48 sm:w-64 bg-[#0B0C0E] border border-white/[0.08] text-xs text-[#9E9D98] rounded-xl pl-9 pr-3 py-2 flex items-center justify-between hover:border-[#D4AF37]/40 transition-colors text-left relative"
            >
              <Search className="w-4 h-4 text-[#9E9D98] absolute left-3 top-1/2 -translate-y-1/2" />
              <span>Search Studio...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-white/10 rounded font-mono text-[#9E9D98]">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* NOTIFICATION BELL */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-2 rounded-xl bg-[#0B0C0E] border border-white/[0.08] hover:border-[#D4AF37]/40 text-[#F5F4F0] transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-[#9E9D98]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#D4AF37] text-[#0B0C0E] font-bold text-[9px] rounded-full flex items-center justify-center px-0.5">
                    {badgeLabel}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-[#151618] border border-white/[0.08] rounded-2xl shadow-2xl z-50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                    <span className="text-xs font-bold text-[#F5F4F0]">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => { markNotificationsRead(); }}
                        className="text-[10px] text-[#D4AF37] hover:underline font-mono"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {isLoadingNotifications ? (
                      <div className="text-xs text-[#9E9D98] text-center py-6 animate-pulse">
                        Loading notifications...
                      </div>
                    ) : notifError ? (
                      <div className="text-center py-6 space-y-2">
                        <div className="text-xs text-red-400">Couldn\'t load notifications</div>
                        <button
                          type="button"
                          onClick={() => refreshNotifications()}
                          className="text-[10px] text-[#D4AF37] hover:underline"
                        >
                          Retry
                        </button>
                      </div>
                    ) : notifications.length > 0 ? (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            if (!n.read) markOneNotificationRead(n.id);
                            if (n.actionUrl) router.push(n.actionUrl);
                            setShowNotifDropdown(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl text-xs space-y-1 transition-colors ${
                            n.read
                              ? "bg-white/5 opacity-70 hover:opacity-100"
                              : "bg-[#D4AF37]/10 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/15"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {!n.read && (
                              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0" />
                            )}
                            <span className="font-medium text-[#F5F4F0] leading-snug">{n.title}</span>
                          </div>
                          {n.message && (
                            <div className="text-[10px] text-[#9E9D98] line-clamp-2 pl-3.5">{n.message}</div>
                          )}
                          <div className="text-[10px] text-[#9E9D98] font-mono pl-3.5">
                            {formatRelativeTime(n.createdAt)}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-xs text-[#9E9D98] text-center py-6 space-y-1">
                        <div>You\'re all caught up.</div>
                        <div className="text-[10px] opacity-60">No notifications yet</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CREDIT BALANCE BADGE */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/[0.08] text-xs font-medium text-[#F5F4F0] hover:border-[#D4AF37]/40 transition-colors shrink-0"
              title={
                userUsage?.isUnlimited || userUsage?.remainingCredits === "Unlimited" || userUsage?.monthlyLimit === "Unlimited"
                  ? "Unlimited Application Credits"
                  : userUsage
                  ? `${userUsage.remainingCredits} / ${userUsage.monthlyLimit} Credits Available`
                  : "Usage Credits"
              }
            >
              <Zap className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37] shrink-0" />
              {userUsage?.isUnlimited || userUsage?.remainingCredits === "Unlimited" || userUsage?.monthlyLimit === "Unlimited" ? (
                <span className="font-semibold text-[#D4AF37]">
                  <span className="hidden sm:inline">∞ Unlimited</span>
                  <span className="sm:hidden">∞</span>
                </span>
              ) : userUsage ? (
                <span className="font-semibold">
                  <span>{userUsage.remainingCredits}</span>
                  <span className="hidden sm:inline text-[#9E9D98] ml-1">Credits</span>
                </span>
              ) : (
                <span className="text-[#9E9D98] text-[11px]">...</span>
              )}
            </div>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}


