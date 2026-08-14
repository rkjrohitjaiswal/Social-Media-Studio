"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="space-y-16 py-16 px-6 max-w-4xl mx-auto">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-semibold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Editorial Manifesto</span>
        </div>
        <h1 className="font-serif-luxury text-4xl md:text-6xl font-bold text-[#f5f4f0] leading-tight">
          Human Creative Direction, Amplified by AI Synthesis.
        </h1>
      </div>

      <div className="glass-card p-8 md:p-12 rounded-3xl space-y-6 text-xs md:text-sm text-[#9e9d98] leading-relaxed border-[#c5a059]/30">
        <p className="text-[#f5f4f0] font-serif-luxury text-xl md:text-2xl leading-snug">
          &ldquo;Luxury is not about mass production—it is about relentless consistency of vision.&rdquo;
        </p>

        <p>
          Traditional social media tools treat content creation as generic administrative scheduling. They offer bland templates, neon buttons, and noisy dashboards.
        </p>

        <p>
          <strong className="text-[#f5f4f0]">AI Social Media Studio</strong> was created for creative directors, fashion houses, and luxury brands who refuse to compromise visual integrity. By establishing a single anchor reference image, our platform ensures every product in your catalog shares the exact lighting, framing, shadow play, and aesthetic DNA of your campaign brief.
        </p>

        <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-[#c5a059] font-mono">
            <span>● 1 Reference Image</span>
            <span>● 100% Brand Integrity</span>
            <span>● Zero Auto-Publish Without Approval</span>
          </div>
          <Link
            href="/create"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2"
          >
            <span>Experience the Studio</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </Link>
        </div>
      </div>
    </div>
  );
}
