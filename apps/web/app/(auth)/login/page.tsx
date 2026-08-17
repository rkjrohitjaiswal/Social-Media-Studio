"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@ai-social/shared";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("director@maisonlumiere.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setAuthError(null);

    // Validate input with Zod
    const validation = loginSchema.safeParse({ email, password, rememberSession });
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === "Failed to fetch" || error.message?.includes("Failed to fetch")) {
          setAuthError(
            "Unable to connect to Supabase Auth server. Please verify NEXT_PUBLIC_SUPABASE_URL in your environment."
          );
        } else {
          setAuthError(error.message || "Invalid authentication credentials.");
        }
        setIsLoading(false);
        return;
      }

      // Successful login -> Redirect to /dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Failed to fetch")) {
        setAuthError(
          "Unable to connect to Supabase Auth server. Please verify NEXT_PUBLIC_SUPABASE_URL in your environment."
        );
      } else {
        setAuthError("An unexpected authentication error occurred. Please try again.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#f5f4f0] grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
      {/* LEFT EDITORIAL HERO SIDEBAR (SPLIT-SCREEN) */}
      <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-12 bg-[#14161a] border-r border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0e] via-transparent to-black/60 z-10" />
        <Image
          src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop"
          alt="Luxury Art Direction"
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
            Atelier Portal Access
          </div>
          <h2 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0] leading-tight">
            Elevate Your Brand Aesthetics Through Controlled AI Art Direction.
          </h2>
          <p className="text-xs text-[#9e9d98] leading-relaxed">
            One single anchor reference image clones style, lighting, and mood across all catalog assets seamlessly.
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
            <h1 className="font-serif-luxury text-3xl md:text-4xl font-bold text-[#f5f4f0]">
              Welcome to AI Social Media Studio
            </h1>
            <p className="text-xs text-[#9e9d98]">Enter your accredited email and password to access the studio.</p>
          </div>

          {/* AUTH ERROR ALERT */}
          {authError && (
            <div className="p-4 rounded-2xl bg-[#a84b4b]/20 border border-[#a84b4b]/50 text-xs text-[#f5f4f0] flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[#a84b4b] flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleLogin} className="space-y-5">
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
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-medium text-[#9e9d98]">Password</label>
                <Link href="/forgot-password" className="text-[#c5a059] hover:underline text-[11px]">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9e9d98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-[#14161a] border rounded-xl pl-10 pr-10 py-3 text-xs text-[#f5f4f0] focus:border-[#c5a059] focus:outline-none transition-colors ${
                    validationErrors.password ? "border-[#a84b4b]" : "border-white/10"
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9e9d98] hover:text-[#f5f4f0] focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-[11px] text-[#a84b4b] mt-1">{validationErrors.password}</p>
              )}
            </div>

            {/* REMEMBER SESSION CHECKBOX */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="rememberSession"
                checked={rememberSession}
                onChange={(e) => setRememberSession(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-[#14161a] accent-[#c5a059] cursor-pointer"
              />
              <label htmlFor="rememberSession" className="text-xs text-[#9e9d98] cursor-pointer">
                Remember session for 30 days
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8a6e34] text-black font-bold text-sm shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Studio</span>
                  <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-[#9e9d98] pt-6 border-t border-white/10">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#c5a059] hover:underline font-semibold">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
