"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#f5f4f0] flex flex-col justify-between">
      {/* PUBLIC NAVBAR */}
      <header className="h-20 border-b border-white/10 px-8 flex items-center justify-between sticky top-0 bg-[#0b0c0e]/80 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#c5a059] to-[#8a6e34] p-[1px] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#0b0c0e] rounded-[7px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#c5a059]" />
            </div>
          </div>
          <div>
            <span className="font-serif-luxury text-xl font-bold tracking-tight text-[#f5f4f0] block leading-none">
              STUDIO<span className="text-[#c5a059] font-sans text-xs ml-1 font-semibold tracking-widest">AI</span>
            </span>
            <span className="text-[10px] text-[#9e9d98] tracking-widest uppercase block mt-0.5">
              AI Social Engine
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#9e9d98]">
          <Link href="/" className="hover:text-[#f5f4f0] transition-colors">
            Platform Overview
          </Link>
          <Link href="/pricing" className="hover:text-[#f5f4f0] transition-colors">
            Pricing
          </Link>
          <Link href="/about" className="hover:text-[#f5f4f0] transition-colors">
            Manifesto
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs text-[#9e9d98] hover:text-[#f5f4f0] font-semibold transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-xs shadow-xl hover:brightness-110 transition-all flex items-center gap-2"
          >
            <span>Launch Studio</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </Link>
        </div>
      </header>

      {/* PAGE BODY */}
      <main className="flex-1">{children}</main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-12 px-8 bg-[#08090b] text-xs text-[#9e9d98]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-[#c5a059]" />
            <span className="font-serif-luxury text-base text-[#f5f4f0] font-bold">
              AI Social Media Studio
            </span>
            <span className="text-[10px] text-[#6b6a65]">© 2026 Haute Atelier Systems</span>
          </div>
          <div className="flex items-center gap-6 text-[11px]">
            <Link href="/about" className="hover:text-[#f5f4f0]">Manifesto</Link>
            <Link href="/pricing" className="hover:text-[#f5f4f0]">Pricing</Link>
            <Link href="/login" className="hover:text-[#f5f4f0]">Client Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
