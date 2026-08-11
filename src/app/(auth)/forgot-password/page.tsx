"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowLeft, Mail, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setAuthError(null);

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setValidationError(validation.error.issues[0]?.message || "Invalid email");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        setAuthError(error.message || "Could not process password recovery request.");
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
      setIsLoading(false);
    } catch {
      setAuthError("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#f5f4f0] grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
      {/* LEFT EDITORIAL HERO SIDEBAR (SPLIT-SCREEN) */}
      <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-12 bg-[#14161a] border-r border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0e] via-transparent to-black/60 z-10" />
        <Image
          src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop"
          alt="Luxury Jewelry Aesthetic"
          fill
          className="object-cover opacity-40 mix-blend-luminosity"
        />

        {/* LOGO BRAND HEADER */}
        <div className="relative z-20">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c5a059] to-[#8a6e34] p-[1px] flex items-center justify-center shadow-xl">
              <div className="w-full h-full bg-[#0b0c0e] rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#c5a059]" />
              </div>
            </div>
            <div>
              <span className="font-serif-luxury text-2xl font-bold tracking-tight text-[#f5f4f0] block leading-none">
                STUDIO<span className="text-[#c5a059] font-sans text-xs ml-1 font-semibold tracking-widest">AI</span>
              </span>
              <span className="text-[10px] text-[#9e9d98] tracking-widest uppercase block mt-1">
                Haute Social Engine
              </span>
            </div>
          </Link>
        </div>

        {/* EDITORIAL STATEMENT */}
        <div className="relative z-20 space-y-4 max-w-md">
          <div className="px-3 py-1 rounded-full bg-[#c5a059]/20 border border-[#c5a059]/40 text-[#c5a059] text-[11px] font-semibold uppercase tracking-widest inline-block">
            Credential Recovery
          </div>
          <h2 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0] leading-tight">
            Secure Account Recovery Protocol.
          </h2>
          <p className="text-xs text-[#9e9d98] leading-relaxed">
            Enter your accredited email to receive an encrypted reset link directly to your inbox.
          </p>
        </div>

        <div className="relative z-20 text-[11px] text-[#6b6a65] font-mono">
          © 2026 Haute Atelier Systems Inc.
        </div>
      </div>

      {/* RIGHT AUTHENTICATION FORM CONTAINER */}
      <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-12 md:p-20 relative">
        <div className="w-full max-w-md mx-auto space-y-8 my-auto">
          {/* MOBILE LOGO HEADER */}
          <div className="lg:hidden text-center space-y-2 mb-6">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <Sparkles className="w-5 h-5 text-[#c5a059]" />
              <span className="font-serif-luxury text-2xl font-bold text-[#f5f4f0]">
                STUDIO<span className="text-[#c5a059] font-sans text-xs ml-1">AI</span>
              </span>
            </Link>
          </div>

          <div className="space-y-2">
            <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">Reset Passcode</h1>
            <p className="text-xs text-[#9e9d98]">We will dispatch password recovery instructions to your email.</p>
          </div>

          {/* AUTH ERROR ALERT */}
          {authError && (
            <div className="p-4 rounded-2xl bg-[#a84b4b]/20 border border-[#a84b4b]/50 text-xs text-[#f5f4f0] flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[#a84b4b] flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* SUCCESS ALERT */}
          {isSubmitted ? (
            <div className="p-6 rounded-2xl bg-[#4e8765]/20 border border-[#4e8765]/50 text-xs text-[#f5f4f0] space-y-3">
              <div className="flex items-center gap-2 text-[#4e8765] font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Recovery Instructions Dispatched</span>
              </div>
              <p className="text-[#9e9d98] leading-relaxed">
                If an accredited account exists for <strong className="text-[#f5f4f0]">{email}</strong>, a password reset link has been dispatched.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#c5a059] hover:underline pt-2"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Client Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Work Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#9e9d98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="director@brand.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full bg-[#14161a] border rounded-xl pl-10 pr-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none transition-colors ${
                      validationError ? "border-[#a84b4b]" : "border-white/10"
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {validationError && (
                  <p className="text-[11px] text-[#a84b4b] mt-1">{validationError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl bg-[#c5a059] text-black font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Processing Reset...</span>
                  </>
                ) : (
                  <span>Send Recovery Email</span>
                )}
              </button>
            </form>
          )}

          <div className="text-center text-xs text-[#9e9d98] pt-6 border-t border-white/10">
            <Link href="/login" className="text-[#c5a059] hover:underline font-semibold flex items-center justify-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Client Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
