"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Check, Save, Palette, Volume2, Target, Globe, FileText } from "lucide-react";
import { getBrandProfile, saveBrandProfile } from "@/lib/api-client";
import { BrandProfileInput } from "@ai-social/shared";

export default function BrandKitPage() {
  const [formData, setFormData] = useState<BrandProfileInput>({
    brandName: "",
    description: "",
    industry: "Luxury Fashion",
    website: "",
    targetAudience: "",
    location: "",
    language: "English",
    timezone: "UTC",
    tone: "Sophisticated, authoritative, elegant",
    personality: "Refined, modern, innovative",
    writingStyle: "Concise editorial prose with active voice",
    preferredVocabulary: "atelier, couture, curation, elevation",
    wordsToAvoid: "cheap, discount, bargain, viral hack",
    preferredCallToActionStyle: "Exclusive invitation to explore",
    emojiPreference: "Minimal, subtle gold/black accents (✨, 🏛️, 🖤)",
    hashtagStyle: "3-5 targeted high-intent niche tags",
    primaryColor: "#0B0C0E",
    secondaryColor: "#F5F4F0",
    accentColor: "#C5A059",
    fontPreference: "Playfair Display & Inter",
    preferredContentTypes: "Carousels, editorial imagery, case studies",
    preferredPlatforms: "Instagram, LinkedIn, Pinterest",
    postingGoals: "Brand equity, high-intent leads, thought leadership",
    contentTopics: "Creative direction, sustainability, digital luxury",
    contentTopicsToAvoid: "Political controversy, unverified gossip",
  });

  const [loading, setLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getBrandProfile().then((profile) => {
      if (profile) {
        setFormData((prev) => ({ ...prev, ...profile }));
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedMessage(false);
    setErrorMessage(null);

    try {
      await saveBrandProfile(formData);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 4000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save Brand Kit");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof BrandProfileInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Brand Kit & Voice Engine</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
            Studio Brand Identity
          </h1>
          <p className="text-xs text-[#9e9d98] mt-1">
            Define your brand voice, audience guidelines, and visual rules. AI content generation automatically incorporates these parameters.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !formData.brandName.trim()}
          className="px-5 py-2.5 rounded-xl bg-[#c5a059] text-black text-xs font-bold hover:bg-[#d4af66] transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {loading ? "Saving..." : "Save Brand Kit"}
        </button>
      </div>

      {savedMessage && (
        <div className="p-4 rounded-2xl bg-[#4e8765]/10 border border-[#4e8765]/30 text-[#4e8765] text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>✓ Brand Kit Saved. AI generation prompt context updated.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 1. BRAND INFORMATION */}
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#f5f4f0] border-b border-white/10 pb-3">
            <Globe className="w-4 h-4 text-[#c5a059]" />
            <span>1. Brand Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#9e9d98] mb-1">Brand Name *</label>
              <input
                type="text"
                value={formData.brandName}
                onChange={(e) => handleChange("brandName", e.target.value)}
                placeholder="e.g. Maison Atelier"
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[#9e9d98] mb-1">Industry</label>
              <input
                type="text"
                value={formData.industry || ""}
                onChange={(e) => handleChange("industry", e.target.value)}
                placeholder="e.g. High Fashion, Tech Enterprise"
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[#9e9d98] mb-1">Brand Description</label>
              <textarea
                rows={2}
                value={formData.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Brief summary of your brand mission and unique positioning..."
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* 2. BRAND VOICE */}
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#f5f4f0] border-b border-white/10 pb-3">
            <Volume2 className="w-4 h-4 text-[#c5a059]" />
            <span>2. Brand Voice & Editorial Tone</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#9e9d98] mb-1">Tone of Voice</label>
              <input
                type="text"
                value={formData.tone || ""}
                onChange={(e) => handleChange("tone", e.target.value)}
                placeholder="e.g. Sophisticated, authoritative, inspiring"
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#9e9d98] mb-1">Preferred Vocabulary</label>
              <input
                type="text"
                value={formData.preferredVocabulary || ""}
                onChange={(e) => handleChange("preferredVocabulary", e.target.value)}
                placeholder="e.g. atelier, curation, craftsmanship"
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#9e9d98] mb-1">Words to Avoid (Strict Filter)</label>
              <input
                type="text"
                value={formData.wordsToAvoid || ""}
                onChange={(e) => handleChange("wordsToAvoid", e.target.value)}
                placeholder="e.g. cheap, discount, viral hack, secret trick"
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#9e9d98] mb-1">Call to Action Style</label>
              <input
                type="text"
                value={formData.preferredCallToActionStyle || ""}
                onChange={(e) => handleChange("preferredCallToActionStyle", e.target.value)}
                placeholder="e.g. Exclusive invitation to explore the collection"
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. AUDIENCE & TARGETING */}
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#f5f4f0] border-b border-white/10 pb-3">
            <Target className="w-4 h-4 text-[#c5a059]" />
            <span>3. Audience & Content Preferences</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#9e9d98] mb-1">Target Audience Profile</label>
              <input
                type="text"
                value={formData.targetAudience || ""}
                onChange={(e) => handleChange("targetAudience", e.target.value)}
                placeholder="e.g. High-net-worth professionals, luxury brand directors"
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#9e9d98] mb-1">Content Topics</label>
              <input
                type="text"
                value={formData.contentTopics || ""}
                onChange={(e) => handleChange("contentTopics", e.target.value)}
                placeholder="e.g. Sustainable luxury, AI creative workflows"
                className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 4. VISUAL IDENTITY */}
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#f5f4f0] border-b border-white/10 pb-3">
            <Palette className="w-4 h-4 text-[#c5a059]" />
            <span>4. Visual Identity Guidelines</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#9e9d98] mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.primaryColor || "#0b0c0e"}
                  onChange={(e) => handleChange("primaryColor", e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={formData.primaryColor || "#0B0C0E"}
                  onChange={(e) => handleChange("primaryColor", e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-[#f5f4f0] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#9e9d98] mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.secondaryColor || "#f5f4f0"}
                  onChange={(e) => handleChange("secondaryColor", e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={formData.secondaryColor || "#F5F4F0"}
                  onChange={(e) => handleChange("secondaryColor", e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-[#f5f4f0] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#9e9d98] mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.accentColor || "#c5a059"}
                  onChange={(e) => handleChange("accentColor", e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={formData.accentColor || "#C5A059"}
                  onChange={(e) => handleChange("accentColor", e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-[#f5f4f0] font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
