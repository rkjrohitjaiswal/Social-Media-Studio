"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight, ShieldCheck, Layers, Star } from "lucide-react";

export default function MarketingLandingPage() {
  return (
    <div className="space-y-24 pb-20 overflow-hidden">
      {/* HERO SECTION */}
      <section className="relative pt-20 px-6 max-w-7xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-semibold uppercase tracking-widest gold-glow">
          <Sparkles className="w-4 h-4 text-[#c5a059]" />
          <span>Haute Couture AI Content Platform</span>
        </div>

        <h1 className="font-serif-luxury text-5xl md:text-7xl font-bold tracking-tight text-[#f5f4f0] max-w-5xl mx-auto leading-[1.1]">
          AI-Powered Art Direction for Modern Luxury Brands
        </h1>

        <p className="text-sm md:text-base text-[#9e9d98] max-w-2xl mx-auto font-light leading-relaxed">
          Clone the visual DNA of 1 anchor reference image across 100 raw product inputs. Complete with tailored Instagram captions, hashtags, CTAs, and automated AI quality scoring.
        </p>

        {/* CORE FORMULA BADGE */}
        <div className="p-4 rounded-2xl bg-[#14161a] border border-[#c5a059]/30 max-w-xl mx-auto text-xs font-mono text-[#c5a059] flex items-center justify-center gap-3">
          <span>1 REFERENCE IMAGE</span>
          <span>+</span>
          <span>N PRODUCT INPUTS</span>
          <span>=</span>
          <span className="font-bold text-[#f5f4f0]">N GENERATED POSTS</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/create"
            className="px-8 py-4 rounded-full bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-sm shadow-2xl hover:brightness-110 transition-all flex items-center gap-2 group"
          >
            <Sparkles className="w-5 h-5 text-black group-hover:rotate-45 transition-transform" />
            <span>Create Campaign Now</span>
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-4 rounded-full bg-[#1c1f26] border border-white/10 text-xs font-semibold text-[#f5f4f0] hover:border-[#c5a059]/40 transition-colors"
          >
            Explore Atelier Pricing
          </Link>
        </div>
      </section>

      {/* VISUAL SHOWCASE DEMO GRID */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="glass-card p-8 md:p-12 rounded-3xl border-[#c5a059]/30 gold-glow space-y-10">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs uppercase tracking-widest text-[#c5a059] font-semibold">
              The 1 : N Visual Engine
            </span>
            <h2 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
              From Anchor Aesthetic to Campaign Collection
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* ANCHOR REFERENCE (LEFT) */}
            <div className="lg:col-span-4 space-y-3">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border-2 border-[#c5a059] gold-glow bg-[#0b0c0e]">
                <Image
                  src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop"
                  alt="Anchor Reference"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 left-3 bg-black/90 px-3 py-1 rounded-full text-[10px] font-extrabold text-[#c5a059] border border-[#c5a059]/50 flex items-center gap-1.5 shadow-lg">
                  <Star className="w-3.5 h-3.5 fill-[#c5a059]" />
                  <span>STYLE ANCHOR REFERENCE</span>
                </div>
              </div>
              <p className="text-xs text-center text-[#9e9d98] italic">
                Uploaded once. Reused for all campaign collateral.
              </p>
            </div>

            <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
              <ArrowRight className="w-8 h-8 text-[#c5a059] animate-pulse" />
            </div>

            {/* GENERATED OUTPUTS GRID (RIGHT) */}
            <div className="lg:col-span-7 grid grid-cols-2 gap-4">
              {[
                {
                  img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop",
                  title: "Leathercraft Capsule",
                  score: "96.5%",
                },
                {
                  img: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=800&auto=format&fit=crop",
                  title: "High Perfumery",
                  score: "94.0%",
                },
                {
                  img: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop",
                  title: "Atelier Eyewear",
                  score: "92.8%",
                },
                {
                  img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop",
                  title: "Rose Gold Horology",
                  score: "95.2%",
                },
              ].map((item, idx) => (
                <div key={idx} className="relative aspect-[4/5] rounded-xl overflow-hidden border border-white/10 bg-[#0b0c0e] group">
                  <Image src={item.img} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 p-3 flex flex-col justify-end">
                    <span className="text-[10px] text-[#c5a059] font-mono font-bold">
                      {item.score} Quality Score
                    </span>
                    <span className="text-xs font-semibold text-[#f5f4f0] font-serif-luxury">
                      {item.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE HIGHLIGHTS SECTION */}
      <section className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-widest text-[#c5a059] font-semibold">
            Enterprise Architecture
          </span>
          <h2 className="font-serif-luxury text-3xl md:text-5xl font-bold text-[#f5f4f0]">
            Complete Product Feature Suite
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-8 rounded-3xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center text-[#c5a059]">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0]">
              Bulk 1 : N Processing
            </h3>
            <p className="text-xs text-[#9e9d98] leading-relaxed">
              Upload up to 100 raw product photos in a single batch. Redis and BullMQ job queues process each image asynchronously.
            </p>
          </div>

          <div className="glass-card p-8 rounded-3xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center text-[#c5a059]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0]">
              AI Quality Auditing
            </h3>
            <p className="text-xs text-[#9e9d98] leading-relaxed">
              GPT-4o Vision evaluates lighting fidelity, style consistency, and brand alignment (0-100 score) before director review.
            </p>
          </div>

          <div className="glass-card p-8 rounded-3xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center text-[#c5a059]">
              <Sparkles className="w-6 h-6 text-[#c5a059]" />
            </div>
            <h3 className="font-serif-luxury text-xl font-bold text-[#f5f4f0]">
              Instagram Graph API
            </h3>
            <p className="text-xs text-[#9e9d98] leading-relaxed">
              Schedule approved posts directly to Meta Instagram Business Accounts with automated container publishing.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
