"use client";

import React, { useState, useEffect } from "react";
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
  Bell,
  LogOut,
  Search,
  Menu,
  X,
  Building2,
} from "lucide-react";
import { useStudio } from "@/lib/studio-context";
import { createClient } from "@/lib/supabase/client";
import { GlobalSearchModal } from "@/components/studio/GlobalSearchModal";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    notifications,
    markNotificationsRead,
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
  } = useStudio();

  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; email: string } | null>(null);

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

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

  const bottomItems = [
    { name: "Workspace", href: "/settings", icon: Building2 },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Help", href: "/help", icon: HelpCircle },
    { name: "Account", href: "/settings/profile", icon: User },
  ];

  const SidebarContent = () => (
    <div className="h-full flex flex-col justify-between p-4 selection:bg-[#D4AF37]/30 overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 space-y-3">
        {/* LOGO HEADER */}
        <div className="p-2 border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] via-[#C5A059] to-[#8A6D3B] p-[1px] flex items-center justify-center shadow-md shadow-[#D4AF37]/15">
              <div className="w-full h-full bg-[#0B0C0E] rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5 text-[#D4AF37]" />
              </div>
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-[#F5F4F0] block leading-none font-sans">
                AI SOCIAL MEDIA
              </span>
              <span className="text-[#D4AF37] font-semibold text-xs tracking-widest uppercase block mt-0.5 font-sans">
                STUDIO
              </span>
            </div>
          </Link>
          {isMobileMenuOpen && (
            <button
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
            onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#151618] border border-white/[0.08] hover:border-[#D4AF37]/40 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Building2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span className="text-xs font-semibold text-[#F5F4F0] truncate">
                {activeWorkspace?.name || "My Workspace"}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#9E9D98] shrink-0" />
          </button>

          {showWorkspaceDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#151618] border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden py-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspace(ws);
                    setShowWorkspaceDropdown(false);
                    router.refresh();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-white/5 transition-colors ${
                    ws.id === activeWorkspace?.id ? "bg-[#D4AF37]/10 text-[#D4AF37] font-medium" : "text-[#F5F4F0]"
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
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0B0C0E] font-semibold text-xs shadow-md shadow-[#D4AF37]/10 hover:opacity-95 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-[#0B0C0E]" />
          <span>+ Create</span>
        </Link>

        {/* NAVIGATION SECTIONS */}
        <nav className="flex-1 overflow-y-auto space-y-3 pt-1 pr-1 min-h-0">
          {navSections.map((section) => (
            <div key={section.group} className="space-y-0.5">
              <span className="text-[10px] font-mono font-bold text-[#9E9D98]/70 tracking-widest uppercase block px-3 py-1">
                {section.group}
              </span>
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
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30"
                        : "text-[#9E9D98] hover:text-[#F5F4F0] hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? "text-[#D4AF37]" : "text-[#9E9D98] group-hover:text-[#F5F4F0]"
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* BOTTOM NAV ITEMS & USER ACCOUNT */}
      <div className="pt-3 border-t border-white/[0.08] space-y-2">
        <div className="space-y-0.5">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                    : "text-[#9E9D98] hover:text-[#F5F4F0] hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* ACCOUNT ITEM FOOTER */}
        <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] font-bold flex items-center justify-center text-xs shrink-0">
              {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-[#F5F4F0] truncate">
                {userProfile?.name || "Alex"}
              </div>
              <div className="text-[10px] text-[#9E9D98] truncate">{userProfile?.email}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[#9E9D98] hover:text-red-400 transition-colors p-1"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0B0C0E] text-[#F5F4F0] selection:bg-[#D4AF37]/30">
      {/* GLOBAL SEARCH MODAL */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* DESKTOP PERSISTENT SIDEBAR */}
      <aside className="w-64 shrink-0 border-r border-white/[0.08] bg-[#151618] flex flex-col justify-between hidden md:flex z-30 h-screen sticky top-0">
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
            <SidebarContent />
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
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden text-[#9E9D98] hover:text-[#F5F4F0] p-1.5 rounded-lg border border-white/[0.08]"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* SEARCH BUTTON */}
            <button
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
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-2 rounded-xl bg-[#0B0C0E] border border-white/[0.08] hover:border-[#D4AF37]/40 text-[#F5F4F0] transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-[#9E9D98]" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D4AF37] text-[#0B0C0E] font-bold text-[9px] rounded-full flex items-center justify-center">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-[#151618] border border-white/[0.08] rounded-2xl shadow-2xl z-50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                    <span className="text-xs font-bold text-[#F5F4F0]">Notifications</span>
                    {unreadNotifsCount > 0 && (
                      <button
                        onClick={markNotificationsRead}
                        className="text-[10px] text-[#D4AF37] hover:underline font-mono"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl text-xs space-y-1 ${
                            n.read
                              ? "bg-white/5 opacity-60"
                              : "bg-[#D4AF37]/10 border border-[#D4AF37]/30"
                          }`}
                        >
                          <div className="font-medium text-[#F5F4F0]">{n.title}</div>
                          <div className="text-[10px] text-[#9E9D98] font-mono">{n.time}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-[#9E9D98] text-center py-4">
                        No notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* USER PROFILE DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-xl bg-[#0B0C0E] border border-white/[0.08] hover:border-[#D4AF37]/40 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] font-bold flex items-center justify-center text-xs shrink-0">
                  {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : "A"}
                </div>
                <span className="text-xs font-medium text-[#F5F4F0] hidden sm:inline-block">
                  {userProfile?.name || "Alex"}
                </span>
                <ChevronDown className="w-3 h-3 text-[#9E9D98]" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-[#151618] border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                  <div className="px-3 py-2 border-b border-white/[0.08]">
                    <div className="text-xs font-bold text-[#F5F4F0]">{userProfile?.name}</div>
                    <div className="text-[10px] text-[#9E9D98] truncate">{userProfile?.email}</div>
                  </div>
                  <Link
                    href="/settings/profile"
                    onClick={() => setShowUserDropdown(false)}
                    className="block px-3 py-2 text-xs text-[#9E9D98] hover:text-[#F5F4F0] hover:bg-white/5"
                  >
                    Account Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setShowUserDropdown(false)}
                    className="block px-3 py-2 text-xs text-[#9E9D98] hover:text-[#F5F4F0] hover:bg-white/5"
                  >
                    Workspace Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 border-t border-white/[0.08]"
                  >
                    Sign Out
                  </button>
                </div>
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

