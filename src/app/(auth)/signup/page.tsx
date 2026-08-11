"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Lock, Mail, User as UserIcon, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validations/auth";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setAuthError(null);

    // Validate with Zod
    const validation = signupSchema.safeParse({ name, email, password, confirmPassword });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setValidationErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        setAuthError(error.message || "Failed to register new workspace client.");
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);

      // If user session is created immediately, redirect to dashboard
      if (data.session) {
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1500);
      }
    } catch {
      setAuthError("An unexpected error occurred during signup.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#f5f4f0] grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
      {/* LEFT EDITORIAL HERO SIDEBAR (SPLIT-SCREEN) */}
      <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-12 bg-[#14161a] border-r border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0e] via-transparent to-black/60 z-10" />
        <Image
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop"
          alt="Luxury Fashion Atelier"
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
            Couture Membership
          </div>
          <h2 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0] leading-tight">
            Create Your Dedicated Studio Workspace.
          </h2>
          <p className="text-xs text-[#9e9d98] leading-relaxed">
            Join discerning fashion houses, creative directors, and luxury labels producing automated social collateral.
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
            <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">Request Atelier Access</h1>
            <p className="text-xs text-[#9e9d98]">Complete form below to register your studio identity.</p>
          </div>

          {/* AUTH ERROR ALERT */}
          {authError && (
            <div className="p-4 rounded-2xl bg-[#a84b4b]/20 border border-[#a84b4b]/50 text-xs text-[#f5f4f0] flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[#a84b4b] flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* SUCCESS ALERT */}
          {isSuccess && (
            <div className="p-4 rounded-2xl bg-[#4e8765]/20 border border-[#4e8765]/50 text-xs text-[#f5f4f0] flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#4e8765] flex-shrink-0" />
              <div>
                <div className="font-bold text-[#4e8765]">Studio Membership Registered</div>
                <div className="text-[11px] text-[#9e9d98]">Redirecting to your executive dashboard...</div>
              </div>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSignup} className="space-y-4">
            {/* FULL NAME */}
            <div>
              <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#9e9d98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Claire Laurent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full bg-[#14161a] border rounded-xl pl-10 pr-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none transition-colors ${
                    validationErrors.name ? "border-[#a84b4b]" : "border-white/10"
                  }`}
                  disabled={isLoading}
                />
              </div>
              {validationErrors.name && (
                <p className="text-[11px] text-[#a84b4b] mt-1">{validationErrors.name}</p>
              )}
            </div>

            {/* EMAIL */}
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
                    validationErrors.email ? "border-[#a84b4b]" : "border-white/10"
                  }`}
                  disabled={isLoading}
                />
              </div>
              {validationErrors.email && (
                <p className="text-[11px] text-[#a84b4b] mt-1">{validationErrors.email}</p>
              )}
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9e9d98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-[#14161a] border rounded-xl pl-10 pr-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none transition-colors ${
                    validationErrors.password ? "border-[#a84b4b]" : "border-white/10"
                  }`}
                  disabled={isLoading}
                />
              </div>
              {validationErrors.password && (
                <p className="text-[11px] text-[#a84b4b] mt-1">{validationErrors.password}</p>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="block text-xs font-medium text-[#9e9d98] mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9e9d98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full bg-[#14161a] border rounded-xl pl-10 pr-4 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none transition-colors ${
                    validationErrors.confirmPassword ? "border-[#a84b4b]" : "border-white/10"
                  }`}
                  disabled={isLoading}
                />
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-[11px] text-[#a84b4b] mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-sm shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Registering Workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Studio Workspace</span>
                  <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-[#9e9d98] pt-6 border-t border-white/10">
            Already have an Atelier account?{" "}
            <Link href="/login" className="text-[#c5a059] hover:underline font-semibold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
