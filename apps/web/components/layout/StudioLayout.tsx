"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  LayoutDashboard,
  FolderKanban,
  CheckCircle2,
  CalendarDays,
  BarChart3,
  Palette,
  Settings,
  ChevronDown,
  Bell,
  LogOut,
  PlusCircle,
  Search,
  Share2,
  User as UserIcon,
  Zap,
  Check,
} from "lucide-react";

import { InstagramIcon as Instagram } from "@/components/ui/InstagramIcon";
import { useStudio } from "@/lib/studio-context";
import { createClient } from "@/lib/supabase/client";
import { getBillingStatus } from "@/lib/api-client";
import { BillingStatusResponse } from "@ai-social/shared";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { brands, activeBrand, setActiveBrand, notifications, markNotificationsRead } = useStudio();
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; email: string } | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingStatusResponse | null>(null);

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    async function loadUserSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserProfile({
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Creative Director",
          email: user.email || "director@maisonlumiere.com",
        });
      } else {
        setUserProfile({
          name: "Claire Laurent",
          email: "director@maisonlumiere.com",
        });
      }
    }

    loadUserSession();

    getBillingStatus()
      .then((data) => setBillingInfo(data))
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Create Content", href: "/create", icon: PlusCircle, isPrimary: true },
    { name: "Campaigns", href: "/campaigns", icon: FolderKanban },
    { name: "Content Review", href: "/content-review", icon: CheckCircle2, badge: "Multi" },
    { name: "Repurpose Studio", href: "/create/repurpose", icon: Share2 },
    { name: "Editorial Calendar", href: "/calendar", icon: CalendarDays },
    { name: "Social Accounts", href: "/settings/social-accounts", icon: UserIcon },
    { name: "Published Feed", href: "/published", icon: Instagram },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "AI Advisor", href: "/analytics/advisor", icon: Sparkles },
    { name: "Brand Identity", href: "/brand", icon: Palette },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-[#0b0c0e] text-[#f5f4f0]">
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-72 flex-shrink-0 border-r border-white/10 bg-[#14161a]/80 backdrop-blur-xl flex flex-col justify-between hidden md:flex z-30">
        <div>
          {/* LOGO HEADER */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#c5a059] to-[#8a6e34] p-[1px] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#0b0c0e] rounded-[7px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#c5a059]" />
                </div>
              </div>
              <div>
                <span className="font-serif-luxury text-xl font-bold tracking-tight text-[#f5f4f0] block leading-none">
                  STUDIO<span className="text-[#c5a059] font-sans text-xs ml-1 font-semibold tracking-widest">AI</span>
                </span>
                <span className="text-[10px] text-[#9e9d98] tracking-widest uppercase block mt-1">
                  Haute Social Engine
                </span>
              </div>
            </Link>
          </div>

          {/* BRAND SELECTOR DROPDOWN */}
          <div className="px-4 py-4 border-b border-white/5 relative">
            <label className="text-[10px] uppercase tracking-widest text-[#9e9d98] font-semibold block px-2 mb-1.5">
              Active Brand Persona
            </label>
            <button
              onClick={() => setShowBrandDropdown(!showBrandDropdown)}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#1c1f26] border border-white/10 hover:border-[#c5a059]/40 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div
                  className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0"
                  style={{ backgroundColor: activeBrand.accentColor }}
                />
                <span className="text-sm font-medium text-[#f5f4f0] truncate">{activeBrand.name}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-[#9e9d98]" />
            </button>

            {showBrandDropdown && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-[#1c1f26] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => {
                      setActiveBrand(brand);
                      setShowBrandDropdown(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs text-left hover:bg-white/5 transition-colors ${
                      brand.id === activeBrand.id ? "bg-[#c5a059]/10 text-[#c5a059] font-medium" : "text-[#f5f4f0]"
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-white/20"
                      style={{ backgroundColor: brand.accentColor }}
                    />
                    <div className="truncate">
                      <div className="font-medium">{brand.name}</div>
                      <div className="text-[10px] text-[#9e9d98] truncate">{brand.toneVoice}</div>
                    </div>
                  </button>
                ))}
                <Link
                  href="/brand"
                  onClick={() => setShowBrandDropdown(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[#c5a059] border-t border-white/5 hover:bg-[#c5a059]/10 font-medium"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Configure Brand Identities
                </Link>
              </div>
            )}
          </div>

          {/* MAIN NAV NAVIGATION LINKS */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              const Icon = item.icon;

              if (item.isPrimary) {
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center justify-between px-3.5 py-3 rounded-lg bg-gradient-to-r from-[#c5a059] to-[#997734] text-black font-semibold text-sm shadow-lg hover:brightness-110 transition-all my-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-black group-hover:rotate-45 transition-transform" />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-black/20 px-2 py-0.5 rounded text-black">
                      1 : N
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? "bg-[#1c1f26] text-[#c5a059] border border-[#c5a059]/30"
                      : "text-[#9e9d98] hover:text-[#f5f4f0] hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#c5a059]" : "text-[#9e9d98] group-hover:text-[#f5f4f0]"}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* FOOTER USER METRICS & PROFILE MENU */}
        <div className="p-4 border-t border-white/10 bg-[#0b0c0e]/50">
          <div className="p-3 rounded-xl bg-[#1c1f26] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#c5a059] to-[#f5f4f0] text-black font-bold flex items-center justify-center text-xs flex-shrink-0">
                {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : "CL"}
              </div>
              <div className="truncate">
                <div className="text-xs font-medium text-[#f5f4f0] truncate">{userProfile?.name || "Creative Director"}</div>
                <div className="text-[10px] text-[#9e9d98] truncate">{userProfile?.email || "director@maisonlumiere.com"}</div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="text-[#9e9d98] hover:text-[#a84b4b] transition-colors p-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER */}
        <header className="h-16 border-b border-white/10 bg-[#14161a]/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block w-72">
              <Search className="w-4 h-4 text-[#9e9d98] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search campaigns, assets, prompts..."
                className="w-full bg-[#1c1f26] border border-white/10 text-xs text-[#f5f4f0] placeholder-[#6b6a65] rounded-full pl-9 pr-4 py-2 focus:outline-none focus:border-[#c5a059]/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* LIVE USAGE / SUBSCRIPTION BADGE */}
            <Link href="/settings" className="no-underline">
              {billingInfo?.plan && billingInfo.plan !== "FREE" && billingInfo.status === "ACTIVE" ? (
                <span className="px-3 py-1 rounded-full bg-[#4e8765]/20 border border-[#4e8765]/40 text-[#4e8765] text-xs font-bold flex items-center gap-1.5 hover:bg-[#4e8765]/30 transition-colors">
                  <Check className="w-3.5 h-3.5" /> {billingInfo.plan} ✓
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-[#c5a059]/15 border border-[#c5a059]/40 text-[#c5a059] text-xs font-bold flex items-center gap-1.5 hover:bg-[#c5a059]/25 transition-colors">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{billingInfo?.workflowsRemaining ?? 3} Free Uses</span>
                </span>
              )}
            </Link>

            <Link
              href="/"
              className="text-xs text-[#9e9d98] hover:text-[#c5a059] font-medium transition-colors hidden md:block"
            >
              Marketing Website ↗
            </Link>

            {/* NOTIFICATION BELL */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown);
                  if (unreadNotifsCount > 0) markNotificationsRead();
                }}
                className="relative p-2 rounded-full hover:bg-white/5 text-[#9e9d98] hover:text-[#f5f4f0] transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#c5a059] animate-pulse" />
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-3 w-80 bg-[#1c1f26] border border-white/10 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#f5f4f0]">Activity Stream</span>
                    <span className="text-[10px] text-[#c5a059]">Real-time SSE Queue</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-3 text-xs hover:bg-white/5 transition-colors">
                        <div className="font-medium text-[#f5f4f0]">{n.title}</div>
                        <div className="text-[10px] text-[#9e9d98] mt-1">{n.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* QUICK ACTIONS */}
            <Link
              href="/create"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-[#1c1f26] border border-[#c5a059]/40 text-[#c5a059] text-xs font-semibold hover:bg-[#c5a059] hover:text-black transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Studio Campaign</span>
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT WRAPPER */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
