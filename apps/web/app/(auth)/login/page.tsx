"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
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
            "Unable to connect to the authentication server. Please check your network connection."
          );
        } else if (error.message === "Invalid login credentials") {
          setAuthError("Invalid email or password.");
        } else {
          setAuthError(error.message || "Invalid authentication credentials.");
        }
        setIsLoading(false);
        return;
      }

      // Successful login -> Refresh RSC auth state then navigate to /dashboard
      router.refresh();
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Failed to fetch")) {
        setAuthError(
          "Unable to connect to the authentication server. Please check your network connection."
        );
      } else {
        setAuthError("Invalid email or password.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#F5F4F0] relative flex flex-col justify-between p-4 sm:p-6 md:p-10 selection:bg-[#D4AF37]/30 overflow-x-hidden">
      {/* Subtle Ambient Gold Lighting Behind Login Area */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[320px] bg-[#D4AF37]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP BAR: BRAND HEADER & BACK TO HOME */}
      <header className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/logo.jpg"
            alt="AI Social Media Studio"
            className="h-10 w-auto object-contain rounded-xl border border-white/[0.08] shadow-md shadow-[#D4AF37]/15 group-hover:scale-105 transition-all"
          />
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#9E9D98] hover:text-[#F5F4F0] transition-colors py-2 px-3 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to home</span>
        </Link>
      </header>

      {/* MAIN CENTERED LOGIN CARD */}
      <main className="relative z-10 w-full max-w-[440px] mx-auto my-auto py-8">
        <div className="bg-[#151618] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          {/* CARD HEADER */}
          <div className="space-y-1.5 text-left">
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F4F0]">
              Welcome back
            </h1>
            <p className="text-xs text-[#9E9D98]">
              Sign in to access your workspace.
            </p>
          </div>

          {/* AUTH ERROR ALERT */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            {/* EMAIL INPUT */}
            <div>
              <label className="block text-xs font-medium text-[#9E9D98] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9E9D98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-[#0B0C0E] border rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F4F0] placeholder-[#9E9D98]/50 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none transition-all ${
                    validationErrors.email ? "border-red-500/60" : "border-white/[0.08]"
                  }`}
                  disabled={isLoading}
                />
              </div>
              {validationErrors.email && (
                <p className="text-[11px] text-red-400 mt-1">{validationErrors.email}</p>
              )}
            </div>

            {/* PASSWORD INPUT */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-medium text-[#9E9D98]">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[#D4AF37] hover:underline text-[11px] font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9E9D98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-[#0B0C0E] border rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#F5F4F0] placeholder-[#9E9D98]/50 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none transition-all ${
                    validationErrors.password ? "border-red-500/60" : "border-white/[0.08]"
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9E9D98] hover:text-[#F5F4F0] focus:outline-none transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-[11px] text-red-400 mt-1">{validationErrors.password}</p>
              )}
            </div>

            {/* REMEMBER ME CHECKBOX */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="checkbox"
                id="rememberSession"
                checked={rememberSession}
                onChange={(e) => setRememberSession(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-[#0B0C0E] accent-[#D4AF37] cursor-pointer"
              />
              <label htmlFor="rememberSession" className="text-xs text-[#9E9D98] cursor-pointer select-none">
                Remember me
              </label>
            </div>

            {/* PRIMARY SUBMIT CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0B0C0E] font-semibold text-sm shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0B0C0E]" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* SIGN UP LINK */}
          <div className="text-center text-xs text-[#9E9D98] pt-4 border-t border-white/[0.08]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#D4AF37] hover:underline font-medium ml-1">
              Create an account
            </Link>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto text-center text-[11px] font-mono text-[#9E9D98]/60 py-2">
        © 2026 AI Social Media Studio. All rights reserved.
      </footer>
    </div>
  );
}

