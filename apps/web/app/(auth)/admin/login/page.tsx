"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Lock, Mail, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { adminLogin } from "@/lib/api-client";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both admin email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await adminLogin(email, password);
    setIsLoading(false);

    if (result.success) {
      setSuccessMessage("Authentication successful. Redirecting to Admin Dashboard...");
      setTimeout(() => {
        router.push("/admin");
      }, 500);
    } else {
      setErrorMessage(result.error || "Invalid admin email or password.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#F5F4F0] font-sans flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#D4AF37]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Header Navigation */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-[#9E9D98] hover:text-[#D4AF37] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to User Login</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header Icon */}
        <div className="flex justify-center mb-3">
          <div className="p-3.5 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]">
            <Shield className="w-8 h-8" />
          </div>
        </div>

        <h2 className="text-center text-2xl font-bold tracking-tight text-[#F5F4F0]">
          Admin Portal Authentication
        </h2>
        <p className="mt-1 text-center text-xs text-[#9E9D98]">
          AI Social Media Studio — System Administrator Access
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-[#151618] border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl backdrop-blur-xl relative z-10">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Admin Email */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono uppercase font-bold text-[#9E9D98] tracking-wider">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9E9D98] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@studio.ai"
                  className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#F5F4F0] placeholder-[#9E9D98]/50 focus:border-[#D4AF37] outline-none transition-colors"
                />
              </div>
            </div>

            {/* Admin Password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono uppercase font-bold text-[#9E9D98] tracking-wider">
                Admin Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9E9D98] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#0B0C0E] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#F5F4F0] placeholder-[#9E9D98]/50 focus:border-[#D4AF37] outline-none transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#D4AF37] text-[#0B0C0E] font-mono font-bold text-xs hover:bg-[#c5a059] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-[#D4AF37]/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating Credentials...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Authenticate Admin Session</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Footer Notice */}
        <p className="mt-6 text-center text-[11px] font-mono text-[#9E9D98]">
          Server-side password hashing &amp; authorization enforced.
        </p>
      </div>
    </div>
  );
}
