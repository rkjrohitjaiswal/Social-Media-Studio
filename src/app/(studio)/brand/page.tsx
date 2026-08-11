"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Palette,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Layers,
  Globe,
  Mail,
  Phone,
  Sliders,
  Eye,
  RefreshCw
} from "lucide-react";
import { InstagramIcon as Instagram } from "@/components/ui/InstagramIcon";
import {
  BRAND_TONE_OPTIONS,
  CONTENT_STYLE_OPTIONS,
  brandSchema,
  validateLogoFile,
} from "@/lib/validations/brand";

export default function BrandStudioPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [name, setName] = useState("Maison Lumière");
  const [description, setDescription] = useState("Haute couture & luxury apparel atelier");
  const [primaryColor, setPrimaryColor] = useState("#0B0C0E");
  const [secondaryColor, setSecondaryColor] = useState("#F5F4F0");
  const [accentColor, setAccentColor] = useState("#C5A059");

  const [toneVoice, setToneVoice] = useState("Editorial");
  const [customTone, setCustomTone] = useState("");
  const [contentStyle, setContentStyle] = useState("Luxury editorial");
  const [customContentStyle, setCustomContentStyle] = useState("");

  const [targetAudience, setTargetAudience] = useState("Discerning luxury consumers, art collectors");
  const [defaultCta, setDefaultCta] = useState("Discover the exclusive capsule online now.");
  const [website, setWebsite] = useState("https://maisonlumiere.com");
  const [instagramUsername, setInstagramUsername] = useState("maisonlumiere_official");
  const [contactEmail, setContactEmail] = useState("director@maisonlumiere.com");
  const [contactPhone, setContactPhone] = useState("+33 1 42 68 55 00");

  // Logo State
  const [logoSignedUrl, setLogoSignedUrl] = useState<string | null>(
    "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=300&auto=format&fit=crop"
  );
  const [logoStoragePath, setLogoStoragePath] = useState<string | null>(null);

  // UI Feedback States
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Load existing brand data from GET /api/brand
  useEffect(() => {
    async function loadBrand() {
      try {
        const res = await fetch("/api/brand");
        const data = await res.json();
        if (data.success && data.brand) {
          const b = data.brand;
          setName(b.name || "Maison Lumière");
          setDescription(b.description || "");
          setPrimaryColor(b.primaryColor || "#0B0C0E");
          setSecondaryColor(b.secondaryColor || "#F5F4F0");
          setAccentColor(b.accentColor || "#C5A059");
          setToneVoice(b.toneVoice || "Editorial");
          setContentStyle(b.contentStyle || "Luxury editorial");
          setTargetAudience(b.targetAudience || "");
          setDefaultCta(b.defaultCta || "");
          setWebsite(b.website || "");
          setInstagramUsername(b.instagramUsername || "");
          setContactEmail(b.contactEmail || "");
          setContactPhone(b.contactPhone || "");
          if (b.logoSignedUrl) {
            setLogoSignedUrl(b.logoSignedUrl);
          }
          if (b.logoStoragePath) {
            setLogoStoragePath(b.logoStoragePath);
          }
        }
      } catch {
        // Fallback to default state
      }
    }

    loadBrand();
  }, []);

  // Save Brand Profile Changes (PUT /api/brand)
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setStatusMessage(null);

    const payload = {
      name,
      description,
      primaryColor,
      secondaryColor,
      accentColor,
      toneVoice,
      customTone,
      contentStyle,
      customContentStyle,
      targetAudience,
      defaultCta,
      website,
      instagramUsername,
      contactEmail,
      contactPhone,
    };

    // Zod validation
    const validation = brandSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setValidationErrors(fieldErrors);
      setStatusMessage({ type: "error", text: "Please correct the highlighted validation errors." });
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!result.success) {
        setStatusMessage({ type: "error", text: result.error || "Failed to update brand profile." });
      } else {
        setStatusMessage({ type: "success", text: "Brand Identity profile updated successfully." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "An unexpected error occurred while saving." });
    } finally {
      setIsSaving(false);
    }
  };

  // Upload Logo File (POST /api/brand/logo)
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME and file size
    const fileCheck = validateLogoFile({
      type: file.type,
      size: file.size,
      name: file.name,
    });

    if (!fileCheck.valid) {
      setStatusMessage({ type: "error", text: fileCheck.error || "Invalid file" });
      return;
    }

    setIsUploadingLogo(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const res = await fetch("/api/brand/logo", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (!result.success) {
        setStatusMessage({ type: "error", text: result.error || "Logo upload failed." });
      } else {
        setLogoSignedUrl(result.logoSignedUrl);
        setLogoStoragePath(result.logoStoragePath);
        setStatusMessage({ type: "success", text: "Logo uploaded to Supabase Storage successfully." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Logo upload encountered an error." });
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Remove Logo (DELETE /api/brand/logo)
  const handleRemoveLogo = async () => {
    setIsUploadingLogo(true);
    try {
      const res = await fetch("/api/brand/logo", { method: "DELETE" });
      const result = await res.json();

      if (result.success) {
        setLogoSignedUrl(null);
        setLogoStoragePath(null);
        setStatusMessage({ type: "success", text: "Brand logo removed." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to remove logo." });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#c5a059] uppercase tracking-widest font-semibold mb-1">
            <Palette className="w-3.5 h-3.5" />
            <span>Identity Studio</span>
          </div>
          <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
            Brand Identity Settings
          </h1>
          <p className="text-xs text-[#9e9d98] mt-1">
            Define your visual tokens, logo, voice, and guidelines to anchor all AI generation prompts.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveBrand}
          disabled={isSaving}
          className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-xs shadow-xl hover:brightness-110 transition-all flex items-center gap-2 self-start md:self-auto disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>Saving Brand...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-black" />
              <span>Save Brand Profile</span>
            </>
          )}
        </button>
      </div>

      {/* FEEDBACK STATUS BANNER */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
            statusMessage.type === "success"
              ? "bg-[#4e8765]/20 border-[#4e8765]/50 text-[#f5f4f0]"
              : "bg-[#a84b4b]/20 border-[#a84b4b]/50 text-[#f5f4f0]"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-[#4e8765] flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#a84b4b] flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT FORM COLUMN (8 COLS) */}
        <div className="lg:col-span-8 space-y-8">
          {/* SECTION 1: BRAND IDENTITY */}
          <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
            <h2 className="text-sm font-semibold text-[#f5f4f0] uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Layers className="w-4 h-4 text-[#c5a059]" />
              Brand Identity
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Brand Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full bg-[#0b0c0e] border rounded-xl px-4 py-2.5 text-sm text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none transition-colors ${
                    validationErrors.name ? "border-[#a84b4b]" : "border-white/10"
                  }`}
                />
                {validationErrors.name && (
                  <p className="text-[11px] text-[#a84b4b] mt-1">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Brand Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description of your fashion house or brand studio..."
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl p-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: VISUAL IDENTITY & LOGO */}
          <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6 border-[#c5a059]/30">
            <h2 className="text-sm font-semibold text-[#f5f4f0] uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Palette className="w-4 h-4 text-[#c5a059]" />
              Visual Identity & Supabase Storage Logo
            </h2>

            {/* LOGO UPLOADER BOX */}
            <div>
              <label className="block text-xs font-medium text-[#9e9d98] mb-2">
                Brand Logo (JPEG, PNG, WebP • Max 5MB)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-[#0b0c0e] border border-white/10">
                {/* LOGO THUMBNAIL */}
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-[#c5a059]/50 bg-[#14161a] flex items-center justify-center flex-shrink-0 gold-glow">
                  {logoSignedUrl ? (
                    <Image src={logoSignedUrl} alt="Brand Logo" fill className="object-contain p-2" />
                  ) : (
                    <span className="text-xs font-serif-luxury font-bold text-[#c5a059]">
                      {name ? name.charAt(0) : "B"}
                    </span>
                  )}
                  {isUploadingLogo && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#c5a059]" />
                    </div>
                  )}
                </div>

                {/* ACTION CONTROLS */}
                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <div className="text-xs text-[#f5f4f0]">
                    <span className="font-bold text-[#c5a059]">Private Supabase Storage Bucket</span>
                    <p className="text-[11px] text-[#9e9d98] mt-0.5">
                      Stored at <code className="font-mono text-[10px] text-[#c5a059]">{logoStoragePath || "{userId}/brand/logo/{file}"}</code>
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="px-4 py-2 rounded-xl bg-[#1c1f26] border border-[#c5a059]/40 text-xs font-semibold text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{logoSignedUrl ? "Replace Logo" : "Upload Logo"}</span>
                    </button>

                    {logoSignedUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={isUploadingLogo}
                        className="px-4 py-2 rounded-xl bg-[#0b0c0e] border border-[#a84b4b]/40 text-xs font-semibold text-[#a84b4b] hover:bg-[#a84b4b]/10 transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* COLOR SWATCHES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Primary Canvas</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border border-white/20 p-1"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-[#f5f4f0]"
                  />
                </div>
                {validationErrors.primaryColor && (
                  <p className="text-[10px] text-[#a84b4b] mt-1">{validationErrors.primaryColor}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Secondary Text</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border border-white/20 p-1"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-[#f5f4f0]"
                  />
                </div>
                {validationErrors.secondaryColor && (
                  <p className="text-[10px] text-[#a84b4b] mt-1">{validationErrors.secondaryColor}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Gold Accent</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border border-white/20 p-1"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 bg-[#0b0c0e] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-[#f5f4f0]"
                  />
                </div>
                {validationErrors.accentColor && (
                  <p className="text-[10px] text-[#a84b4b] mt-1">{validationErrors.accentColor}</p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: VOICE & TONE */}
          <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
            <h2 className="text-sm font-semibold text-[#f5f4f0] uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Sliders className="w-4 h-4 text-[#c5a059]" />
              Voice & Tone Strategy
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* TONE SELECTOR */}
              <div>
                <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Brand Tone</label>
                <select
                  value={toneVoice}
                  onChange={(e) => setToneVoice(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                >
                  {BRAND_TONE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-[#14161a] text-[#f5f4f0]">
                      {opt}
                    </option>
                  ))}
                </select>
                {toneVoice === "Custom" && (
                  <input
                    type="text"
                    placeholder="Enter custom tone..."
                    value={customTone}
                    onChange={(e) => setCustomTone(e.target.value)}
                    className="w-full mt-2 bg-[#0b0c0e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#f5f4f0]"
                  />
                )}
              </div>

              {/* CONTENT STYLE SELECTOR */}
              <div>
                <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Preferred Content Style</label>
                <select
                  value={contentStyle}
                  onChange={(e) => setContentStyle(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                >
                  {CONTENT_STYLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-[#14161a] text-[#f5f4f0]">
                      {opt}
                    </option>
                  ))}
                </select>
                {contentStyle === "Custom" && (
                  <input
                    type="text"
                    placeholder="Enter custom content style..."
                    value={customContentStyle}
                    onChange={(e) => setCustomContentStyle(e.target.value)}
                    className="w-full mt-2 bg-[#0b0c0e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#f5f4f0]"
                  />
                )}
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Target Audience</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. Discerning luxury consumers, art collectors, high fashion enthusiasts"
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Default Call to Action (CTA)</label>
                <input
                  type="text"
                  value={defaultCta}
                  onChange={(e) => setDefaultCta(e.target.value)}
                  placeholder="e.g. Discover the exclusive collection online now."
                  className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none font-medium"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: SOCIAL & CONTACT */}
          <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
            <h2 className="text-sm font-semibold text-[#f5f4f0] uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Globe className="w-4 h-4 text-[#c5a059]" />
              Social & Contact Channels
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Official Website</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-[#9e9d98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://brand.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                  />
                </div>
                {validationErrors.website && (
                  <p className="text-[10px] text-[#a84b4b] mt-1">{validationErrors.website}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Instagram Username</label>
                <div className="relative">
                  <Instagram className="w-4 h-4 text-[#9e9d98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="brand_official"
                    value={instagramUsername}
                    onChange={(e) => setInstagramUsername(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Contact Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#9e9d98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="contact@brand.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                  />
                </div>
                {validationErrors.contactEmail && (
                  <p className="text-[10px] text-[#a84b4b] mt-1">{validationErrors.contactEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Contact Phone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#9e9d98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="+33 1 42 68 55 00"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE ELEGANT BRAND PREVIEW CARD (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-6">
            <div className="glass-card p-6 rounded-3xl space-y-6 border-[#c5a059]/40 gold-glow">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#c5a059] flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Live Brand Preview
                </span>
                <span className="text-[10px] text-[#9e9d98] font-mono">Dynamic Swatch</span>
              </div>

              {/* LIVE BRAND PREVIEW CARD CONTAINER */}
              <div
                className="p-6 rounded-2xl border border-white/10 space-y-5 transition-colors duration-300"
                style={{ backgroundColor: primaryColor }}
              >
                {/* PREVIEW LOGO & NAME */}
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/10 border border-white/20 flex-shrink-0 flex items-center justify-center">
                    {logoSignedUrl ? (
                      <Image src={logoSignedUrl} alt="Logo" fill className="object-contain p-1" />
                    ) : (
                      <span className="font-serif-luxury font-bold text-lg" style={{ color: accentColor }}>
                        {name ? name.charAt(0) : "B"}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-serif-luxury text-xl font-bold leading-tight" style={{ color: secondaryColor }}>
                      {name || "Brand Name"}
                    </h3>
                    <span className="text-[10px] uppercase tracking-widest font-mono block" style={{ color: accentColor }}>
                      {toneVoice} Tone
                    </span>
                  </div>
                </div>

                {/* SAMPLE EDITORIAL HEADLINE */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <p className="font-serif-luxury text-lg font-bold leading-snug" style={{ color: secondaryColor }}>
                    &ldquo;Autumn / Winter 2026 Haute Couture Capsule&rdquo;
                  </p>
                  <p className="text-xs opacity-80 leading-relaxed" style={{ color: secondaryColor }}>
                    {description || "Architectural silhouettes meeting Parisian leathercraft."}
                  </p>
                </div>

                {/* SAMPLE CTA BUTTON */}
                <div className="pt-2">
                  <div
                    className="w-full py-3 rounded-xl font-bold text-xs text-center shadow-lg transition-transform hover:scale-[1.02]"
                    style={{
                      backgroundColor: accentColor,
                      color: primaryColor,
                    }}
                  >
                    {defaultCta || "Discover Collection"}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#9e9d98] text-center italic">
                Updates in real-time as colors, tone, or CTA change.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
